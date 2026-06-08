const EVENT_START = new Date("2026-06-19T12:00:00+02:00");
const STORAGE_KEY = "midsommar-dashboard-v6";
const WEATHER = { latitude: 59.3333, longitude: 16.4333 };
const SUPABASE_URL = "https://wugavohwdfuhahbwxcea.supabase.co";
const SUPABASE_KEY = "sb_publishable_DWh8fecFXYWycKx1mLwCbQ_GYKfLqz5";
const REMOTE_STATE_ID = "main";
const PROOF_BUCKET = "proofs";
const SHARED_STATE_KEYS = [
  "profiles",
  "nameOverrides",
  "rsvp",
  "pack",
  "teamScores",
  "pentathlon",
  "voteCorrections",
  "voteCorrected",
  "voteAwarded",
  "matchVotes",
];

let remoteReady = false;
let remoteSaveTimer = null;
let applyingRemoteState = false;
let lastRemoteStateJson = "";
let remotePollTimer = null;
let pendingRemoteSave = false;
let galleryIndex = null;
let galleryMotion = "open";
let toastTimer = null;
let profileClickTimer = null;

const guests = ["Max", "Mathilda", "Jesper", "Felipe", "Julia", "Sofia", "Viktor", "Lisa"];

const sectionMeta = {
  today: ["Start", "Dashboard"],
  games: ["Lekar", "Dina tävlingar"],
  score: ["Poäng", "Personlig poängställning"],
  photos: ["Bilder", "Uppdragsbilder"],
  pentathlon: ["5-kamp", "Lagpoäng"],
  match: ["Match", "VM-matchen"],
};

const seed = {
  page: "prep",
  section: "today",
  profile: "",
  adminMode: false,
  game: "wheel",
  profiles: {},
  nameOverrides: {},
  rsvp: Object.fromEntries(guests.map((name, index) => [name, index < 5])),
  pack: [
    { id: "swim", text: "Badkläder", done: false },
    { id: "warm", text: "Varm tröja", done: false },
    { id: "flowers", text: "Blommigt / krans", done: false },
    { id: "drink", text: "Egen dryck", done: false },
    { id: "rain", text: "Regnjacka", done: false },
    { id: "charger", text: "Laddare", done: false },
  ],
  teamScores: [
    { team: "Dill", score: 0 },
    { team: "Jordgubb", score: 0 },
    { team: "Björk", score: 0 },
  ],
  pentathlon: [
    { name: "Kubb-straffar", scores: [0, 0, 0] },
    { name: "Säcklöpning", scores: [0, 0, 0] },
    { name: "Quiz", scores: [0, 0, 0] },
    { name: "Prickkast", scores: [0, 0, 0] },
    { name: "Finalgren", scores: [0, 0, 0] },
  ],
  weather: null,
  matchApiStatus: "API ej hämtat",
  matchApiData: null,
  voteCorrections: {},
  voteCorrected: {},
  voteAwarded: {},
  matchVotes: {},
};

const profileSeed = {
  points: 0,
  bingoHits: [],
  bingoProofs: {},
  bingoRewards: {},
  votes: {},
  voteDeck: [],
  wheelResult: "Snurra för kvällens twist.",
  missions: [],
  activeMission: null,
};

const timeline = [
  ["12:00", "Lunch"],
  ["15:00", "Kransar / bad"],
  ["18:30", "Middag"],
  ["Lör", "VM-match"],
  ["Lör", "5-kamp"],
  ["Kväll", "Poängfinal"],
];

const matchFallback = {
  group: "Group F",
  opponents: ["Tunisia", "Netherlands", "Japan"],
  selected: {
    home: "Netherlands",
    away: "Sweden",
    date: "Lör 20 juni",
    time: "19:00 svensk tid",
    venue: "NRG Stadium, Houston",
  },
};

const matchSchedule = [
  { date: "Grupp F", opponent: "Tunisia", note: "Tid från API" },
  { date: "Lör 20 juni", opponent: "Netherlands", note: "19:00 svensk tid" },
  { date: "Grupp F", opponent: "Japan", note: "Tid från API" },
];

const voteQuestions = [
  "börjar dansa först?",
  "styr grillen?",
  "somnar i solen?",
  "startar allsång?",
  "tar mest ansvar?",
  "vinner 5-kampen?",
  "tappar bort sitt glas?",
  "får alla att skratta?",
];

const missionPool = [
  "Ta en bild på någon som gör årets första skål.",
  "Fånga en midsommarkrans i bild.",
  "Ta en gruppbild med minst fyra personer.",
  "Dokumentera kvällens snyggaste tallrik.",
  "Fota någon som dansar eller poserar dramatiskt.",
  "Ta en bild på någon som hjälper till utan att bli ombedd.",
  "Fota en person som skrattar på riktigt.",
  "Ta bildbevis på någon som pratar VM.",
  "Fota något som räddade kvällen.",
  "Ta bild på en oväntad detalj i dukningen.",
  "Fånga någon som går barfota.",
  "Ta bild på kvällens bästa dryck.",
  "Dokumentera ett spontant high-five.",
  "Fota någon som gör en seriös grillmin.",
  "Ta en bild på en person med filt.",
  "Fota någon som säger att de är mätta.",
  "Ta bild på ett vinnarfirande.",
  "Fånga någon som sjunger med.",
  "Ta bild på en person som hämtar mer potatis.",
  "Dokumentera en hemlig allians i 5-kampen.",
  "Fota kvällens bästa utsikt.",
  "Ta bild på någon som byter plats.",
  "Fota någon som tar kaffe.",
  "Dokumentera en misslyckad men charmig lekinsats.",
  "Ta bild på ett lag som peppar varandra.",
  "Fånga någon som gör tummen upp.",
  "Ta bild på något gult.",
  "Ta bild på något blått.",
  "Fota någon som förklarar regler.",
  "Dokumentera kvällens mest svenska ögonblick.",
  "Fota en person som bär något blomstrigt.",
  "Ta bild på sista tuggan av något gott.",
];

const bingoPool = [
  "Säger skål",
  "Blomma i håret",
  "Byter plats",
  "Extra potatis",
  "Pratar väder",
  "Startar låt",
  "Egen historia",
  "Går barfota",
  "Borttappat glas",
  "Någon pratar VM",
  "Tar kaffe",
  "Säger mygg",
  "Tar gruppbild",
  "Hämtar filt",
  "Vinner en gren",
  "Sjunger",
];

const bingoLines = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const bingoLineRewards = [
  "Vinst: välj nästa låt.",
  "Vinst: dela ut en skål.",
  "Vinst: välj nästa lek.",
  "Straff: håll ett 20 sekunders midsommartal.",
  "Straff: ta ansvar för nästa allsång.",
  "Straff: byt plats med valfri person i 10 minuter.",
];

