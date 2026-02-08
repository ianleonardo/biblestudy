/**
 * Bible Study Chat — front-end logic
 * Markdown rendering for assistant; chat history sidebar (latest first).
 */

(function () {
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const messagesContainer = document.getElementById("chat-messages");
  const welcome = document.getElementById("chat-welcome");
  const submitBtn = document.getElementById("chat-submit");
  const historyList = document.getElementById("chat-history-list");
  const historyEmpty = document.getElementById("chat-history-empty");
  const sidebar = document.querySelector(".sidebar");

  if (!form || !input || !messagesContainer) return;

  let turnCounter = 0;

  function hideWelcome() {
    if (welcome) welcome.hidden = true;
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderMarkdown(raw) {
    if (typeof marked === "undefined") return escapeHtml(raw);
    const html = marked.parse(raw || "", { async: false });
    if (typeof DOMPurify !== "undefined") {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ["p", "br", "strong", "em", "b", "i", "u", "code", "pre", "ul", "ol", "li", "a", "h1", "h2", "h3", "blockquote"],
        ALLOWED_ATTR: ["href", "target", "rel"],
      });
    }
    return html;
  }

  function parseSections(body) {
    if (!body || typeof body !== "string") return { intro: "", sections: [] };
    var parts = body.trim().split(/(?=^##\s+)/m);
    var intro = "";
    var sections = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (!part) continue;
      if (part.indexOf("## ") === 0) {
        var firstNewline = part.indexOf("\n");
        var title = firstNewline === -1 ? part.replace(/^##\s+/, "").trim() : part.slice(0, firstNewline).replace(/^##\s+/, "").trim();
        var content = firstNewline === -1 ? "" : part.slice(firstNewline + 1).trim();
        if (title) sections.push({ title: title, content: content });
      } else {
        intro = part;
      }
    }
    return { intro: intro, sections: sections };
  }

  function renderAccordion(container, intro, sections) {
    if (sections.length === 0) return;
    var wrap = document.createElement("div");
    wrap.className = "msg__body-inner";
    if (intro) {
      var introEl = document.createElement("div");
      introEl.className = "msg__intro msg__body--md";
      introEl.innerHTML = renderMarkdown(intro);
      wrap.appendChild(introEl);
    }
    var accordion = document.createElement("div");
    accordion.className = "accordion";
    sections.forEach(function (s, i) {
      var item = document.createElement("div");
      item.className = "accordion__item" + (i === 0 ? " is-open" : "");
      var head = document.createElement("button");
      head.type = "button";
      head.className = "accordion__head";
      head.setAttribute("aria-expanded", i === 0 ? "true" : "false");
      head.setAttribute("aria-controls", "acc-body-" + i);
      head.id = "acc-head-" + i;
      head.textContent = s.title;
      var body = document.createElement("div");
      body.id = "acc-body-" + i;
      body.className = "accordion__body";
      body.setAttribute("role", "region");
      body.setAttribute("aria-labelledby", "acc-head-" + i);
      body.innerHTML = s.content ? renderMarkdown(s.content) : "";
      if (i !== 0) body.hidden = true;
      head.addEventListener("click", function () {
        var open = item.classList.toggle("is-open");
        head.setAttribute("aria-expanded", open ? "true" : "false");
        body.hidden = !open;
      });
      item.appendChild(head);
      item.appendChild(body);
      accordion.appendChild(item);
    });
    wrap.appendChild(accordion);
    container.appendChild(wrap);
  }

  function setBodyContent(bodyEl, text, isAssistant) {
    if (!isAssistant) {
      bodyEl.classList.remove("msg__body--md");
      bodyEl.textContent = text;
      return;
    }
    bodyEl.classList.add("msg__body--md");
    var parsed = parseSections(text);
    if (parsed.sections.length > 0) {
      bodyEl.textContent = "";
      renderAccordion(bodyEl, parsed.intro, parsed.sections);
    } else {
      bodyEl.innerHTML = renderMarkdown(text || "");
    }
  }

  function addMessage(role, body, options) {
    options = options || {};
    hideWelcome();
    const msg = document.createElement("div");
    msg.className = "msg msg--" + role + (options.loading ? " msg--loading" : "") + (options.error ? " msg--error" : "");
    msg.setAttribute("data-message-id", options.messageId || "");
    const isAssistant = role === "assistant";
    const bodyEl = document.createElement("div");
    bodyEl.className = "msg__body";
    setBodyContent(bodyEl, body, isAssistant);
    msg.innerHTML = '<span class="msg__role">' + (role === "user" ? "You" : "Assistant") + "</span>";
    msg.appendChild(bodyEl);
    return msg;
  }

  function addToSidebar(turnId, preview) {
    if (!historyList || !sidebar) return;
    const li = document.createElement("li");
    li.className = "sidebar__item";
    const a = document.createElement("a");
    a.className = "sidebar__link";
    a.href = "#turn-" + turnId;
    a.textContent = preview.length > 60 ? preview.slice(0, 60) + "…" : preview;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      const el = document.getElementById("turn-" + turnId);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    li.appendChild(a);
    historyList.insertBefore(li, historyList.firstChild);
    sidebar.setAttribute("data-empty", "false");
    if (historyEmpty) historyEmpty.hidden = true;
  }

  var FOLLOWUP_MARKER = "Suggested follow-up questions";

  function parseFollowUps(reply) {
    if (!reply || typeof reply !== "string") return { body: reply, followUps: [] };
    var followUps = [];
    var dashIdx = reply.indexOf("\n---\n");
    var markerIdx = reply.indexOf(FOLLOWUP_MARKER);
    var bodyEnd = reply.length;
    if (dashIdx !== -1) bodyEnd = Math.min(bodyEnd, dashIdx);
    if (markerIdx !== -1) bodyEnd = Math.min(bodyEnd, markerIdx);
    var body = reply.slice(0, bodyEnd).replace(/\n\s*$/, "").trim();
    if (markerIdx === -1) return { body: body, followUps: [] };
    var block = reply.slice(markerIdx);
    var lines = block.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (i === 0 && line.indexOf(FOLLOWUP_MARKER) !== -1) continue;
      var m = line.match(/^\s*[-•]\s+(.+)$/) || line.match(/^\s*\d+\.\s+(.+)$/);
      if (m) followUps.push(m[1].trim());
      else if (followUps.length > 0 && line.trim() === "") break;
    }
    return { body: body, followUps: followUps };
  }

  function renderFollowUpButtons(container, followUps, onChoose) {
    if (!followUps || followUps.length === 0) return;
    var wrap = document.createElement("div");
    wrap.className = "msg__followups";
    followUps.forEach(function (q) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "followup-btn";
      btn.textContent = q;
      btn.addEventListener("click", function () {
        if (typeof onChoose === "function") onChoose(q);
      });
      wrap.appendChild(btn);
    });
    container.appendChild(wrap);
  }

  function updateMessageBody(msgEl, body, removeLoading) {
    var bodyEl = msgEl && msgEl.querySelector(".msg__body");
    if (!bodyEl) return;
    var isAssistant = msgEl.classList.contains("msg--assistant");
    var parsed = isAssistant ? parseFollowUps(body) : { body: body, followUps: [] };
    setBodyContent(bodyEl, parsed.body, isAssistant);
    if (removeLoading) msgEl.classList.remove("msg--loading");
    var existingFollowups = msgEl.querySelector(".msg__followups");
    if (existingFollowups) existingFollowups.remove();
    if (isAssistant && parsed.followUps.length > 0) {
      renderFollowUpButtons(msgEl, parsed.followUps, function (question) {
        input.value = question;
        form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    }
  }

  function setSubmitting(submitting) {
    submitBtn.disabled = submitting;
    input.disabled = submitting;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const raw = (input.value || "").trim();
    if (!raw) return;

    input.value = "";
    const messageId = "msg-" + Date.now();
    const turnId = turnCounter++;

    const turn = document.createElement("div");
    turn.className = "chat__turn";
    turn.id = "turn-" + turnId;

    const userMsg = addMessage("user", raw, { messageId });
    turn.appendChild(userMsg);

    const assistantMsg = addMessage("assistant", "…", { loading: true });
    turn.appendChild(assistantMsg);

    messagesContainer.insertBefore(turn, messagesContainer.firstChild);
    addToSidebar(turnId, raw);
    messagesContainer.scrollTop = 0;

    setSubmitting(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: raw, message_id: messageId }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        updateMessageBody(assistantMsg, data.error || "Something went wrong. Please try again.", true);
        assistantMsg.classList.add("msg--error");
        return;
      }

      updateMessageBody(assistantMsg, data.reply || "No reply received.", true);
    } catch (err) {
      updateMessageBody(assistantMsg, "Network error. Please check your connection and try again.", true);
      assistantMsg.classList.add("msg--error");
    } finally {
      setSubmitting(false);
      messagesContainer.scrollTop = 0;
    }
  });

  var sidebarEl = document.getElementById("sidebar");
  var sidebarToggle = document.getElementById("sidebar-toggle");
  if (sidebarEl && sidebarToggle) {
    function setCollapsed(collapsed) {
      if (collapsed) sidebarEl.classList.add("sidebar--collapsed");
      else sidebarEl.classList.remove("sidebar--collapsed");
      sidebarToggle.setAttribute("aria-label", collapsed ? "Show chat history" : "Hide chat history");
      sidebarToggle.setAttribute("title", collapsed ? "Show chat history" : "Hide chat history");
    }
    if (window.innerWidth <= 768) setCollapsed(true);
    sidebarToggle.addEventListener("click", function () {
      setCollapsed(!sidebarEl.classList.contains("sidebar--collapsed"));
    });
  }
})();
