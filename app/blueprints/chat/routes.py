"""
Chat routes: page and API for Bible study AI.
Uses Google Gemini when GEMINI_API_KEY is set.
Reformed doctrine; ESV only; suggested follow-ups as parseable block.
"""
from flask import current_app, jsonify, render_template, request

from app.blueprints.chat import bp

# System instruction: Reformed doctrine, ESV only; structure with ## sections; follow-ups block
BIBLE_STUDY_SYSTEM = (
    "You are a Bible study assistant committed to Reformed theology (the doctrines of grace, "
    "covenant theology, sola Scriptura, the sovereignty of God in salvation, and the "
    "authority and clarity of Scripture). You must quote Scripture only from the ESV. "
    "Do not use or cite other translations. "
    "Structure every answer using markdown level-2 headers (##) for sub-sections so the reply "
    "can be shown in collapsible sections. Use exactly these section headers where relevant:\n"
    "- ## Overview — brief summary (2–3 sentences).\n"
    "- ## Historical & cultural background — setting, audience, customs, and history that shed light on the passage.\n"
    "- ## Grammar & wording — key words, syntax, or Hebrew/Greek insights (in plain terms) from the ESV text.\n"
    "- ## Meaning in context — what the passage teaches in its literary and canonical context (Reformed lens).\n"
    "- ## Practical application — 2–4 concrete, contemporary applications for faith and life today.\n"
    "You may omit a section only if it does not apply; include at least Overview, one background or grammar section, "
    "and Practical application. Keep each section concise so the full answer is manageable. "
    "At the end of every reply, after your main answer, add exactly this block on a new line: "
    "a line with only '---' (three hyphens), then a line 'Suggested follow-up questions:', "
    "then 2 or 3 short follow-up questions, one per line, each line starting with '- ' (hyphen space). "
    "Example:\n---\nSuggested follow-up questions:\n- What does this passage teach about election?\n"
    "- How does the immediate context clarify this verse?"
)


@bp.route("/")
def index():
    """Serve the main chat page."""
    return render_template("chat/index.html")


@bp.route("/api/chat", methods=["POST"])
def chat():
    """Accept a user message and return an AI reply (Gemini when configured)."""
    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"error": "Message is required"}), 400

    reply = _get_ai_reply(message)

    return jsonify({
        "reply": reply,
        "message_id": data.get("message_id"),
    })


def _get_ai_reply(message: str) -> str:
    """Generate a reply using Gemini when GEMINI_API_KEY is set."""
    api_key = current_app.config.get("GEMINI_API_KEY")
    if not api_key:
        return (
            "Bible study AI is not configured. Set GEMINI_API_KEY in your .env file. "
            "Get a free API key at https://aistudio.google.com/app/apikey"
        )

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return (
            "Gemini SDK is not installed. Run: pip install google-genai"
        )

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=message,
            config=types.GenerateContentConfig(
                system_instruction=BIBLE_STUDY_SYSTEM,
            ),
        )
        if response and response.text:
            return response.text.strip()
        return "The model did not return a reply. Please try rephrasing your question."
    except Exception as e:
        current_app.logger.warning("Gemini API error: %s", e)
        return (
            f"Sorry, the AI service returned an error. Please try again. "
            f"(Details: {e!s})"
        )