const bingoFullReward = "Storpris: full bricka, evig ära och +3 personpoäng.";

let state = loadState();

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) return structuredClone(seed);
  try {
    return { ...structuredClone(seed), ...JSON.parse(saved) };
  } catch {
    return structuredClone(seed);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!applyingRemoteState) scheduleRemoteSave();
}

function getSharedState() {
  return sanitizeSharedState(Object.fromEntries(SHARED_STATE_KEYS.map((key) => [key, state[key]])));
}

function sanitizeSharedState(sharedState) {
  return JSON.parse(JSON.stringify(sharedState, (key, value) => {
    if (key === "photo" && typeof value === "string" && value.startsWith("data:image/")) return "";
    return value;
  }));
}

function applySharedState(sharedState) {
  if (!sharedState || typeof sharedState !== "object") return;
  SHARED_STATE_KEYS.forEach((key) => {
    if (sharedState[key] !== undefined) state[key] = sharedState[key];
  });
  Object.keys(state.profiles || {}).forEach((name) => {
    const profile = state.profiles[name];
    if (profile) migrateProfile(name, profile);
  });
}

function scheduleRemoteSave() {
  if (!remoteReady) return;
  pendingRemoteSave = true;
  clearTimeout(remoteSaveTimer);
  remoteSaveTimer = setTimeout(saveRemoteState, 350);
}

async function saveRemoteState() {
  if (!remoteReady) return;
  const sharedState = getSharedState();
  const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state`, {
    method: "POST",
    headers: remoteHeaders({
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    }),
    body: JSON.stringify({ id: REMOTE_STATE_ID, data: sharedState, updated_at: new Date().toISOString() }),
  });
  if (!response.ok) {
    pendingRemoteSave = false;
    console.warn("Kunde inte spara Supabase-state", await response.text());
    return;
  }
  lastRemoteStateJson = JSON.stringify(sharedState);
  pendingRemoteSave = false;
}

async function loadRemoteState() {
  const sharedState = await fetchRemoteState();
  remoteReady = true;
  if (sharedState && Object.keys(sharedState).length) {
    applyingRemoteState = true;
    applySharedState(sharedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyingRemoteState = false;
    lastRemoteStateJson = JSON.stringify(sharedState);
    return;
  }
  await saveRemoteState();
}

async function fetchRemoteState() {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/app_state?id=eq.${REMOTE_STATE_ID}&select=data`, {
    headers: remoteHeaders(),
  });
  if (!response.ok) {
    console.warn("Kunde inte hämta Supabase-state", await response.text());
    return null;
  }
  const rows = await response.json();
  return rows[0]?.data || null;
}

async function pollRemoteState() {
  if (!remoteReady || pendingRemoteSave) return;
  const sharedState = await fetchRemoteState();
  if (!sharedState) return;
  const nextJson = JSON.stringify(sharedState);
  if (nextJson === lastRemoteStateJson) return;
  lastRemoteStateJson = nextJson;
  applyingRemoteState = true;
  applySharedState(sharedState);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  applyingRemoteState = false;
  renderAll();
}

function subscribeRemoteState() {
  clearInterval(remotePollTimer);
  remotePollTimer = setInterval(pollRemoteState, 4000);
}

function remoteHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  };
}

function subscribeRemoteStateLegacy() {
  if (!window.supabase) return;
  window.supabase
    .channel("midsommar-shared-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "app_state", filter: `id=eq.${REMOTE_STATE_ID}` },
      (payload) => {
        if (!payload.new?.data) return;
        const nextJson = JSON.stringify(payload.new.data);
        if (nextJson === lastRemoteStateJson) return;
        lastRemoteStateJson = nextJson;
        applyingRemoteState = true;
        applySharedState(payload.new.data);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        applyingRemoteState = false;
        renderAll();
      },
    )
    .subscribe();
}

function applyRemotePayload(data) {
  if (data?.data && Object.keys(data.data).length) {
    applyingRemoteState = true;
    applySharedState(data.data);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    applyingRemoteState = false;
    return;
  }
}

function activeProfile() {
  if (!state.profile) return null;
  if (!state.profiles[state.profile]) state.profiles[state.profile] = makeProfile(state.profile);
  state.profiles[state.profile] = { ...makeProfile(state.profile), ...state.profiles[state.profile] };
  migrateProfile(state.profile, state.profiles[state.profile]);
  return state.profiles[state.profile];
}

function makeProfile(name) {
  const profile = structuredClone(profileSeed);
  profile.voteDeck = shuffle(voteQuestions).slice(0, 4);
  profile.bingo = shuffle(bingoPool).slice(0, 9);
  profile.missions = getMissionsFor(name);
  return profile;
}

function migrateProfile(name, profile) {
  if (!Array.isArray(profile.missions) || !profile.missions.length) profile.missions = getMissionsFor(name);
  if (!profile.bingoProofs) profile.bingoProofs = {};
  if (!profile.bingoRewards) profile.bingoRewards = {};
  if (!Array.isArray(profile.bingoHits)) profile.bingoHits = [];
  if (!Array.isArray(profile.bingo) || !profile.bingo.length) profile.bingo = shuffle(bingoPool).slice(0, 9);
  profile.bingoHits.forEach((item) => {
    if (!profile.bingoProofs[item]) profile.bingoProofs[item] = { photo: "", completedAt: "" };
  });
  profile.missions = profile.missions.map((mission, index) =>
    typeof mission === "string"
      ? { id: `${name}-${index}`, text: mission, points: missionPointsFor(mission), photo: "", completedAt: "" }
      : { photo: "", completedAt: "", points: missionPointsFor(mission.text || "", index), ...mission },
  );
}

function getMissionsFor(name) {
  const guestIndex = Math.max(0, guests.indexOf(originalGuestForDisplay(name) || name));
  return missionPool.slice(guestIndex * 4, guestIndex * 4 + 4).map((text, index) => ({
    id: `${name}-${index}`,
    text,
    points: missionPointsFor(text, index),
    photo: "",
    completedAt: "",
  }));
}

function missionPointsFor(text, index = 0) {
  const value = String(text).toLowerCase();
  if (/(gruppbild|minst fyra|hemlig allians|vinnarfirande|förklarar regler|mest svenska|räddade kvällen|oväntad detalj)/i.test(value)) return 3;
  if (/(sista tuggan|något gult|något blått|kaffe|filt|barfota|potatis|tummen upp)/i.test(value)) return 1;
  return index === 2 ? 3 : 2;
}

function renderAll() {
  activatePartyIfEventStarted();
  renderShell();
  renderForecast();
  renderLogin();
  renderProfile();
  renderPrep();
  renderParty();
}

function activatePartyIfEventStarted() {
  if (Date.now() < EVENT_START.getTime()) return;
  if (state.page === "party") return;
  state.page = "party";
  state.section = "today";
  if (!applyingRemoteState) saveState();
}

