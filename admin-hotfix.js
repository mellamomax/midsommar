(function () {
  const STORAGE_KEY = "midsommar-dashboard-v6";
  const QUIZ_KEY = "midsommar-quiz-v1";
  const ADMIN_PROFILE = "Admin";
  const EVENT_START = new Date("2026-06-19T08:00:00+02:00");
  const SUPABASE_URL = "https://wugavohwdfuhahbwxcea.supabase.co";
  const SUPABASE_KEY = "sb_publishable_DWh8fecFXYWycKx1mLwCbQ_GYKfLqz5";
  const REMOTE_STATE_ID = "main";
  const taps = {};
  let prepLockReloading = false;

  const defaultQuiz = [
    ["Vilket datum infaller midsommarafton alltid pa?", "Fredagen mellan 19 och 25 juni", "Alltid 21 juni", "Sista fredagen i juni", 0],
    ["Vad kallas stangen man dansar kring?", "Majstang", "Solstang", "Sommarstang", 0],
    ["Vilken blomma ar starkt kopplad till midsommar?", "Julros", "Prastkrage", "Pasklilja", 1],
    ["Vad sags man kunna dromma om om man plockar sju sorters blommor?", "Sin framtida karlek", "Nasta semester", "Vinnaren i 5-kampen", 0],
    ["Vilken mat ar vanlig pa ett klassiskt midsommarbord?", "Surstromming och tunnbrod", "Sill och farskpotatis", "Kalkon och brysselkal", 1],
    ["Vilken visa sjungs ofta runt midsommarstangen?", "Sma grodorna", "Staffan stalledrang", "Nu tandas tusen juleljus", 0],
    ["Vad betyder maj i majstang?", "Manaden maj", "Att smycka med lov", "En gammal dryck", 1],
    ["Vilken dryck brukar ofta serveras till snapsvisor?", "Snaps", "Varm choklad", "Must", 0],
    ["Vilken arstid firas midsommar?", "Var", "Sommar", "Host", 1],
    ["Vad symboliserar midsommar historiskt mest?", "Arets morkaste natt", "Sommarsolstand och ljus", "Skordefestens slut", 1],
  ].map(([question, a, b, c, answer]) => ({ question, options: [a, b, c], answer }));

  const style = document.createElement("style");
  style.textContent = `
    .quiz-card h3{margin-bottom:12px}
    .quiz-options{display:grid;gap:8px}
    .quiz-options button{display:grid;grid-template-columns:34px 1fr;align-items:center;gap:10px;width:100%;border:1px solid rgba(28,91,61,.18);border-radius:14px;background:rgba(255,255,255,.78);color:#17251d;padding:10px;text-align:left;font:inherit;font-weight:800}
    .quiz-options button b{display:grid;place-items:center;width:34px;height:34px;border-radius:999px;background:#e9f2dc;color:#185c40}
    .quiz-options button.is-selected{border-color:#185c40;box-shadow:inset 0 0 0 2px rgba(24,92,64,.18)}
    .quiz-options button.is-correct b{background:#185c40;color:#fff}
  `;
  document.head.appendChild(style);

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function writeState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function isBeforeMidsommar() {
    return Date.now() < EVENT_START.getTime();
  }

  function isAdminState(state = readState()) {
    return state.adminMode === true && (state.profile === ADMIN_PROFILE || state.adminOwner === ADMIN_PROFILE || state.adminOwner === "Max");
  }

  function hasPrepBypass() {
    try {
      return sessionStorage.getItem("midsommar-prep-bypass") === "1";
    } catch {
      return false;
    }
  }

  function setPrepBypass() {
    try {
      sessionStorage.setItem("midsommar-prep-bypass", "1");
    } catch {
      // Session storage can be unavailable in strict browser modes; the state write below still lets the current render move on.
    }
  }

  function hasAdminPrepView() {
    try {
      return sessionStorage.getItem("midsommar-admin-prep-view") === "1";
    } catch {
      return false;
    }
  }

  function setAdminPrepView() {
    try {
      sessionStorage.setItem("midsommar-admin-prep-view", "1");
    } catch {}
  }

  function clearAdminPrepView() {
    try {
      sessionStorage.removeItem("midsommar-admin-prep-view");
    } catch {}
  }

  function headers(extra) {
    return { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, ...(extra || {}) };
  }

  async function saveRemote(state) {
    const sharedKeys = ["profiles", "nameOverrides", "rsvp", "pack", "teamScores", "pentathlon", "voteCorrections", "voteCorrected", "voteAwarded", "matchVotes", "matchResult", "matchAwarded", "schedule", "content", "settings", "galleryArchive"];
    const data = Object.fromEntries(sharedKeys.map((key) => [key, state[key]]));
    await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
      method: "POST",
      headers: headers({ "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=minimal" }),
      body: JSON.stringify({ id: REMOTE_STATE_ID, data, updated_at: new Date().toISOString() }),
    });
  }

  function tapCount(key, limit, ms = 520) {
    const now = Date.now();
    const tap = taps[key] || { count: 0, last: 0, timer: null };
    tap.count = now - tap.last < ms ? tap.count + 1 : 1;
    tap.last = now;
    clearTimeout(tap.timer);
    tap.timer = setTimeout(() => {
      tap.count = 0;
    }, ms + 120);
    taps[key] = tap;
    if (tap.count < limit) return false;
    tap.count = 0;
    return true;
  }

  function enforcePrepLock(reload = false) {
    const state = readState();
    if (!isBeforeMidsommar() || isAdminState(state) || hasPrepBypass()) return;
    if (state.page !== "prep") {
      state.page = "prep";
      state.section = "today";
      delete state.prepBypassed;
      writeState(state);
      if (reload && !prepLockReloading) {
        prepLockReloading = true;
        window.location.reload();
      }
    }
  }

  function bypassPrep() {
    const state = readState();
    setPrepBypass();
    clearAdminPrepView();
    if (state.profile === ADMIN_PROFILE || state.adminMode === true) {
      state.profile = ADMIN_PROFILE;
      state.adminMode = true;
      state.adminOwner = ADMIN_PROFILE;
    }
    delete state.prepBypassed;
    state.page = "party";
    state.section = "today";
    writeState(state);
    window.location.reload();
  }

  function enterAdmin() {
    const state = readState();
    if (!state.profile && !state.adminReturnProfile) return;
    if (!isAdminState(state)) state.adminReturnProfile = state.profile;
    state.profile = ADMIN_PROFILE;
    state.adminMode = true;
    state.adminOwner = ADMIN_PROFILE;
    setPrepBypass();
    clearAdminPrepView();
    delete state.prepBypassed;
    state.page = "party";
    state.section = "today";
    writeState(state);
    window.location.reload();
  }

  function adminOpenPrep() {
    const state = readState();
    if (!isAdminState(state)) return;
    setAdminPrepView();
    state.page = "prep";
    state.section = "today";
    writeState(state);
    window.location.reload();
  }

  function releaseAdminFromPrepLock() {
    const state = readState();
    if (!isAdminState(state) || state.page !== "prep" || hasAdminPrepView()) return;
    state.page = "party";
    state.section = "today";
    writeState(state);
    if (document.body.dataset.page === "prep" && !prepLockReloading) {
      prepLockReloading = true;
      window.location.reload();
    }
  }

  function unlockProfileCardForTripleTap() {
    const button = document.querySelector("#profile-button");
    if (!button) return;
    if (button.disabled) button.disabled = false;
    const ariaValue = isAdminState() ? "false" : "true";
    if (button.getAttribute("aria-disabled") !== ariaValue) button.setAttribute("aria-disabled", ariaValue);
  }

  function archiveProfileImages(state, name) {
    const profile = state.profiles?.[name];
    if (!profile) return;
    const items = [];
    (profile.missions || []).forEach((mission) => {
      if (mission.photo) items.push({ name, text: mission.text, photo: mission.photo, type: "Uppdrag", takenAt: mission.completedAt, media: "image" });
    });
    Object.entries(profile.bingoProofs || {}).forEach(([text, proof]) => {
      if (proof?.photo) items.push({ name, text, photo: proof.photo, type: "Bingo", takenAt: proof.completedAt, media: "image" });
    });
    ["before", "after"].forEach((slot) => {
      const item = profile.beforeAfter?.[slot];
      if (item?.video) items.push({ name, text: slot === "before" ? "Fore-video" : "Efter-video", photo: item.video, type: "Fore / efter", takenAt: item.completedAt, media: "video" });
    });
    const seen = new Set();
    state.galleryArchive = [...items, ...(state.galleryArchive || [])].filter((item) => {
      const key = `${item.media || "image"}::${item.photo}::${item.name}::${item.text}`;
      if (!item.photo || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function quizState() {
    try {
      const saved = JSON.parse(localStorage.getItem(QUIZ_KEY) || "{}");
      return { questions: defaultQuiz, answers: {}, awarded: {}, index: 0, ...saved };
    } catch {
      return { questions: defaultQuiz, answers: {}, awarded: {}, index: 0 };
    }
  }

  function saveQuiz(value) {
    localStorage.setItem(QUIZ_KEY, JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  function quizRowsToText(questions) {
    return questions.map((item) => `${item.question} | ${item.options[0]} | ${item.options[1]} | ${item.options[2]} | ${item.answer}`).join("\n");
  }

  function quizTextToRows(text) {
    return String(text || "")
      .split(/\n+/)
      .map((row) => row.split("|").map((part) => part.trim()))
      .filter((parts) => parts[0])
      .map((parts) => ({
        question: parts[0],
        options: [parts[1] || "1", parts[2] || "X", parts[3] || "2"],
        answer: Math.max(0, Math.min(2, Number(parts[4] || 0) || 0)),
      }));
  }

  function renderQuiz() {
    const state = readState();
    const data = quizState();
    const index = Math.max(0, Math.min(data.questions.length - 1, Number(data.index || 0)));
    const item = data.questions[index] || data.questions[0];
    const key = `${state.profile || "guest"}::${index}`;
    const answer = data.answers[key];
    const labels = ["1", "X", "2"];
    const answered = answer !== undefined;
    const correct = Number(answer) === Number(item.answer);
    return `
      <article class="game-card quiz-card" data-hotfix-quiz-card>
        <span class="micro-label">Quiz ${index + 1}/${data.questions.length}</span>
        <h3>${escapeHtml(item.question)}</h3>
        <div class="quiz-options">
          ${item.options.map((option, optionIndex) => `<button class="${Number(answer) === optionIndex ? "is-selected" : ""} ${answered && Number(item.answer) === optionIndex ? "is-correct" : ""}" type="button" data-hotfix-quiz-answer="${optionIndex}"><b>${labels[optionIndex]}</b><span>${escapeHtml(option)}</span></button>`).join("")}
        </div>
        <p class="hint">${answered ? (correct ? "Ratt. +1 poang." : `Fel. Ratt svar: ${labels[item.answer]}.`) : "Valj 1, X eller 2."}</p>
        <button class="pill-button" type="button" data-hotfix-next-quiz>Nasta fraga</button>
      </article>
      ${isAdminState(state) ? `<article class="admin-editor game-content-editor" data-hotfix-quiz-admin>
        <div class="admin-editor-head"><strong>Redigera quiz</strong><small>Fraga | 1 | X | 2 | ratt 0-2</small></div>
        <textarea class="admin-textarea" data-hotfix-quiz-editor>${escapeHtml(quizRowsToText(data.questions))}</textarea>
        <div class="admin-actions"><button class="admin-add-button" type="button" data-hotfix-save-quiz>Spara quiz</button></div>
      </article>` : ""}
    `;
  }

  function showQuiz() {
    const content = document.querySelector("#party-content");
    if (!content || document.body.dataset.page !== "party" || !document.querySelector('[data-section="games"].is-active')) return;
    const picker = content.querySelector(".game-picker");
    if (!picker) return;
    if (!picker.querySelector("[data-hotfix-game-quiz]")) {
      picker.insertAdjacentHTML("beforeend", '<button class="game-menu-button" type="button" data-hotfix-game-quiz><span class="game-menu-icon game-menu-icon--quiz" aria-hidden="true">?</span><strong>Quiz</strong></button>');
    }
    if (localStorage.getItem("midsommar-hotfix-game") !== "quiz" || content.querySelector("[data-hotfix-quiz-card]")) return;
    [...content.children].forEach((child) => {
      if (!child.classList.contains("game-picker")) child.remove();
    });
    picker.querySelectorAll(".game-menu-button").forEach((button) => button.classList.remove("is-active"));
    picker.querySelector("[data-hotfix-game-quiz]")?.classList.add("is-active");
    content.insertAdjacentHTML("beforeend", renderQuiz());
  }

  document.addEventListener("pointerup", (event) => {
    if (event.target.closest("#countdown-ring") && tapCount("countdown", 2)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      bypassPrep();
      return;
    }
    if (event.target.closest("#profile-button") && tapCount("profile", 3)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      enterAdmin();
      return;
    }
    if (event.target.closest('[data-section="today"]') && isAdminState() && tapCount("start", 2)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      adminOpenPrep();
    }
  }, true);

  document.addEventListener("dblclick", (event) => {
    if (event.target.closest("#countdown-ring")) {
      event.preventDefault();
      event.stopImmediatePropagation();
      bypassPrep();
    }
    if (event.target.closest('[data-section="today"]') && isAdminState()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      adminOpenPrep();
    }
  }, true);

  document.addEventListener("click", async (event) => {
    if (event.target.closest('[data-page="party"]') && isBeforeMidsommar() && !isAdminState() && !hasPrepBypass()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      enforcePrepLock(true);
      return;
    }
    if (event.target.closest("#profile-button") && !isAdminState()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    const deleteProfile = event.target.closest("[data-delete-profile]");
    if (deleteProfile) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const name = deleteProfile.dataset.deleteProfile;
      if (!name || !window.confirm(`Radera profilen ${name}? Bilderna sparas i galleriet.`)) return;
      const state = readState();
      archiveProfileImages(state, name);
      delete state.profiles?.[name];
      delete state.rsvp?.[name];
      delete state.matchVotes?.[name];
      writeState(state);
      await saveRemote(state);
      window.location.reload();
      return;
    }

    const deleteTeam = event.target.closest("[data-delete-team]");
    if (deleteTeam) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const index = Number(deleteTeam.dataset.deleteTeam);
      const state = readState();
      if (!Array.isArray(state.teamScores) || state.teamScores.length <= 1) return;
      if (!window.confirm(`Radera laget ${state.teamScores[index]?.team || ""}?`)) return;
      state.teamScores.splice(index, 1);
      (state.pentathlon || []).forEach((item) => item.scores?.splice(index, 1));
      writeState(state);
      await saveRemote(state);
      window.location.reload();
      return;
    }

    if (event.target.closest("[data-hotfix-game-quiz]")) {
      event.preventDefault();
      localStorage.setItem("midsommar-hotfix-game", "quiz");
      document.querySelector("[data-hotfix-quiz-card]")?.remove();
      document.querySelector("[data-hotfix-quiz-admin]")?.remove();
      showQuiz();
      return;
    }

    const quizAnswer = event.target.closest("[data-hotfix-quiz-answer]");
    if (quizAnswer) {
      const state = readState();
      const data = quizState();
      const index = Math.max(0, Math.min(data.questions.length - 1, Number(data.index || 0)));
      const answer = Number(quizAnswer.dataset.hotfixQuizAnswer);
      const key = `${state.profile || "guest"}::${index}`;
      data.answers[key] = answer;
      if (answer === Number(data.questions[index].answer) && !data.awarded[key] && state.profile && state.profile !== ADMIN_PROFILE) {
        state.profiles = state.profiles || {};
        state.profiles[state.profile] = state.profiles[state.profile] || { points: 0 };
        state.profiles[state.profile].points = Number(state.profiles[state.profile].points || 0) + 1;
        data.awarded[key] = true;
        writeState(state);
        await saveRemote(state);
      }
      saveQuiz(data);
      document.querySelector("[data-hotfix-quiz-card]")?.remove();
      document.querySelector("[data-hotfix-quiz-admin]")?.remove();
      showQuiz();
      return;
    }

    if (event.target.closest("[data-hotfix-next-quiz]")) {
      const data = quizState();
      data.index = (Number(data.index || 0) + 1) % data.questions.length;
      saveQuiz(data);
      document.querySelector("[data-hotfix-quiz-card]")?.remove();
      document.querySelector("[data-hotfix-quiz-admin]")?.remove();
      showQuiz();
      return;
    }

    if (event.target.closest("[data-hotfix-save-quiz]")) {
      const rows = quizTextToRows(document.querySelector("[data-hotfix-quiz-editor]")?.value || "");
      if (!rows.length) return;
      saveQuiz({ questions: rows, answers: {}, awarded: {}, index: 0 });
      document.querySelector("[data-hotfix-quiz-card]")?.remove();
      document.querySelector("[data-hotfix-quiz-admin]")?.remove();
      showQuiz();
    }
  }, true);

  document.addEventListener("click", (event) => {
    if (event.target.closest("[data-game]")) localStorage.removeItem("midsommar-hotfix-game");
  });

  function tick() {
    unlockProfileCardForTripleTap();
    releaseAdminFromPrepLock();
    enforcePrepLock(document.body.dataset.page === "party");
    showQuiz();
  }

  tick();
  setInterval(tick, 600);
  new MutationObserver(tick).observe(document.body, { childList: true, subtree: true });
})();
