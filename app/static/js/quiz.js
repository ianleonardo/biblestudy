/**
 * Bible Study Quiz — one question at a time, arrows, animation.
 */

(function () {
  var step1 = document.getElementById("quiz-step-1");
  var step2 = document.getElementById("quiz-step-2");
  var step3 = document.getElementById("quiz-step-3");
  var setupForm = document.getElementById("quiz-setup-form");
  var levelSelect = document.getElementById("quiz-level");
  var topicInput = document.getElementById("quiz-topic");
  var loadingEl = document.getElementById("quiz-loading");
  var questionsForm = document.getElementById("quiz-questions-form");
  var quizProgress = document.getElementById("quiz-progress");
  var quizSlide = document.getElementById("quiz-slide");
  var prevBtn = document.getElementById("quiz-prev");
  var nextBtn = document.getElementById("quiz-next");
  var submitBtn = document.getElementById("quiz-submit-btn");
  var scoreEl = document.getElementById("quiz-score");
  var scoreDetailEl = document.getElementById("quiz-score-detail");
  var reviewEl = document.getElementById("quiz-review");

  if (!step1 || !step2 || !step3 || !setupForm || !questionsForm || !quizSlide) return;

  var questions = [];
  var userAnswers = {};
  var currentIndex = 0;
  var questionNodes = [];

  function showStep(stepNum) {
    step1.hidden = stepNum !== 1;
    step2.hidden = stepNum !== 2;
    step3.hidden = stepNum !== 3;
  }

  function getOptionKey(optionText) {
    var m = (optionText || "").match(/^([A-D])\)/);
    return m ? m[1].toUpperCase() : "";
  }

  function buildQuestionNode(q, idx) {
    var wrap = document.createElement("div");
    wrap.className = "quiz__item quiz__item--current";
    wrap.setAttribute("data-question-index", idx);
    var fieldset = document.createElement("fieldset");
    fieldset.className = "quiz__fieldset";
    var legend = document.createElement("legend");
    legend.className = "quiz__question-text";
    legend.textContent = q.question;
    fieldset.appendChild(legend);
    var name = "q" + q.id;
    (q.options || []).forEach(function (opt) {
      var key = getOptionKey(opt);
      var label = document.createElement("label");
      label.className = "quiz__option";
      var radio = document.createElement("input");
      radio.type = "radio";
      radio.name = name;
      radio.value = key;
      radio.className = "quiz__radio";
      if (userAnswers[q.id] === key) radio.checked = true;
      radio.addEventListener("change", function () { userAnswers[q.id] = key; });
      label.appendChild(radio);
      label.appendChild(document.createTextNode(" " + (opt || "").replace(/^[A-D]\)\s*/, "")));
      fieldset.appendChild(label);
    });
    wrap.appendChild(fieldset);
    return wrap;
  }

  function showQuestion(index) {
    currentIndex = index;
    questionNodes.forEach(function (node, i) {
      var isCurrent = i === index;
      node.hidden = !isCurrent;
      node.classList.toggle("quiz__item--current", isCurrent);
      if (isCurrent) {
        node.classList.remove("quiz__item--current");
        node.offsetHeight;
        node.classList.add("quiz__item--current");
      }
    });
    if (quizProgress) {
      quizProgress.textContent = "Question " + (index + 1) + " of " + questions.length;
    }
    if (prevBtn) prevBtn.hidden = index <= 0;
    if (nextBtn) {
      nextBtn.hidden = false;
      nextBtn.disabled = index >= questions.length - 1;
    }
    if (submitBtn) submitBtn.hidden = index < questions.length - 1;
  }

  setupForm.addEventListener("submit", function (e) {
    e.preventDefault();
    showStep(2);
    loadingEl.hidden = false;
    questionsForm.hidden = true;
    quizSlide.innerHTML = "";
    questionNodes = [];
    userAnswers = {};
    currentIndex = 0;

    var level = (levelSelect && levelSelect.value) || "medium";
    var topic = (topicInput && topicInput.value) || "";

    fetch("/quiz/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level: level, topic: topic || null }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || "Failed to load quiz");
          return data;
        });
      })
      .then(function (data) {
        questions = data.questions || [];
        loadingEl.hidden = true;
        if (questions.length === 0) {
          reviewEl.textContent = "No questions were generated. Please try again.";
          showStep(3);
          return;
        }
        questionsForm.hidden = false;
        questions.forEach(function (q, idx) {
          var node = buildQuestionNode(q, idx);
          node.hidden = idx !== 0;
          quizSlide.appendChild(node);
          questionNodes.push(node);
        });
        showQuestion(0);
      })
      .catch(function (err) {
        loadingEl.hidden = true;
        loadingEl.textContent = "Error: " + (err.message || "Could not load quiz.");
        setTimeout(function () {
          showStep(1);
          loadingEl.textContent = "Generating questions…";
        }, 3000);
      });
  });

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (currentIndex > 0) showQuestion(currentIndex - 1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (currentIndex < questions.length - 1) showQuestion(currentIndex + 1);
    });
  }

  questionsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var formData = new FormData(questionsForm);
    questions.forEach(function (q) {
      var val = formData.get("q" + q.id);
      if (val != null) userAnswers[q.id] = (val || "").toUpperCase();
    });

    var correct = 0;
    questions.forEach(function (q) {
      if (userAnswers[q.id] === (q.correct || "A")) correct++;
    });

    var total = questions.length;
    var pct = total ? Math.round((100 * correct) / total) : 0;
    scoreEl.textContent = "Score: " + correct + " / " + total;
    scoreEl.className = "quiz__score quiz__score--" + (pct >= 70 ? "good" : pct >= 50 ? "ok" : "low");
    scoreDetailEl.textContent = pct + "% correct.";
    scoreDetailEl.hidden = false;

    reviewEl.innerHTML = "";
    questions.forEach(function (q) {
      var userKey = userAnswers[q.id] || "—";
      var correctKey = (q.correct || "A");
      var isRight = userKey === correctKey;
      var div = document.createElement("div");
      div.className = "quiz__review-item " + (isRight ? "quiz__review-item--correct" : "quiz__review-item--wrong");
      var optText = function (key) {
        if (!key) return "No answer";
        var o = (q.options || []).find(function (x) { return getOptionKey(x) === key; });
        return o ? o.replace(/^[A-D]\)\s*/, "").trim() : key;
      };
      div.innerHTML =
        "<p class=\"quiz__review-q\">" + escapeHtml(q.question) + "</p>" +
        "<p class=\"quiz__review-your\">Your answer: " + escapeHtml(optText(userKey || "")) + (isRight ? "" : " <span class=\"quiz__review-wrong\">(wrong)</span>") + "</p>" +
        (isRight ? "" : "<p class=\"quiz__review-correct\">Correct: " + escapeHtml(optText(correctKey)) + "</p>");
      reviewEl.appendChild(div);
    });

    showStep(3);
  });

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
})();