function openPartyForTest() {
  state.page = "party";
  state.section = "today";
  galleryIndex = null;
  galleryMotion = "open";
  saveState();
  renderAll();
}

function renderShell() {
  document.body.dataset.page = state.page;
  document.body.dataset.loggedIn = state.profile ? "true" : "false";
  document.body.dataset.admin = isAdmin() ? "true" : "false";
  document.querySelectorAll("[data-page]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.page === state.page);
  });
  document.querySelectorAll(".page").forEach((page) => page.classList.remove("is-active"));
  document.querySelector(`#${state.page}-page`).classList.add("is-active");
}

function allParticipants() {
  const overrides = state.nameOverrides || {};
  const overriddenNames = new Set(Object.values(overrides).filter(Boolean));
  const baseGuests = guests.map((name) => overrides[name] || name);
  const extras = [...Object.keys(state.profiles || {}), ...Object.keys(state.rsvp || {})]
    .filter((name) => name && !guests.includes(name) && !overriddenNames.has(name));
  return [...new Set([...baseGuests, ...extras].filter(Boolean))];
}

function originalGuestForDisplay(name) {
  const overrides = state.nameOverrides || {};
  const match = Object.entries(overrides).find(([, displayName]) => displayName === name);
  if (match) return match[0];
  return guests.includes(name) ? name : "";
}

