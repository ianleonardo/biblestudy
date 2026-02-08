"""
Quiz routes: quiz page and API to generate multiple-choice questions.
"""
import json
import re

from flask import current_app, jsonify, render_template, request

from app.blueprints.quiz import bp


QUIZ_SYSTEM = (
    "You are a Bible quiz generator. All content must be based on Reformed theology "
    "(doctrines of grace, covenant theology, sola Scriptura, sovereignty of God in salvation) "
    "and Scripture must be quoted or referenced only from the ESV (English Standard Version). "
    "Do not use or cite other translations. Generate multiple-choice questions for Bible study. "
    "Each question must have exactly 4 options labeled A, B, C, D. One option is correct. "
    "Return ONLY a valid JSON array of objects. Each object has: \"question\" (string), "
    "\"options\" (array of 4 strings: \"A) ...\", \"B) ...\", \"C) ...\", \"D) ...\"), "
    "and \"correct\" (string: \"A\", \"B\", \"C\", or \"D\"). No other text or markdown."
)


@bp.route("/")
def index():
    """Serve the quiz page (level choice, take quiz, results)."""
    return render_template("quiz/index.html")


@bp.route("/generate", methods=["POST"])
def generate():
    """Generate up to 10 multiple-choice questions. Body: { level, topic? }."""
    data = request.get_json(silent=True) or {}
    level = (data.get("level") or "medium").strip().lower()
    if level not in ("easy", "medium", "hard"):
        level = "medium"
    topic = (data.get("topic") or "").strip() or None

    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"error": "Quiz requires GEMINI_API_KEY to be set."}), 503

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return jsonify({"error": "Gemini SDK not installed. Run: pip install google-genai"}), 503

    level_desc = {
        "easy": "Easy: basic facts, well-known verses, simple recall.",
        "medium": "Medium: interpretation, context, and doctrine.",
        "hard": "Hard: detailed exegesis, cross-references, and Reformed distinctives.",
    }
    topic_part = f" Focus on: {topic}." if topic else " Cover a range of Bible knowledge (OT and NT, Reformed perspective)."
    json_example = '{"question": "...", "options": ["A) ...", "B) ...", "C) ...", "D) ..."], "correct": "A"}'
    prompt = (
        f"Generate exactly 10 multiple-choice Bible study questions. "
        f"Difficulty: {level_desc.get(level, level_desc['medium'])}.{topic_part} "
        f"Return ONLY a JSON array. Each item: {json_example}. "
        "No other text."
    )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                system_instruction=QUIZ_SYSTEM,
            ),
        )
        text = (response and response.text or "").strip()
        # Strip markdown code block if present
        if text.startswith("```"):
            text = re.sub(r"^```\w*\n?", "", text)
            text = re.sub(r"\n?```\s*$", "", text)
        questions = json.loads(text)
        if not isinstance(questions, list):
            questions = []
        # Normalize and validate
        out = []
        for i, q in enumerate(questions[:10]):
            if not isinstance(q, dict):
                continue
            question = q.get("question") or ""
            options = q.get("options") or []
            correct = (q.get("correct") or "A").strip().upper()
            if correct not in ("A", "B", "C", "D"):
                correct = "A"
            if len(options) < 4:
                continue
            out.append({
                "id": i + 1,
                "question": question,
                "options": [str(o)[:200] for o in options[:4]],
                "correct": correct,
            })
        return jsonify({"questions": out})
    except json.JSONDecodeError as e:
        current_app.logger.warning("Quiz JSON parse error: %s", e)
        return jsonify({"error": "Could not parse quiz questions. Please try again."}), 502
    except Exception as e:
        current_app.logger.warning("Quiz generate error: %s", e)
        return jsonify({"error": str(e)}), 502