function normalizeProfileName(value) {
  const cleaned = String(value || "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  const known = allParticipants().find((name) => name.toLowerCase() === cleaned.toLowerCase());
  if (known) return known;
  return cleaned
    .split(" ")
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function isAdmin() {
  return state.adminMode === true;
}

function rsvpStatus(name) {
  const value = state.rsvp?.[name];
  if (value === true) return "yes";
  if (value === false) return "no";
  if (["yes", "maybe", "no"].includes(value)) return value;
  return "";
}

function rsvpLabel(status) {
  if (status === "yes") return "kommer";
  if (status === "maybe") return "kanske";
  if (status === "no") return "kan inte";
  return "inte svarat";
}

function renameProfile(oldName, newName) {
  if (!oldName || !newName || oldName === newName) return false;
  state.nameOverrides = state.nameOverrides || {};
  const originalGuest = originalGuestForDisplay(oldName);
  if (originalGuest) state.nameOverrides[originalGuest] = newName;

  if (state.profiles[oldName] && !state.profiles[newName]) state.profiles[newName] = state.profiles[oldName];
  if (state.profiles[oldName]) delete state.profiles[oldName];
  if (Object.prototype.hasOwnProperty.call(state.rsvp || {}, oldName)) {
    state.rsvp[newName] = state.rsvp[oldName];
    delete state.rsvp[oldName];
  }
  if (Object.prototype.hasOwnProperty.call(state.matchVotes || {}, oldName)) {
    state.matchVotes[newName] = state.matchVotes[oldName];
    delete state.matchVotes[oldName];
  }
  state.profile = newName;
  return true;
}

function renderLogin() {
  const input = document.querySelector("#login-name");
  if (input && !input.value) input.value = "";
}

function renderProfile() {
  const profile = activeProfile();
  setText("profile-label", profile ? `${state.profile} · ${profile.points} p${isAdmin() ? " · admin" : ""}` : "Välj");
  setText("profile-initial", state.profile ? state.profile.slice(0, 1) : "?");
  setText("dialog-profile-name", profile ? `${state.profile} · ${profile.points} p` : "Ingen vald");
  document.querySelector("#profile-button").disabled = false;
  document.querySelector("#profile-grid").innerHTML = allParticipants()
    .map((name) => `<button class="${name === state.profile ? "is-selected" : ""}" value="${escapeHtml(name)}" type="button" data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
  const adminInput = document.querySelector("#admin-name-input");
  if (adminInput && !adminInput.value) adminInput.value = state.profile || "";
  if (adminInput) adminInput.disabled = !isAdmin();
  document.querySelector("[data-admin-login]").disabled = !isAdmin();
  document.querySelector(".admin-name-field").hidden = !isAdmin();
  document.querySelector("#profile-grid").hidden = false;
  document.querySelector("#admin-code-row").hidden = isAdmin();
  document.querySelector("[data-admin-mode]").hidden = !isAdmin();
  document.querySelector("[data-admin-mode]").textContent = "Lämna admin mode";
  setText("profile-dialog-copy", isAdmin() ? "Admin mode är aktivt. Du kan byta profil eller döpa om aktiv person." : "Byt profil för test. Admin kod krävs bara för namnbyte och rättning.");
}

function renderForecast() {
  const days = getWeatherDays();
  document.querySelector("#forecast-strip").innerHTML = (days.length ? days : ["Fre", "Lör", "Sön"].map((label) => ({ label, icon: "☁", summary: "Väder", detail: "hämtas" })))
    .map(
      (day) => `<article><span>${escapeHtml(day.label)}</span><strong><b>${day.icon}</b>${escapeHtml(day.summary)}</strong><small>${escapeHtml(day.detail)}</small></article>`,
    )
    .join("");
}

function renderPrep() {
  const profile = activeProfile();
  ensurePackList();
  const parts = countdownParts();
  setText("countdown-days", parts.days);
  setText("countdown-time", `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)} kvar`);

  const participants = allParticipants();
  const rsvpDone = participants.filter((name) => rsvpStatus(name)).length;
  const status = rsvpStatus(state.profile);
  const choices = [
    ["yes", "Kommer"],
    ["maybe", "Kanske"],
    ["no", "Kan inte"],
  ];
  setText("rsvp-count", state.profile ? state.profile : `${rsvpDone}/${participants.length} svar`);
  document.querySelector("#rsvp-list").innerHTML = state.profile
    ? `<div class="rsvp-choice-group" aria-label="OSA för ${escapeHtml(state.profile)}">
        ${choices.map(([value, label]) => `<button class="${status === value ? "is-selected" : ""}" type="button" data-rsvp-status="${value}" data-rsvp-name="${escapeHtml(state.profile)}">${label}</button>`).join("")}
      </div>`
    : `<button class="rsvp-self" type="button" data-open-profile>
        <span class="rsvp-status-dot"></span>
        <strong>Välj</strong>
      </button>`;

  const packLeft = state.pack.filter((item) => !item.done).length;
  setText("pack-count", `${packLeft} kvar`);
  document.querySelector("#pack-list").innerHTML = state.pack
    .map(
      (item) => `<label class="pack-row"><input type="checkbox" data-pack="${item.id}" ${item.done ? "checked" : ""} /><span>${escapeHtml(item.text)}</span></label>`,
    )
    .join("");

  if (profile) {
    setText("profile-label", `${state.profile} · ${profile.points} p${isAdmin() ? " · admin" : ""}`);
  }
}

function ensurePackList() {
  seed.pack.forEach((defaultItem) => {
    if (!state.pack.some((item) => item.id === defaultItem.id)) state.pack.push({ ...defaultItem });
  });
}

function renderParty() {
  if (state.section !== "photos") galleryIndex = null;
  document.body.dataset.section = state.section;
  const [kicker, title] = sectionMeta[state.section];
  setText("party-kicker", kicker);
  setText("party-title", title);
  document.querySelectorAll("[data-section]").forEach((button) => button.classList.toggle("is-active", button.dataset.section === state.section));
  const renderers = {
    today: renderToday,
    games: renderGames,
    score: renderPersonalScore,
    photos: renderPhotos,
    pentathlon: renderPentathlon,
    match: renderMatch,
  };
  document.querySelector("#party-content").innerHTML = renderers[state.section]();
  bindDynamicEvents();
}

function renderToday() {
  return `<div class="dashboard-grid">
    <article class="dash-card dash-card--wide"><span>Nästa</span><strong>12:00 Lunch</strong><small>Sill, potatis, kall dryck</small></article>
    <article class="dash-card dash-card--wide"><span>Hållpunkter</span><div class="timeline-mini">${timeline.map((item) => `<b>${escapeHtml(item[0])}</b><span>${escapeHtml(item[1])}</span>`).join("")}</div></article>
    <article class="dash-card dash-card--wide"><span>Poängställning</span>${renderScoreMini()}</article>
  </div>`;
}

function renderScoreMini() {
  return `<div class="score-mini-list">${getPersonalLeaders()
    .slice(0, 4)
    .map((row) => `<p><strong>${escapeHtml(row.name)}</strong><span>${row.points} p</span></p>`)
    .join("")}</div>`;
}

function renderMatch() {
  const apiData = state.matchApiData;
  const vote = state.matchVotes[state.profile] || {};
  const result = normalizeMatchResult(vote);
  return `<div class="match-layout match-layout--compact">
    <article class="game-card match-hero match-summary-card">
      <span class="micro-label">Grupp ${escapeHtml(matchFallback.group.replace("Group ", ""))}</span>
      <h3>${escapeHtml(apiData?.title || `${matchFallback.selected.away} vs ${matchFallback.selected.home}`)}</h3>
      <p>${escapeHtml(apiData?.detail || `${matchFallback.selected.date} · ${matchFallback.selected.time} · ${matchFallback.selected.venue}`)}</p>
    </article>
    <article class="game-card match-list-card">
      <span class="micro-label">Våra matcher</span>
      <div class="match-list">
        ${matchSchedule.map((match) => `<div class="match-row"><span>${escapeHtml(match.date)}</span><strong>Sverige - ${escapeHtml(match.opponent)}</strong><small>${escapeHtml(match.note)}</small></div>`).join("")}
      </div>
    </article>
    <article class="game-card match-vote-card">
      <span class="micro-label">Din matchröst</span>
      <h3>1X2</h3>
      <div class="choice-grid">
        ${["1", "X", "2"].map((pick) => `<button class="choice-button ${vote.oneXtwo === pick ? "is-selected" : ""}" type="button" data-match-pick="${pick}">${pick}</button>`).join("")}
      </div>
      <h3>Resultat</h3>
      <div class="score-inputs">
        <label><span>SWE</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.home)}" data-match-score="home" /></label>
        <b>-</b>
        <label><span>NED</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.away)}" data-match-score="away" /></label>
      </div>
      <p class="hint">${vote.oneXtwo || result.text ? `Sparat: ${vote.oneXtwo || "-"} · ${result.text || "-"}` : "Rösta innan matchen."}</p>
    </article>
  </div>`;
}

function normalizeMatchResult(vote) {
  if (vote.resultHome !== undefined || vote.resultAway !== undefined) {
    const home = vote.resultHome ?? "";
    const away = vote.resultAway ?? "";
    return { home, away, text: home !== "" && away !== "" ? `${home}-${away}` : "" };
  }
  const match = String(vote.result || "").match(/^(\d+)-(\d+)$/);
  if (!match) return { home: "", away: "", text: "" };
  return { home: match[1], away: match[2], text: `${match[1]}-${match[2]}` };
}

function renderGames() {
  const profile = activeProfile();
  if (!profile) return `<article class="game-card"><h3>Välj profil först</h3><p>Då får du egen bingo och egna uppdrag.</p></article>`;
  return `<div class="game-picker">
    <button class="pill-button ${state.game === "wheel" ? "is-active" : ""}" type="button" data-game="wheel">Hjul</button>
    <button class="pill-button ${state.game === "vote" ? "is-active" : ""}" type="button" data-game="vote">Röst</button>
    <button class="pill-button ${state.game === "mission" ? "is-active" : ""}" type="button" data-game="mission">Uppdrag</button>
    <button class="pill-button ${state.game === "bingo" ? "is-active" : ""}" type="button" data-game="bingo">Bingo</button>
  </div>
  ${state.game === "wheel" ? renderWheel(profile) : ""}
  ${state.game === "vote" ? renderVote(profile) : ""}
  ${state.game === "mission" ? renderMission(profile) : ""}
  ${state.game === "bingo" ? renderBingo(profile) : ""}`;
}

function renderWheel(profile) {
  return `<article class="wheel-card"><div class="wheel" id="wheel">${escapeHtml(profile.wheelResult)}</div><button class="spin-button" type="button" data-spin>Snurra</button><p class="hint">Bonusar delas ut av appen. Inga manuella poäng.</p></article>`;
}

function renderVote(profile) {
  const question = profile.voteDeck[0] || voteQuestions[0];
  return `<article class="game-card"><span class="micro-label">Din fråga</span><h3>Vem ${escapeHtml(question)}</h3><div class="vote-options">${allParticipants().filter((name) => name !== state.profile).map((name) => `<button class="vote-button ${profile.votes[question] === name ? "is-selected" : ""}" type="button" data-vote="${escapeHtml(question)}" data-target="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div><p class="hint">${profile.votes[question] ? `Ditt svar: ${escapeHtml(profile.votes[question])}` : "Spara svar nu. Max rättar sista dagen."}</p><button class="pill-button" type="button" data-next-personal-question>Nästa egen fråga</button></article>`;
}

function renderMissionLegacy(profile) {
  return `<div class="mission-list">${profile.missions.map((mission, index) => `
    <article class="mission-card ${mission.photo ? "is-complete" : ""}">
      <div><span class="micro-label">Uppdrag ${index + 1} · 2 p</span><h3>${escapeHtml(mission.text)}</h3><p class="hint">${mission.photo ? "Utfört" : profile.activeMission === index ? "För att få poäng måste du ladda upp bild när du gör uppdraget." : "Inte utfört än."}</p></div>
      ${mission.photo ? `<img class="mission-photo" src="${mission.photo}" alt="Bevis för uppdrag ${index + 1}" /><span class="done-pill">Utfört</span>` : ""}
      ${!mission.photo && profile.activeMission !== index ? `<button class="upload-button" type="button" data-start-mission="${index}">Utför</button>` : ""}
      ${!mission.photo && profile.activeMission === index ? `<label class="upload-button">Ladda upp bild<input type="file" accept="image/*" data-mission-upload="${index}" /></label>` : ""}
    </article>`).join("")}</div>`;
}

function renderBingoLegacy(profile) {
  return `<div class="bingo-grid">${profile.bingo.map((item) => `<button class="bingo-cell ${profile.bingoHits.includes(item) ? "is-hit" : ""}" type="button" data-bingo="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join("")}</div><p class="hint" style="margin-top:8px">${profile.bingoHits.length}/9 markerade · unik bricka för ${escapeHtml(state.profile)}</p>`;
}

function getBingoHits(profile) {
  return Object.entries(profile.bingoProofs || {})
    .filter(([, proof]) => proof?.completedAt)
    .map(([item]) => item)
    .filter((item) => profile.bingo.includes(item));
}

function evaluateBingoRewards(profile) {
  const hits = getBingoHits(profile);
  const hasLine = bingoLines.some((line) => line.every((index) => hits.includes(profile.bingo[index])));
  profile.bingoRewards = profile.bingoRewards || {};
  if (hasLine && !profile.bingoRewards.lineText) {
    profile.bingoRewards.lineText = bingoLineRewards[Math.floor(Math.random() * bingoLineRewards.length)];
  }
  if (hits.length === profile.bingo.length && !profile.bingoRewards.fullText) {
    profile.bingoRewards.fullText = bingoFullReward;
    profile.points += 3;
  }
}

function renderMission(profile) {
  return `<div class="mission-list">${profile.missions.map((mission, index) => `
    <article class="mission-card ${mission.photo ? "is-complete" : ""}">
      <div><span class="micro-label">${mission.points || missionPointsFor(mission.text, index)} p</span><h3>${escapeHtml(mission.text)}</h3><p class="hint">${mission.photo ? "Klar och låst." : "Tryck Utför när du kan ta bilden direkt."}</p></div>
      ${mission.photo ? `<span class="done-pill">Klar</span>` : `<button class="upload-button" type="button" data-start-mission="${index}">Utför</button><input class="capture-input" type="file" accept="image/*" capture="environment" data-mission-upload="${index}" />`}
    </article>`).join("")}</div>`;
}

function renderBingo(profile) {
  const hits = getBingoHits(profile);
  return `<div class="bingo-grid">${profile.bingo.map((item, index) => {
    const isHit = hits.includes(item);
    return `<button class="bingo-cell ${isHit ? "is-hit" : ""}" type="button" data-bingo="${escapeHtml(item)}" data-bingo-index="${index}" ${isHit ? "disabled" : ""}>
      <span>${escapeHtml(item)}</span>
      <small>${isHit ? "Klar" : "Ta bild"}</small>
    </button><input class="capture-input" type="file" accept="image/*" capture="environment" data-bingo-upload="${index}" />`;
  }).join("")}</div>
  <div class="bingo-rewards">
    <p class="hint">${hits.length}/9 låsta · unik bricka för ${escapeHtml(state.profile)}</p>
    <p class="hint">${profile.bingoRewards.lineText ? escapeHtml(profile.bingoRewards.lineText) : "3 i rad ger vinst eller straff."}</p>
    <p class="hint">${profile.bingoRewards.fullText ? escapeHtml(profile.bingoRewards.fullText) : "Full bricka ger storpris och +3 poäng."}</p>
  </div>`;
}

function renderPersonalScore() {
  return `<div class="scoreboard">${allParticipants().map((name) => {
    const profile = state.profiles[name] || makeProfile(name);
    return `<article class="score-row"><div><strong>${escapeHtml(name)}</strong><span>${profile.points} poäng</span></div><span class="tag">${name === state.profile ? "du" : "auto"}</span></article>`;
  }).join("")}<p class="hint">Poäng ges av appen: uppdrag, hjulbonus och adminrättad omröstning.</p>${isAdmin() ? renderVoteAdmin() : ""}</div>`;
}

function renderVoteAdmin() {
  const participants = allParticipants();
  const answeredQuestions = [...new Set(participants.flatMap((name) => Object.keys((state.profiles[name] || {}).votes || {})))];
  if (!answeredQuestions.length) return `<article class="game-card"><span class="micro-label">Admin</span><h3>Inga svar att rätta ännu</h3></article>`;
  return `<article class="game-card"><span class="micro-label">Max admin</span><h3>Rätta omröstning</h3>${answeredQuestions.map((question) => {
    const isCorrected = state.voteCorrected?.[question];
    return `
    <div class="correction-card">
      <strong>Vem ${escapeHtml(question)}</strong>
      <div class="choice-grid">
        ${participants.map((name) => `<button class="choice-button ${state.voteCorrections[question] === name ? "is-selected" : ""}" type="button" data-correct-question="${escapeHtml(question)}" data-correct-target="${escapeHtml(name)}" ${isCorrected ? "disabled" : ""}>${escapeHtml(name)}</button>`).join("")}
      </div>
      <button class="pill-button" type="button" data-award-question="${escapeHtml(question)}" ${isCorrected ? "disabled" : ""}>${isCorrected ? "Rättad" : "Rätta och dela poäng"}</button>
    </div>
  `;
  }).join("")}</article>`;
}

function renderPhotosLegacy() {
  const photos = guests.flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.missions) return [];
    return profile.missions
      .filter((mission) => mission.photo)
      .map((mission) => ({ name, text: mission.text, photo: mission.photo }));
  });

  if (!photos.length) {
    return `<article class="game-card"><h3>Inga bilder ännu</h3><p class="hint">När någon klarar ett uppdrag med bild hamnar bilden här.</p></article>`;
  }

  return `<div class="photo-grid">${photos.map((item) => `
    <article class="photo-card">
      <img src="${item.photo}" alt="Uppdragsbild från ${escapeHtml(item.name)}" />
      <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.text)}</span></div>
    </article>
  `).join("")}</div>`;
}

function getGalleryPhotos() {
  const missionPhotos = allParticipants().flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.missions) return [];
    return profile.missions
      .filter((mission) => mission.photo)
      .map((mission) => ({ name, text: mission.text, photo: mission.photo, type: "Uppdrag" }));
  });
  const bingoPhotos = allParticipants().flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.bingoProofs) return [];
    return Object.entries(profile.bingoProofs)
      .filter(([, proof]) => proof?.photo)
      .map(([text, proof]) => ({ name, text, photo: proof.photo, type: "Bingo" }));
  });
  return [...missionPhotos, ...bingoPhotos];
}

function renderPhotos() {
  const photos = getGalleryPhotos();
  if (galleryIndex !== null && !photos[galleryIndex]) galleryIndex = null;
  if (!photos.length) {
    return `<article class="game-card"><h3>Inga bilder ännu</h3><p class="hint">När någon klarar uppdrag eller bingo med bild hamnar bevisen här.</p></article>`;
  }
  if (galleryIndex !== null) return renderPhotoViewer(photos);

  return `<div class="photo-grid">${photos.map((item, index) => `
    <button class="photo-card" type="button" data-photo-index="${index}">
      <img src="${item.photo}" alt="${escapeHtml(item.type)} från ${escapeHtml(item.name)}" />
      <div><strong>${escapeHtml(item.name)} · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.text)}</span></div>
    </button>
  `).join("")}</div>`;
}

function renderPhotoViewer(photos) {
  const item = photos[galleryIndex];
  const position = `${galleryIndex + 1}/${photos.length}`;
  return `<div class="photo-viewer is-${galleryMotion}" data-photo-viewer>
    <button class="photo-close" type="button" data-gallery-close aria-label="Stäng bildvisare">×</button>
    <button class="photo-nav photo-nav--prev" type="button" data-gallery-prev aria-label="Föregående bild">‹</button>
    <figure class="photo-viewer__stage">
      <img src="${item.photo}" alt="${escapeHtml(item.type)} från ${escapeHtml(item.name)}" />
      <figcaption><strong>${escapeHtml(item.name)} · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.text)}</span><small>${position}</small></figcaption>
    </figure>
    <button class="photo-nav photo-nav--next" type="button" data-gallery-next aria-label="Nästa bild">›</button>
  </div>`;
}

function renderPentathlon() {
  const totals = state.teamScores.map((team, teamIndex) => ({
    team: team.team,
    score: state.pentathlon.reduce((sum, event) => sum + event.scores[teamIndex], 0),
  }));
  return `<div class="score-mini">${totals.map((row) => `<article><strong>${escapeHtml(row.team)}</strong><span>${row.score} p</span></article>`).join("")}</div><div class="pentathlon-list">${state.pentathlon.map((event, eventIndex) => `<article class="game-card"><span class="micro-label">${eventIndex + 1}/5</span><h3>${escapeHtml(event.name)}</h3><div class="mini-score-row">${state.teamScores.map((team, teamIndex) => `<button type="button" data-five-event="${eventIndex}" data-five-team="${teamIndex}">${escapeHtml(team.team)} +</button>`).join("")}</div></article>`).join("")}</div>`;
}

function compressProofImage(file) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 1800);
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("load", () => {
        clearTimeout(timeout);
        const maxSide = 900;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.74);
      });
      image.addEventListener("error", () => {
        clearTimeout(timeout);
        resolve(null);
      });
      image.src = String(reader.result);
    });
    reader.addEventListener("error", () => {
      clearTimeout(timeout);
      resolve(null);
    });
    reader.readAsDataURL(file);
  });
}

function extensionForMime(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  return "jpg";
}

function proofPath(kind, label, extension = "jpg") {
  const safeProfile = (state.profile || "guest").toLowerCase();
  const safeLabel = String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "proof";
  return `${safeProfile}/${kind}-${safeLabel}-${Date.now()}.${extension}`;
}

async function uploadProofImage(file, kind, label) {
  const compressedBlob = await compressProofImage(file);
  const blob = compressedBlob || file;
  const mime = compressedBlob ? "image/jpeg" : (file.type || "application/octet-stream");
  const path = proofPath(kind, label, extensionForMime(mime));
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${PROOF_BUCKET}/${encodeURI(path)}`, {
    method: "POST",
    headers: remoteHeaders({
      "Content-Type": mime,
      "x-upsert": "false",
    }),
    body: blob,
  });
  if (!response.ok) {
    console.warn("Kunde inte ladda upp bild till Supabase", await response.text());
    return "";
  }
  return `${SUPABASE_URL}/storage/v1/object/public/${PROOF_BUCKET}/${encodeURI(path)}`;
}

async function completeMissionWithFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const missionIndex = Number(input.dataset.missionUpload);
  const profile = activeProfile();
  const mission = profile.missions[missionIndex];
  if (!mission || mission.photo) return;
  const photo = await uploadProofImage(file, "mission", mission.id || missionIndex);
  if (!photo) {
    window.alert("Bilden kunde inte laddas upp. Testa igen med en vanlig bild från kameran eller albumet.");
    return;
  }
  mission.photo = photo;
  mission.completedAt = new Date().toISOString();
  profile.activeMission = null;
  profile.points += mission.points || missionPointsFor(mission.text, missionIndex);
  saveState();
  renderAll();
}

async function completeBingoWithFile(input) {
  const file = input.files?.[0];
  if (!file) return;
  const bingoIndex = Number(input.dataset.bingoUpload);
  const profile = activeProfile();
  const item = profile.bingo[bingoIndex];
  if (!item || profile.bingoProofs?.[item]?.completedAt) return;
  const photo = await uploadProofImage(file, "bingo", item);
  if (!photo) {
    window.alert("Bilden kunde inte laddas upp. Testa igen med en vanlig bild från kameran eller albumet.");
    return;
  }
  profile.bingoProofs = profile.bingoProofs || {};
  profile.bingoProofs[item] = { photo, completedAt: new Date().toISOString() };
  if (!profile.bingoHits.includes(item)) profile.bingoHits.push(item);
  evaluateBingoRewards(profile);
  saveState();
  renderAll();
}

function moveGallery(step) {
  const photos = getGalleryPhotos();
  if (!photos.length || galleryIndex === null) return;
  galleryMotion = step < 0 ? "prev" : "next";
  galleryIndex = (galleryIndex + step + photos.length) % photos.length;
  renderAll();
}

function bindDynamicEvents() {
  document.querySelectorAll("[data-rsvp-status]").forEach((button) => button.addEventListener("click", () => {
    const name = button.dataset.rsvpName;
    const status = button.dataset.rsvpStatus;
    if (!name || !["yes", "maybe", "no"].includes(status)) return;
    state.rsvp[name] = status;
    saveState();
    showToast(`OSA sparad: ${rsvpLabel(status)}`);
    renderAll();
  }));

  document.querySelectorAll("[data-pack]").forEach((input) => input.addEventListener("change", () => {
    const item = state.pack.find((pack) => pack.id === input.dataset.pack);
    item.done = input.checked;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-open-profile]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector("#profile-dialog").showModal();
  }));

  document.querySelectorAll("[data-game]").forEach((button) => button.addEventListener("click", () => {
    state.game = button.dataset.game;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-vote]").forEach((button) => button.addEventListener("click", () => {
    const profile = activeProfile();
    profile.votes[button.dataset.vote] = button.dataset.target;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-correct-question]").forEach((button) => button.addEventListener("click", () => {
    state.voteCorrections[button.dataset.correctQuestion] = button.dataset.correctTarget;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-award-question]").forEach((button) => button.addEventListener("click", () => {
    const question = button.dataset.awardQuestion;
    if (state.voteCorrected?.[question]) return;
    const correct = state.voteCorrections[question];
    if (!correct) return;
    allParticipants().forEach((name) => {
      const profile = state.profiles[name];
      if (!profile?.votes || profile.votes[question] !== correct) return;
      const key = `${name}::${question}`;
      if (state.voteAwarded[key]) return;
      profile.points += 1;
      state.voteAwarded[key] = true;
    });
    state.voteCorrected = state.voteCorrected || {};
    state.voteCorrected[question] = true;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-match-pick]").forEach((button) => button.addEventListener("click", () => {
    if (!state.profile) return;
    state.matchVotes[state.profile] = { ...(state.matchVotes[state.profile] || {}), oneXtwo: button.dataset.matchPick };
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-match-result]").forEach((button) => button.addEventListener("click", () => {
    if (!state.profile) return;
    state.matchVotes[state.profile] = { ...(state.matchVotes[state.profile] || {}), result: button.dataset.matchResult };
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-match-score]").forEach((input) => input.addEventListener("input", () => {
    if (!state.profile) return;
    const vote = { ...(state.matchVotes[state.profile] || {}) };
    const value = input.value === "" ? "" : String(Math.max(0, Math.min(20, Number(input.value) || 0)));
    if (input.dataset.matchScore === "home") vote.resultHome = value;
    if (input.dataset.matchScore === "away") vote.resultAway = value;
    vote.result = vote.resultHome !== "" && vote.resultAway !== "" ? `${vote.resultHome}-${vote.resultAway}` : "";
    state.matchVotes[state.profile] = vote;
    const hint = document.querySelector(".match-vote-card .hint");
    if (hint) hint.textContent = vote.oneXtwo || vote.result ? `Sparat: ${vote.oneXtwo || "-"} · ${vote.result || "-"}` : "Rösta innan matchen.";
    saveState();
  }));

  document.querySelector("[data-spin]")?.addEventListener("click", () => {
    const profile = activeProfile();
    const actions = [
      { text: "Alla byter plats" },
      { text: "Välj nästa låt" },
      { text: "Utse kvällens DJ i 10 min" },
      { text: "Alla tar vattenpaus" },
      { text: "Välj nästa 5-kampsgren" },
      { text: "Skål med valfri person" },
      { text: "Ta en gruppbild nu" },
      { bonus: true },
    ];
    const action = actions[Math.floor(Math.random() * actions.length)];
    if (action.bonus) {
      const participants = allParticipants();
      const winner = participants[Math.floor(Math.random() * participants.length)];
      const winnerProfile = state.profiles[winner] || makeProfile(winner);
      winnerProfile.points += 1;
      state.profiles[winner] = winnerProfile;
      profile.wheelResult = `${winner} får +1 bonuspoäng`;
    } else {
      profile.wheelResult = action.text;
    }
    const wheel = document.querySelector("#wheel");
    wheel.classList.remove("is-spinning");
    void wheel.offsetWidth;
    wheel.classList.add("is-spinning");
    saveState();
    setTimeout(renderAll, 650);
  });

  document.querySelector("[data-next-personal-question]")?.addEventListener("click", () => {
    const profile = activeProfile();
    profile.voteDeck.push(profile.voteDeck.shift());
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-mission-upload]").forEach((input) => input.addEventListener("change", () => {
    completeMissionWithFile(input);
  }));

  document.querySelectorAll("[data-start-mission]").forEach((button) => button.addEventListener("click", () => {
    const missionIndex = Number(button.dataset.startMission);
    if (!window.confirm("Ta en bild nu för att låsa uppdraget och få poäng?")) return;
    document.querySelector(`[data-mission-upload="${missionIndex}"]`)?.click();
  }));

  document.querySelectorAll("[data-bingo]").forEach((button) => button.addEventListener("click", () => {
    const profile = activeProfile();
    const bingoIndex = Number(button.dataset.bingoIndex);
    const item = profile.bingo[bingoIndex];
    if (!item || profile.bingoProofs?.[item]?.completedAt) return;
    if (!window.confirm("Ta en bild nu för att låsa bingorutan?")) return;
    document.querySelector(`[data-bingo-upload="${bingoIndex}"]`)?.click();
  }));

  document.querySelectorAll("[data-bingo-upload]").forEach((input) => input.addEventListener("change", () => {
    completeBingoWithFile(input);
  }));

  document.querySelectorAll("[data-photo-index]").forEach((button) => button.addEventListener("click", () => {
    galleryIndex = Number(button.dataset.photoIndex);
    galleryMotion = "open";
    renderAll();
  }));

  document.querySelector("[data-gallery-close]")?.addEventListener("click", () => {
    galleryIndex = null;
    galleryMotion = "open";
    renderAll();
  });

  document.querySelector("[data-gallery-prev]")?.addEventListener("click", () => moveGallery(-1));
  document.querySelector("[data-gallery-next]")?.addEventListener("click", () => moveGallery(1));

  const viewer = document.querySelector("[data-photo-viewer]");
  if (viewer) {
    let touchStartX = 0;
    viewer.addEventListener("touchstart", (event) => {
      touchStartX = event.changedTouches[0]?.clientX || 0;
    }, { passive: true });
    viewer.addEventListener("touchend", (event) => {
      const delta = (event.changedTouches[0]?.clientX || 0) - touchStartX;
      if (Math.abs(delta) < 40) return;
      moveGallery(delta < 0 ? 1 : -1);
    }, { passive: true });
  }

  document.querySelectorAll("[data-five-event]").forEach((button) => button.addEventListener("click", () => {
    state.pentathlon[Number(button.dataset.fiveEvent)].scores[Number(button.dataset.fiveTeam)] += 1;
    saveState();
    renderAll();
  }));
}

async function loadWeather() {
  const params = new URLSearchParams({
    latitude: WEATHER.latitude,
    longitude: WEATHER.longitude,
    daily: "weather_code,temperature_2m_max,precipitation_probability_max,precipitation_sum",
    timezone: "Europe/Stockholm",
    forecast_days: "16",
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    state.weather = response.ok ? await response.json() : null;
  } catch {
    state.weather = null;
  }
  renderAll();
}

async function loadWorldCupMatch() {
  state.matchApiStatus = "Hämtar från no-key API...";
  renderAll();
  try {
    const response = await fetch("https://worldcup26.ir/get/games");
    if (!response.ok) throw new Error("api");
    const data = await response.json();
    const fixtures = Array.isArray(data) ? data : data.games || data.matches || data.data || [];
    const swedenMatch = fixtures.find((match) => JSON.stringify(match).toLowerCase().includes("sweden"));
    if (!swedenMatch) throw new Error("no-sweden");
    const teams = extractTeams(swedenMatch);
    state.matchApiData = {
      title: `${teams.away || "Sweden"} vs ${teams.home || "TBD"}`,
      detail: [swedenMatch.date, swedenMatch.time, swedenMatch.stadium?.name || swedenMatch.stadium || swedenMatch.venue || swedenMatch.location].filter(Boolean).join(" · "),
    };
    state.matchApiStatus = "Matchdata hämtad från no-key API";
  } catch {
    state.matchApiStatus = "No-key API kunde inte ge Sverige-match just nu";
  }
  saveState();
  renderAll();
}

function extractTeams(match) {
  const home = match.home?.name || match.home_team?.name || match.homeTeam?.name || match.team1?.name || match.team1 || match.home || "";
  const away = match.away?.name || match.away_team?.name || match.awayTeam?.name || match.team2?.name || match.team2 || match.away || "";
  return { home: String(home), away: String(away) };
}

function getWeatherDays() {
  const daily = state.weather?.daily;
  if (!daily?.time) return [];
  return ["2026-06-19", "2026-06-20", "2026-06-21"]
    .map((date, dayIndex) => ({ dayIndex, index: daily.time.indexOf(date) }))
    .filter((item) => item.index >= 0)
    .map(({ dayIndex, index }) => ({
      label: ["Fre", "Lör", "Sön"][dayIndex],
      icon: weatherIcon(daily.weather_code[index]),
      summary: `${weatherName(daily.weather_code[index])} ${Math.round(daily.temperature_2m_max[index])}°`,
      detail: `${daily.precipitation_probability_max[index] ?? 0}% regn`,
    }));
}

function getPersonalLeaders() {
  return allParticipants()
    .map((name) => ({ name, points: (state.profiles[name] || makeProfile(name)).points }))
    .sort((a, b) => b.points - a.points);
}

function countdownParts() {
  const diff = Math.max(0, EVENT_START - new Date());
  const seconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: seconds % 60,
  };
}

function renderCountdown() {
  const parts = countdownParts();
  setText("countdown-days", parts.days);
  setText("countdown-time", `${pad(parts.hours)}:${pad(parts.minutes)}:${pad(parts.seconds)} kvar`);
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function weatherIcon(code) {
  if (code === 0) return "☀";
  if ([1, 2].includes(code)) return "🌤";
  if (code === 3) return "☁";
  if ([51, 53, 55, 56, 57].includes(code)) return "🌦";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "🌧";
  if ([95, 96, 99].includes(code)) return "⛈";
  return "☁";
}

function weatherName(code) {
  if (code === 0) return "Sol";
  if ([1, 2].includes(code)) return "Sol/moln";
  if (code === 3) return "Moln";
  if ([51, 53, 55, 56, 57].includes(code)) return "Dugg";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regn";
  if ([95, 96, 99].includes(code)) return "Åska";
  return "Väder";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

document.querySelectorAll("[data-page]").forEach((button) => button.addEventListener("click", () => {
  state.page = button.dataset.page;
  if (state.page === "party") state.section = "today";
  galleryIndex = null;
  saveState();
  renderAll();
}));

document.querySelectorAll("[data-section]").forEach((button) => button.addEventListener("click", () => {
  state.section = button.dataset.section;
  galleryIndex = null;
  saveState();
  renderAll();
}));

document.querySelector("#login-form").addEventListener("submit", (event) => {
  event.preventDefault();
  if (state.profile) return;
  const name = normalizeProfileName(document.querySelector("#login-name").value);
  if (!name) {
    showToast("Skriv ditt namn först");
    return;
  }
  state.profile = name;
  state.adminMode = false;
  if (Date.now() < EVENT_START.getTime()) state.page = "prep";
  activeProfile();
  showToast(`Inloggad som ${state.profile}`);
  saveState();
  renderAll();
});

document.querySelector("#profile-button").addEventListener("click", () => {
  clearTimeout(profileClickTimer);
  profileClickTimer = setTimeout(() => {
    document.querySelector("#profile-dialog").showModal();
  }, 220);
});
document.querySelector("#profile-button").addEventListener("dblclick", () => {
  clearTimeout(profileClickTimer);
  if (!state.profile) return;
  document.querySelector("#profile-dialog")?.close();
  state.page = "prep";
  galleryIndex = null;
  galleryMotion = "open";
  saveState();
  renderAll();
});
document.querySelector("#countdown-ring")?.addEventListener("dblclick", (event) => {
  event.preventDefault();
  openPartyForTest();
});
document.querySelector("[data-admin-mode]").addEventListener("click", () => {
  if (!state.adminMode) return;
  state.adminMode = !state.adminMode;
  showToast("Admin mode av");
  saveState();
  document.querySelector("#profile-dialog").close();
  renderAll();
});
document.querySelector("[data-admin-code]").addEventListener("click", () => {
  const input = document.querySelector("#admin-code-input");
  if (input.value.trim() !== "0202") {
    showToast("Fel adminkod");
    input.select();
    return;
  }
  state.adminMode = true;
  input.value = "";
  showToast("Admin mode på");
  saveState();
  renderAll();
});
document.querySelector("#admin-code-input").addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  document.querySelector("[data-admin-code]").click();
});
document.querySelector("[data-admin-login]").addEventListener("click", () => {
  if (!isAdmin()) return;
  const name = normalizeProfileName(document.querySelector("#admin-name-input").value);
  if (!name) return;
  const oldName = state.profile;
  if (name !== oldName && allParticipants().includes(name)) {
    showToast("Namnet finns redan");
    return;
  }
  renameProfile(oldName, name);
  activeProfile();
  showToast(oldName === name ? "Namnet är oförändrat" : `Bytte namn till ${name}`);
  saveState();
  document.querySelector("#profile-dialog").close();
  renderAll();
});
document.querySelector("#profile-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-profile]");
  if (!button) return;
  state.profile = button.dataset.profile;
  activeProfile();
  showToast(`Profil bytt till ${state.profile}`);
  saveState();
  document.querySelector("#profile-dialog").close();
  renderAll();
});

document.addEventListener("keydown", (event) => {
  if (state.section !== "photos" || galleryIndex === null) return;
  if (event.key === "Escape") {
    galleryIndex = null;
    galleryMotion = "open";
    renderAll();
  }
  if (event.key === "ArrowLeft") moveGallery(-1);
  if (event.key === "ArrowRight") moveGallery(1);
});

function showToast(message) {
  const toast = document.querySelector("#toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1600);
}

async function startApp() {
  renderAll();
  await loadRemoteState();
  subscribeRemoteState();
  renderAll();
  loadWeather();
  loadWorldCupMatch();
  setInterval(renderCountdown, 1000);
}

startApp();
