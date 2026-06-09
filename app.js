const EVENT_START = new Date("2026-06-19T12:00:00+02:00");
const BEFORE_VIDEO_OPEN = new Date("2026-06-19T00:00:00+02:00");
const BEFORE_VIDEO_CLOSE = new Date("2026-06-19T11:00:00+02:00");
const AFTER_VIDEO_OPEN = new Date("2026-06-19T20:00:00+02:00");
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
  "schedule",
  "content",
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
let lastProfileTap = 0;
let lastCountdownTap = 0;
let lastLoginTap = 0;

const snapsSongs = {
  sv: [
    {
      id: "sill-och-sol",
      title: "Sill och sol",
      melody: "Melodi: Helan går",
      text: ["Sill och sol, nu lyfter vi glaset.", "Potatisen ler, och kransen sitter snett.", "En liten skål, sen tillbaka till kalaset.", "Midsommar nu, det här blir helt perfekt."],
    },
    {
      id: "badbryggan",
      title: "Badbryggan",
      melody: "Melodi: Små grodorna",
      text: ["Nu går vi ut mot bryggan, hurra hurra hurra.", "Men först en liten nubbe, så modet kan bli bra.", "Vi doppar bara tårna, sen säger någon nej.", "Och alla ropar skåla, kom igen nu, häng med mig."],
    },
    {
      id: "krans-paniken",
      title: "Kranspaniken",
      melody: "Melodi: Imse vimse spindel",
      text: ["Kransen tappas snett ner i midsommargräset.", "Någon hittar blommor, någon hittar glas.", "Upp går lilla snapsen, ner går hela väsendet.", "Sen står vi där och skrattar i vårt sommarkalas."],
    },
  ],
};

const guests = ["Max", "Mathilda", "Jesper", "Felipe", "Julia", "Sofia", "Viktor", "Lisa"];

const sectionMeta = {
  today: ["Start", "Midsommaröversikt"],
  games: ["Lekar", "Dina tävlingar"],
  score: ["Poäng", "Poängställning"],
  photos: ["Bilder", "Galleri"],
  pentathlon: ["5-kamp", "Lagpoäng"],
  match: ["Match", "VM-matchen"],
};

const seed = {
  page: "prep",
  section: "today",
  profile: "",
  adminMode: false,
  adminOwner: "",
  adminEdit: "",
  game: "wheel",
  snapsLang: "sv",
  activeSnapId: "",
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
  schedule: [],
  content: {},
};

const profileSeed = {
  points: 0,
  avatarUrl: "",
  bingoHits: [],
  bingoProofs: {},
  bingoRewards: {},
  votes: {},
  voteDeck: [],
  wheelResult: "Snurra för kvällens twist.",
  missions: [],
  activeMission: null,
  beforeAfter: {
    before: { video: "", completedAt: "" },
    after: { video: "", completedAt: "" },
  },
};

const timeline = [
  ["12:00", "Lunch"],
  ["15:00", "Kransar / bad"],
  ["18:30", "Middag"],
  ["Lör", "VM-match"],
  ["Lör", "5-kamp"],
  ["Kväll", "Poängfinal"],
];

const eventSchedule = [
  { at: "2026-06-19T12:00:00+02:00", time: "12:00", title: "Lunch", detail: "Sill, potatis, kall dryck", color: "yellow" },
  { at: "2026-06-19T15:00:00+02:00", time: "15:00", title: "Kransar / Bad", detail: "Kransar, brygga och första leken", color: "green" },
  { at: "2026-06-19T18:30:00+02:00", time: "18:30", title: "Middag", detail: "Grill, snapsvisor och quiz", color: "red" },
  { at: "2026-06-20T19:00:00+02:00", time: "Lör", title: "VM-match", detail: "Sverige - Netherlands", color: "blue" },
  { at: "2026-06-20T20:45:00+02:00", time: "Lör", title: "5-kamp", detail: "Laggrenar och finalryck", color: "green" },
  { at: "2026-06-20T22:30:00+02:00", time: "Kväll", title: "Poängfinal", detail: "Rättning, vinnare och pris", color: "red" },
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

function defaultSchedule() {
  return eventSchedule.map((item, index) => ({ id: `event-${index + 1}`, ...item }));
}

function ensureEditableContent() {
  state.schedule = normalizeSchedule(state.schedule);
  state.content = state.content && typeof state.content === "object" ? state.content : {};
  if (!Array.isArray(state.content.missions) || !state.content.missions.length) state.content.missions = [...missionPool];
  if (!Array.isArray(state.content.bingo) || !state.content.bingo.length) state.content.bingo = [...bingoPool];
  if (!Array.isArray(state.content.voteQuestions) || !state.content.voteQuestions.length) state.content.voteQuestions = [...voteQuestions];
}

function normalizeSchedule(schedule) {
  const items = Array.isArray(schedule) && schedule.length ? schedule : defaultSchedule();
  return items
    .map((item, index) => {
      const date = item.date || isoDatePart(item.at) || "2026-06-19";
      const time = item.time && /^\d{2}:\d{2}$/.test(item.time) ? item.time : timePart(item.at) || "12:00";
      const at = `${date}T${time}:00+02:00`;
      return {
        id: item.id || `event-${Date.now()}-${index}`,
        at,
        time,
        title: item.title || "Ny hÃ¥llpunkt",
        detail: item.detail || "",
        color: item.color || ["yellow", "green", "red", "blue"][index % 4],
      };
    })
    .sort((a, b) => new Date(a.at) - new Date(b.at));
}

function editableSchedule() {
  ensureEditableContent();
  return state.schedule;
}

function editableMissions() {
  ensureEditableContent();
  return state.content.missions;
}

function editableBingo() {
  ensureEditableContent();
  return state.content.bingo;
}

function editableVoteQuestions() {
  ensureEditableContent();
  return state.content.voteQuestions;
}

function isoDatePart(value) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function timePart(value) {
  const match = String(value || "").match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

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
  profile.voteDeck = shuffle(editableVoteQuestions()).slice(0, 4);
  profile.bingo = shuffle(editableBingo()).slice(0, 9);
  profile.missions = getMissionsFor(name);
  return profile;
}

function migrateProfile(name, profile) {
  if (!profile.avatarUrl) profile.avatarUrl = "";
  if (!profile.beforeAfter) profile.beforeAfter = structuredClone(profileSeed.beforeAfter);
  if (!profile.beforeAfter.before) profile.beforeAfter.before = { video: "", completedAt: "" };
  if (!profile.beforeAfter.after) profile.beforeAfter.after = { video: "", completedAt: "" };
  if (!Array.isArray(profile.missions) || !profile.missions.length) profile.missions = getMissionsFor(name);
  if (!profile.bingoProofs) profile.bingoProofs = {};
  if (!profile.bingoRewards) profile.bingoRewards = {};
  if (!Array.isArray(profile.bingoHits)) profile.bingoHits = [];
  if (!Array.isArray(profile.bingo) || !profile.bingo.length) profile.bingo = shuffle(editableBingo()).slice(0, 9);
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
  const source = editableMissions();
  const start = source.length >= guestIndex * 4 + 4 ? guestIndex * 4 : 0;
  return source.slice(start, start + 4).map((text, index) => ({
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
  ensureEditableContent();
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
  return state.adminMode === true && state.adminOwner === "Max" && canUseAdmin();
}

function canUseAdmin() {
  return state.profile?.toLowerCase() === "max";
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

function deleteProfile(name) {
  if (!isAdmin() || !name || name === "Max") return false;
  state.nameOverrides = state.nameOverrides || {};
  Object.entries(state.nameOverrides).forEach(([originalName, displayName]) => {
    if (displayName === name) delete state.nameOverrides[originalName];
  });
  delete state.profiles[name];
  delete state.rsvp[name];
  delete state.matchVotes[name];
  if (state.profile === name) {
    state.profile = "Max";
    activeProfile();
  }
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
  const profileAvatar = document.querySelector("#profile-avatar");
  const profileInitial = document.querySelector("#profile-initial");
  if (profileAvatar && profileInitial) {
    profileAvatar.hidden = !profile?.avatarUrl;
    profileInitial.hidden = !!profile?.avatarUrl;
    if (profile?.avatarUrl) profileAvatar.src = profile.avatarUrl;
  }
  setText("dialog-profile-name", profile ? `${state.profile} · ${profile.points} p` : "Ingen vald");
  document.querySelector("#profile-button").disabled = false;
  document.querySelector("#profile-grid").innerHTML = allParticipants()
    .map((name) => isAdmin()
      ? `<div class="profile-manage-row"><button class="${name === state.profile ? "is-selected" : ""}" value="${escapeHtml(name)}" type="button" data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button><button class="profile-delete-button" type="button" data-delete-profile="${escapeHtml(name)}" aria-label="Radera ${escapeHtml(name)}" ${name === "Max" ? "disabled" : ""}>×</button></div>`
      : `<button class="${name === state.profile ? "is-selected" : ""}" value="${escapeHtml(name)}" type="button" data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
  const adminInput = document.querySelector("#admin-name-input");
  if (adminInput && (isAdmin() || !adminInput.value)) adminInput.value = state.profile || "";
  if (adminInput) adminInput.disabled = !isAdmin();
  document.querySelector("[data-admin-login]").disabled = !isAdmin();
  document.querySelector(".admin-name-field").hidden = !canUseAdmin() || !isAdmin();
  document.querySelector("#current-profile-card").hidden = !canUseAdmin();
  document.querySelector("#profile-grid").hidden = false;
  document.querySelector("#admin-code-row").hidden = !canUseAdmin() || isAdmin();
  document.querySelector("[data-admin-mode]").hidden = !isAdmin();
  document.querySelector("[data-admin-mode]").textContent = "Lämna admin mode";
  setText("profile-dialog-copy", isAdmin() ? "Admin mode är aktivt. Du kan byta profil, döpa om aktiv person eller radera testprofiler." : "Byt profil för test.");
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
  setText("countdown-time", `${parts.days === 1 ? "dag" : "dagar"} · ${pad(parts.hours)} tim ${pad(parts.minutes)} min ${pad(parts.seconds)} sek`);

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
  if (state.section !== "games" || state.game !== "snaps") state.activeSnapId = "";
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
  const next = getNextEvent();
  const schedule = todaysSchedule();
  return `<div class="dashboard-grid">
    <article class="dash-card dash-card--wide next-activity-card">
      <div class="next-activity-top">
        <div class="next-activity-icon">◷</div>
        <span>Nästa aktivitet</span>
      </div>
      <div class="next-activity-main">
        <strong>${escapeHtml(next.time)}</strong>
        <div>
          <h3>${escapeHtml(next.title)}</h3>
          <p>${escapeHtml(next.detail)}</p>
        </div>
      </div>
      <small>${escapeHtml(next.relative)}</small>
    </article>
    <article class="dash-card dash-card--wide schedule-card">
      <div class="card-title-row"><span>Dagens schema</span>${isAdmin() ? `<button class="inline-admin-button" type="button" data-admin-edit="schedule">Redigera</button>` : ""}</div>
      <div class="timeline-mini timeline-mini--rich">${schedule.map((item) => `<i class="dot dot--${escapeHtml(item.color)}"></i><b>${escapeHtml(item.time)}</b><span>${escapeHtml(item.title)}</span>`).join("") || `<p class="hint">Inget schema f&ouml;r dagen &auml;n.</p>`}</div>
      ${isAdmin() ? renderScheduleEditor() : ""}
    </article>
    <article class="dash-card dash-card--wide"><span>Poängställning</span>${renderScoreMini()}</article>
    <article class="dash-card dash-card--wide start-weather-card"><span>Väder</span>${renderWeatherMini()}</article>
    <article class="dash-card dash-card--wide activity-feed-card"><span>Senaste h&auml;ndelser</span>${renderActivityFeed()}</article>
  </div>`;
}

function getNextEvent() {
  const now = new Date();
  const schedule = editableSchedule();
  const upcoming = schedule.find((item) => new Date(item.at) >= now) || schedule[schedule.length - 1] || defaultSchedule()[0];
  return { ...upcoming, relative: relativeToEvent(upcoming.at) };
}

function scheduleDayKey(date = new Date()) {
  const schedule = editableSchedule();
  const today = localDateKey(date);
  if (schedule.some((item) => localDateKey(new Date(item.at)) === today)) return today;
  const next = schedule.find((item) => new Date(item.at) >= date) || schedule[0];
  return next ? localDateKey(new Date(next.at)) : today;
}

function todaysSchedule() {
  const key = scheduleDayKey();
  return editableSchedule().filter((item) => localDateKey(new Date(item.at)) === key);
}

function localDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "2026-06-19";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function renderActivityFeed() {
  const items = getActivityFeedItems();
  if (!items.length) return `<div class="activity-feed"><p class="hint">Inga h&auml;ndelser &auml;n. N&auml;r n&aring;gon klarar uppdrag, bingo eller tar ledningen syns det h&auml;r.</p></div>`;
  return `<div class="activity-feed">${items.map((item) => `<article class="activity-feed-item activity-feed-item--${escapeHtml(item.kind)}">
    <i>${escapeHtml(item.icon)}</i>
    <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.detail)}</span></div>
    <time>${escapeHtml(item.time)}</time>
  </article>`).join("")}</div>`;
}

function getActivityFeedItems() {
  const items = [];
  allParticipants().forEach((name) => {
    const profile = state.profiles[name];
    if (!profile) return;
    (profile.missions || []).forEach((mission) => {
      if (!mission.completedAt) return;
      items.push({
        kind: "mission",
        icon: "!",
        at: mission.completedAt,
        title: `${name} gjorde ett uppdrag`,
        detail: `+${mission.points || missionPointsFor(mission.text)} p`,
      });
    });
    Object.entries(profile.bingoProofs || {}).forEach(([item, proof]) => {
      if (!proof?.completedAt) return;
      items.push({
        kind: "bingo",
        icon: "#",
        at: proof.completedAt,
        title: `${name} fick bingo`,
        detail: item,
      });
    });
    ["before", "after"].forEach((slot) => {
      const video = profile.beforeAfter?.[slot];
      if (!video?.completedAt) return;
      items.push({
        kind: "video",
        icon: "▶",
        at: video.completedAt,
        title: `${name} sparade ${slot === "before" ? "f\u00f6re" : "efter"}-video`,
        detail: "F\u00f6re / efter",
      });
    });
  });
  const leaders = getPersonalLeaders();
  if (leaders[0]?.points > 0) {
    items.push({
      kind: "lead",
      icon: "1",
      at: "1970-01-01T00:00:00.000Z",
      title: `${leaders[0].name} leder`,
      detail: `${leaders[0].points} p totalt`,
    });
  }
  return items
    .sort((a, b) => new Date(b.at) - new Date(a.at))
    .slice(0, 5)
    .map((item) => ({ ...item, time: item.kind === "lead" ? "leder" : formatPhotoTime(item.at) }));
}

function renderScheduleEditor() {
  if (state.adminEdit !== "schedule") return "";
  const day = scheduleDayKey();
  const rows = todaysSchedule();
  return `<div class="admin-editor schedule-editor">
    <div class="admin-editor-head"><strong>Redigera schema</strong><small>${escapeHtml(day)}</small></div>
    <div class="admin-table admin-table--schedule">
      ${rows.map((item) => `<div class="admin-row" data-schedule-row="${escapeHtml(item.id)}">
        <input type="time" value="${escapeHtml(item.time)}" data-schedule-field="time" data-schedule-id="${escapeHtml(item.id)}" aria-label="Tid" />
        <input type="text" value="${escapeHtml(item.title)}" data-schedule-field="title" data-schedule-id="${escapeHtml(item.id)}" aria-label="Titel" />
        <input type="text" value="${escapeHtml(item.detail)}" data-schedule-field="detail" data-schedule-id="${escapeHtml(item.id)}" aria-label="Detalj" />
        <button class="admin-delete-button" type="button" data-delete-schedule="${escapeHtml(item.id)}" aria-label="Radera hÃ¥llpunkt">&times;</button>
      </div>`).join("")}
    </div>
    <button class="admin-add-button" type="button" data-add-schedule>LÃ¤gg till hÃ¥llpunkt</button>
  </div>`;
}

function relativeToEvent(value) {
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Pågår eller har precis varit";
  const minutes = Math.round(diff / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `Om ${days} d ${hours} h`;
  if (hours > 0) return `Om ${hours} t ${mins} min`;
  return `Om ${mins} min`;
}

function renderSnapsGame() {
  const songs = snapsSongs.sv;
  const activeSong = songs.find((song) => song.id === state.activeSnapId);
  return `<article class="game-card snaps-card">
    <div class="snaps-card__head">
      <div><span>Snapsvisor</span><strong>Svenska snapsvisor</strong></div>
    </div>
    <div class="snaps-list">
      ${songs.map((song) => `<button type="button" data-open-snap="${escapeHtml(song.id)}"><strong>${escapeHtml(song.title)}</strong><small>${escapeHtml(song.melody)}</small></button>`).join("")}
    </div>
    ${activeSong ? renderSnapViewer(activeSong) : ""}
  </article>`;
}

function renderSnapViewer(song) {
  return `<div class="snap-viewer" data-close-snaps>
    <article class="snap-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(song.title)}">
      <span>Snapsvisa</span>
      <h3>${escapeHtml(song.title)}</h3>
      <p class="snap-melody">${escapeHtml(song.melody)}</p>
      <div class="snap-lyrics">${song.text.map((line) => `<p>${escapeHtml(line)}</p>`).join("")}</div>
    </article>
  </div>`;
}

function renderScoreMini() {
  return `<div class="score-mini-list">${getPersonalLeaders()
    .slice(0, 4)
    .map((row) => `<p><strong>${escapeHtml(row.name)}</strong><span>${row.points} p</span></p>`)
    .join("")}</div>`;
}

function renderWeatherMini() {
  const days = getWeatherDays();
  const forecast = days.length ? days : ["Fre", "Lör", "Sön"].map((label) => ({ label, icon: "☁", summary: "Väder", detail: "hämtas" }));
  return `<div class="weather-mini-list">${forecast.map((day) => `
    <section>
      <b>${escapeHtml(day.label)}</b>
      <strong><span>${day.icon}</span>${escapeHtml(day.summary)}</strong>
      <small>${escapeHtml(day.detail)}</small>
    </section>`).join("")}</div>`;
}

function renderMatch() {
  const apiData = state.matchApiData;
  const vote = state.matchVotes[state.profile] || {};
  const result = normalizeMatchResult(vote);
  const outcome = matchOutcome(result);
  return `<div class="match-layout match-layout--compact">
    <article class="game-card match-hero match-summary-card">
      <span class="micro-label">Nästa match</span>
      <div class="match-flags"><strong>🇸🇪</strong><span>vs</span><strong>🇳🇱</strong></div>
      <h3>Sverige vs Netherlands</h3>
      <p>${escapeHtml(apiData?.detail || `${matchFallback.selected.date} · ${matchFallback.selected.time} · ${matchFallback.selected.venue}`)}</p>
    </article>
    <article class="game-card match-list-card">
      <span class="micro-label">Våra matcher</span>
      <div class="match-list">
        ${matchSchedule.map((match) => `<div class="match-row"><span>${escapeHtml(match.date)}</span><strong>Sverige - ${escapeHtml(match.opponent)}</strong><small>${escapeHtml(match.note)}</small></div>`).join("")}
      </div>
    </article>
    <article class="game-card match-vote-card">
      <span class="micro-label">Tippa resultat</span>
      <div class="score-inputs">
        <label><span>SWE</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.home)}" data-match-score="home" /></label>
        <b>-</b>
        <label><span>NED</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.away)}" data-match-score="away" /></label>
      </div>
      <p class="match-outcome">${escapeHtml(outcome)}</p>
      <button class="pill-button match-save-button" type="button" data-match-save>Spara tipp</button>
      <p class="hint">Rösta innan matchen.</p>
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

function matchOutcome(result) {
  if (result.home === "" || result.away === "") return "Fyll i resultat så räknas vinnare automatiskt.";
  const home = Number(result.home);
  const away = Number(result.away);
  if (Number.isNaN(home) || Number.isNaN(away)) return "Fyll i resultat så räknas vinnare automatiskt.";
  if (home > away) return `Sverige vinner · ${home}-${away}`;
  if (home < away) return `Netherlands vinner · ${home}-${away}`;
  return `Oavgjort · ${home}-${away}`;
}

function renderGames() {
  const profile = activeProfile();
  if (!profile) return `<article class="game-card"><h3>Välj profil först</h3><p>Då får du egen bingo och egna uppdrag.</p></article>`;
  return `<div class="game-picker">
    ${renderGamePickerButton("wheel", "wheel", "Hjul")}
    ${renderGamePickerButton("vote", "vote", "Pekleken")}
    ${renderGamePickerButton("snaps", "snaps", "Snaps")}
    ${renderGamePickerButton("mission", "mission", "Uppdrag")}
    ${renderGamePickerButton("bingo", "bingo", "Bingo")}
    ${renderGamePickerButton("beforeAfter", "people", "Före/efter")}
  </div>
  ${state.game === "wheel" ? renderWheel(profile) : ""}
  ${state.game === "vote" ? renderVote(profile) : ""}
  ${state.game === "snaps" ? renderSnapsGame() : ""}
  ${state.game === "mission" ? renderMission(profile) : ""}
  ${state.game === "bingo" ? renderBingo(profile) : ""}
  ${state.game === "beforeAfter" ? renderBeforeAfter(profile) : ""}
  ${isAdmin() ? renderGameAdminEditor() : ""}`;
}

function renderGamePickerButton(game, icon, label) {
  return `<button class="game-menu-button ${state.game === game ? "is-active" : ""}" type="button" data-game="${game}"><span class="game-menu-icon game-menu-icon--${icon}" aria-hidden="true">${gameIcon(icon)}</span><strong>${label}</strong></button>`;
}

function gameIcon(icon) {
  const icons = {
    wheel: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="22"/><circle cx="32" cy="32" r="8"/><path d="M32 10v12M32 42v12M10 32h12M42 32h12M16 16l9 9M39 39l9 9M48 16l-9 9M25 39l-9 9"/></svg>`,
    vote: `<svg viewBox="0 0 64 64"><path d="M12 18c0-5 4-9 9-9h22c5 0 9 4 9 9v14c0 5-4 9-9 9H30L17 53v-12h4c-5 0-9-4-9-9V18Z"/><circle cx="25" cy="25" r="3"/><circle cx="32" cy="25" r="3"/><circle cx="39" cy="25" r="3"/></svg>`,
    snaps: `<svg viewBox="0 0 64 64"><path d="M18 12h28l-5 32H23L18 12Z"/><path d="M24 44h16l4 8H20l4-8Z"/><path d="M21 24h22"/></svg>`,
    mission: `<svg viewBox="0 0 64 64"><path d="M18 54V10"/><path d="M18 12h28l-5 11 5 11H18"/><path d="M18 34h20"/></svg>`,
    bingo: `<svg viewBox="0 0 64 64"><path d="M12 12h40v40H12z"/><path d="M25 12v40M39 12v40M12 25h40M12 39h40"/></svg>`,
    people: `<svg viewBox="0 0 64 64"><circle cx="24" cy="21" r="9"/><circle cx="43" cy="24" r="7"/><path d="M9 52c2-12 9-19 15-19s13 7 15 19"/><path d="M33 52c2-9 6-14 11-14 6 0 10 5 12 14"/></svg>`,
  };
  return icons[icon] || icons.wheel;
}

function renderWheel(profile) {
  return `<article class="wheel-card"><div class="wheel" id="wheel">${escapeHtml(profile.wheelResult)}</div><button class="spin-button" type="button" data-spin>Snurra</button><p class="hint">Bonusar delas ut av appen. Inga manuella poäng.</p></article>`;
}

function renderVote(profile) {
  const question = profile.voteDeck[0] || editableVoteQuestions()[0];
  return `<article class="game-card"><span class="micro-label">Din fråga</span><h3>Vem ${escapeHtml(question)}</h3><div class="vote-options">${allParticipants().filter((name) => name !== state.profile).map((name) => `<button class="vote-button ${profile.votes[question] === name ? "is-selected" : ""}" type="button" data-vote="${escapeHtml(question)}" data-target="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div><p class="hint">${profile.votes[question] ? `Ditt svar: ${escapeHtml(profile.votes[question])}` : "Spara svar nu. Max rättar sista dagen."}</p><button class="pill-button" type="button" data-next-personal-question>Nästa egen fråga</button></article>`;
}

function renderGameAdminEditor() {
  const config = {
    vote: { key: "voteQuestions", title: "Pekleken", applyLabel: "Dela ut nya fr&aring;gor" },
    mission: { key: "missions", title: "Uppdrag", applyLabel: "Dela ut nya uppdrag" },
    bingo: { key: "bingo", title: "Bingo", applyLabel: "Slumpa nya brickor" },
  }[state.game];
  if (!config) {
    return `<article class="admin-editor game-content-editor">
      <div class="admin-editor-head"><strong>Admin</strong><small>Inget textinneh&aring;ll f&ouml;r den h&auml;r leken.</small></div>
    </article>`;
  }
  const rows = state.content?.[config.key] || [];
  return `<article class="admin-editor game-content-editor">
    <div class="admin-editor-head"><strong>Redigera ${escapeHtml(config.title)}</strong><small>En rad per sak</small></div>
    <textarea class="admin-textarea" data-content-editor="${escapeHtml(config.key)}">${escapeHtml(rows.join("\n"))}</textarea>
    <div class="admin-actions">
      <button class="admin-add-button" type="button" data-save-content="${escapeHtml(config.key)}">Spara lista</button>
      <button class="admin-secondary-button" type="button" data-apply-content="${escapeHtml(config.key)}">${config.applyLabel}</button>
    </div>
  </article>`;
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
    <article class="mission-card mission-card--compact ${mission.photo ? "is-complete" : ""}">
      <div class="mission-copy"><h3><span class="mission-points">${mission.points || missionPointsFor(mission.text, index)} p</span><span>${escapeHtml(mission.text)}</span></h3></div>
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

function renderBeforeAfter(profile) {
  const before = profile.beforeAfter?.before || {};
  const after = profile.beforeAfter?.after || {};
  const beforeState = beforeAfterSlotState("before", before, before);
  const afterState = beforeAfterSlotState("after", after, before);
  return `<article class="game-card before-after-card">
    <span class="micro-label">Videochallenge</span>
    <h3>Före / efter</h3>
    <p class="hint">Före-video fram till 11:00. Efter-video öppnar 20:00.</p>
    <div class="before-after-grid">
      ${renderBeforeAfterSlot("before", "Före", before, beforeState)}
      ${renderBeforeAfterSlot("after", "Efter", after, afterState)}
    </div>
  </article>`;
}

function beforeAfterSlotState(slot, item, beforeItem) {
  const now = new Date();
  if (item.video) return { disabled: true, message: "Klar" };
  if (slot === "before" && now < BEFORE_VIDEO_OPEN) return { disabled: true, message: "Öppnar på midsommardagen." };
  if (slot === "before" && now >= BEFORE_VIDEO_CLOSE) return { disabled: true, message: "Före stängde 11:00." };
  if (slot === "after" && !beforeItem?.video) return { disabled: true, message: "Ta före-videon först." };
  if (slot === "after" && now < AFTER_VIDEO_OPEN) return { disabled: true, message: "Öppnar efter 20:00." };
  return { disabled: false, message: "Ingen video än." };
}

function renderBeforeAfterSlot(slot, label, item, slotState) {
  return `<section class="before-after-slot ${item.video ? "is-done" : ""} ${slotState.disabled && !item.video ? "is-locked" : ""}">
    <strong>${label}</strong>
    ${item.video ? `<video src="${item.video}" controls playsinline preload="metadata"></video><small>${escapeHtml(formatPhotoTime(item.completedAt))}</small>` : `<p class="hint">${escapeHtml(slotState.message)}</p>`}
    <button class="upload-button" type="button" data-before-after-start="${slot}" ${slotState.disabled || item.video ? "disabled" : ""}>${item.video ? "Klar" : "Ta video"}</button>
    <input class="capture-input" type="file" accept="video/*" capture="user" data-before-after-upload="${slot}" />
  </section>`;
}

function renderPersonalScore() {
  const rows = allParticipants().map((name) => {
    const profile = state.profiles[name] || makeProfile(name);
    return { name, points: profile.points };
  }).sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "sv"));
  return `<div class="scoreboard scoreboard--leaderboard">${rows.map((row, index) => `
    <article class="score-row score-row--rank rank-${index + 1} ${row.name === state.profile ? "is-self" : ""}">
      <span class="rank-badge">${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <span class="score-points">${row.points} p</span>
    </article>`).join("")}${isAdmin() ? renderVoteAdmin() : ""}</div>`;
}

function renderVoteAdmin() {
  const participants = allParticipants();
  const answeredQuestions = [...new Set(participants.flatMap((name) => Object.keys((state.profiles[name] || {}).votes || {})))];
  if (!answeredQuestions.length) return "";
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
      .map((mission) => ({ name, text: mission.text, photo: mission.photo, type: "Uppdrag", takenAt: mission.completedAt }));
  });
  const bingoPhotos = allParticipants().flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.bingoProofs) return [];
    return Object.entries(profile.bingoProofs)
      .filter(([, proof]) => proof?.photo)
      .map(([text, proof]) => ({ name, text, photo: proof.photo, type: "Bingo", takenAt: proof.completedAt }));
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
      <div><strong>${escapeHtml(item.name)} · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.text)}</span><small>${escapeHtml(formatPhotoTime(item.takenAt))}</small></div>
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
      <figcaption><strong>${escapeHtml(item.name)} · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.text)}</span><small>${position} · ${escapeHtml(formatPhotoTime(item.takenAt))}</small></figcaption>
    </figure>
    <button class="photo-nav photo-nav--next" type="button" data-gallery-next aria-label="Nästa bild">›</button>
  </div>`;
}

function renderPentathlon() {
  const totals = state.teamScores.map((team, teamIndex) => ({
    team: team.team,
    score: state.pentathlon.reduce((sum, event) => sum + event.scores[teamIndex], 0),
  }));
  return `<div class="score-mini pentathlon-totals">${totals.map((row) => `<article><strong>${escapeHtml(row.team)}</strong><span>${row.score} p</span></article>`).join("")}</div><div class="pentathlon-list">${state.pentathlon.map((event, eventIndex) => {
    const status = pentathlonStatus(eventIndex);
    return `<article class="game-card pentathlon-event pentathlon-event--${status.key}">
      <div class="pentathlon-event__head"><span class="micro-label">${eventIndex + 1}/5</span><span class="event-status">${escapeHtml(status.label)}</span></div>
      <h3>${escapeHtml(event.name)}</h3>
      <div class="mini-score-row">${state.teamScores.map((team, teamIndex) => `<button type="button" data-five-event="${eventIndex}" data-five-team="${teamIndex}">${escapeHtml(team.team)} +1</button>`).join("")}</div>
    </article>`;
  }).join("")}</div>${isAdmin() ? renderPentathlonEditor() : ""}`;
}

function renderPentathlonEditor() {
  return `<article class="admin-editor pentathlon-editor">
    <div class="admin-editor-head"><strong>Redigera 5-kamp</strong><small>Lag och grenar</small></div>
    <div class="admin-table admin-table--teams">
      ${state.teamScores.map((team, index) => `<div class="admin-row">
        <span>Lag ${index + 1}</span>
        <input type="text" value="${escapeHtml(team.team)}" data-team-name="${index}" aria-label="Lagnamn ${index + 1}" />
      </div>`).join("")}
    </div>
    <div class="admin-table admin-table--five">
      ${state.pentathlon.map((event, index) => `<div class="admin-row">
        <span>${index + 1}</span>
        <input type="text" value="${escapeHtml(event.name)}" data-five-name="${index}" aria-label="Gren ${index + 1}" />
        <button class="admin-delete-button" type="button" data-delete-five="${index}" aria-label="Radera gren">&times;</button>
      </div>`).join("")}
    </div>
    <button class="admin-add-button" type="button" data-add-five>L&auml;gg till gren</button>
  </article>`;
}

function pentathlonStatus(eventIndex) {
  const firstOpen = state.pentathlon.findIndex((event) => event.scores.reduce((sum, score) => sum + score, 0) === 0);
  if (firstOpen === -1 || eventIndex < firstOpen) return { key: "done", label: "Klar" };
  if (eventIndex === firstOpen) return { key: "live", label: "Pågår" };
  return { key: "soon", label: "Kommer" };
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
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/quicktime") return "mov";
  if (mime === "video/webm") return "webm";
  if (String(mime).startsWith("video/")) return "mp4";
  return "jpg";
}

function proofPath(kind, label, extension = "jpg", profileName = state.profile) {
  const safeProfile = (profileName || "guest").toLowerCase();
  const safeLabel = String(label).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "proof";
  return `${safeProfile}/${kind}-${safeLabel}-${Date.now()}.${extension}`;
}

async function uploadProofFile(file, kind, label, options = {}) {
  const shouldCompress = options.compressImage !== false && file.type?.startsWith("image/");
  const compressedBlob = shouldCompress ? await compressProofImage(file) : null;
  const blob = compressedBlob || file;
  const mime = compressedBlob ? "image/jpeg" : (file.type || "application/octet-stream");
  const nameExtension = String(file.name || "").split(".").pop()?.toLowerCase();
  const extension = !compressedBlob && nameExtension && nameExtension.length <= 5 ? nameExtension : extensionForMime(mime);
  const path = proofPath(kind, label, extension, options.profileName);
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

async function uploadProofImage(file, kind, label, options = {}) {
  return uploadProofFile(file, kind, label, { ...options, compressImage: true });
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

async function completeBeforeAfterVideo(input) {
  const file = input.files?.[0];
  if (!file) return;
  const slot = input.dataset.beforeAfterUpload;
  if (!["before", "after"].includes(slot)) return;
  const profile = activeProfile();
  profile.beforeAfter = profile.beforeAfter || structuredClone(profileSeed.beforeAfter);
  if (profile.beforeAfter[slot]?.video) return;
  const slotState = beforeAfterSlotState(slot, profile.beforeAfter[slot], profile.beforeAfter.before);
  if (slotState.disabled) {
    showToast(slotState.message);
    return;
  }
  const video = await uploadProofFile(file, "fore-efter", slot, { compressImage: false });
  if (!video) {
    window.alert("Videon kunde inte laddas upp. Testa igen med en kortare video.");
    return;
  }
  profile.beforeAfter[slot] = { video, completedAt: new Date().toISOString() };
  saveState();
  showToast(slot === "before" ? "Före-videon sparad" : "Efter-videon sparad");
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

  document.querySelectorAll("[data-open-snap]").forEach((button) => button.addEventListener("click", () => {
    state.activeSnapId = button.dataset.openSnap;
    saveState();
    renderAll();
  }));

  document.querySelector("[data-close-snaps]")?.addEventListener("click", (event) => {
    if (event.target !== event.currentTarget) return;
    state.activeSnapId = "";
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-game]").forEach((button) => button.addEventListener("click", () => {
    state.game = button.dataset.game;
    state.adminEdit = "";
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-admin-edit]").forEach((button) => button.addEventListener("click", () => {
    state.adminEdit = state.adminEdit === button.dataset.adminEdit ? "" : button.dataset.adminEdit;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-schedule-field]").forEach((input) => input.addEventListener("change", () => {
    const item = state.schedule.find((eventItem) => eventItem.id === input.dataset.scheduleId);
    if (!item) return;
    const field = input.dataset.scheduleField;
    const value = input.value.trim();
    if (field === "time") {
      const day = localDateKey(new Date(item.at));
      item.time = value || "12:00";
      item.at = `${day}T${item.time}:00+02:00`;
    } else if (["title", "detail"].includes(field)) {
      item[field] = value;
    }
    state.schedule = normalizeSchedule(state.schedule);
    saveState();
    renderAll();
  }));

  document.querySelector("[data-add-schedule]")?.addEventListener("click", () => {
    const day = scheduleDayKey();
    state.schedule.push({
      id: `event-${Date.now()}`,
      at: `${day}T12:00:00+02:00`,
      time: "12:00",
      title: "Ny hÃ¥llpunkt",
      detail: "",
      color: ["yellow", "green", "red", "blue"][state.schedule.length % 4],
    });
    state.schedule = normalizeSchedule(state.schedule);
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-delete-schedule]").forEach((button) => button.addEventListener("click", () => {
    if (!window.confirm("Radera hÃ¥llpunkten?")) return;
    state.schedule = state.schedule.filter((item) => item.id !== button.dataset.deleteSchedule);
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-save-content]").forEach((button) => button.addEventListener("click", () => {
    if (!saveContentList(button.dataset.saveContent)) return;
    showToast("Lista sparad");
    renderAll();
  }));

  document.querySelectorAll("[data-apply-content]").forEach((button) => button.addEventListener("click", () => {
    const key = button.dataset.applyContent;
    if (!saveContentList(key)) return;
    if (!window.confirm("Applicera listan pÃ¥ profilerna? Det kan skriva Ã¶ver personliga uppdrag, brickor eller frÃ¥gor.")) return;
    applyContentList(key);
    saveState();
    showToast("InnehÃ¥ll uppdaterat");
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
    delete vote.oneXtwo;
    state.matchVotes[state.profile] = vote;
    const outcome = document.querySelector(".match-vote-card .match-outcome");
    if (outcome) outcome.textContent = matchOutcome(normalizeMatchResult(vote));
    const hint = document.querySelector(".match-vote-card .hint");
    if (hint) hint.textContent = vote.result ? `Sparat: ${matchOutcome(normalizeMatchResult(vote))}` : "Rösta innan matchen.";
    saveState();
  }));

  document.querySelector("[data-match-save]")?.addEventListener("click", () => {
    const result = normalizeMatchResult(state.matchVotes[state.profile] || {});
    showToast(result.text ? `Tipp sparat: ${matchOutcome(result)}` : "Fyll i resultat först");
  });

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

  document.querySelectorAll("[data-before-after-start]").forEach((button) => button.addEventListener("click", () => {
    document.querySelector(`[data-before-after-upload="${button.dataset.beforeAfterStart}"]`)?.click();
  }));

  document.querySelectorAll("[data-before-after-upload]").forEach((input) => input.addEventListener("change", () => {
    completeBeforeAfterVideo(input);
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

  document.querySelectorAll("[data-team-name]").forEach((input) => input.addEventListener("change", () => {
    const team = state.teamScores[Number(input.dataset.teamName)];
    if (!team) return;
    team.team = input.value.trim() || team.team;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-five-name]").forEach((input) => input.addEventListener("change", () => {
    const eventItem = state.pentathlon[Number(input.dataset.fiveName)];
    if (!eventItem) return;
    eventItem.name = input.value.trim() || eventItem.name;
    saveState();
    renderAll();
  }));

  document.querySelector("[data-add-five]")?.addEventListener("click", () => {
    state.pentathlon.push({ name: "Ny gren", scores: state.teamScores.map(() => 0) });
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-delete-five]").forEach((button) => button.addEventListener("click", () => {
    if (state.pentathlon.length <= 1) {
      showToast("Minst en gren behÃ¶vs");
      return;
    }
    if (!window.confirm("Radera grenen?")) return;
    state.pentathlon.splice(Number(button.dataset.deleteFive), 1);
    saveState();
    renderAll();
  }));
}

function saveContentList(key) {
  ensureEditableContent();
  const textarea = document.querySelector(`[data-content-editor="${key}"]`);
  if (!textarea) return false;
  const rows = textarea.value
    .split(/\n+/)
    .map((row) => row.trim())
    .filter(Boolean);
  if (!rows.length) {
    showToast("Listan kan inte vara tom");
    return false;
  }
  state.content[key] = rows;
  saveState();
  return true;
}

function applyContentList(key) {
  allParticipants().forEach((name) => {
    const profile = state.profiles[name] || makeProfile(name);
    if (key === "missions") {
      profile.missions = getMissionsFor(name);
      profile.activeMission = null;
    }
    if (key === "bingo") {
      profile.bingo = shuffle(editableBingo()).slice(0, 9);
      profile.bingoHits = [];
      profile.bingoProofs = {};
      profile.bingoRewards = {};
    }
    if (key === "voteQuestions") {
      profile.voteDeck = shuffle(editableVoteQuestions()).slice(0, 4);
      profile.votes = {};
    }
    state.profiles[name] = profile;
  });
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
  setText("countdown-time", `${parts.days === 1 ? "dag" : "dagar"} · ${pad(parts.hours)} tim ${pad(parts.minutes)} min ${pad(parts.seconds)} sek`);
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

function formatPhotoTime(value) {
  if (!value) return "Tid saknas";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tid saknas";
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.profile) return;
  const name = normalizeProfileName(document.querySelector("#login-name").value);
  if (!name) {
    showToast("Skriv ditt namn först");
    return;
  }
  const photoInput = document.querySelector("#login-photo");
  const photoFile = photoInput?.files?.[0];
  const existingAvatar = state.profiles?.[name]?.avatarUrl || "";
  if (!photoFile && !existingAvatar) {
    showToast("Ta en profilbild först");
    return;
  }
  const submitButton = event.currentTarget.querySelector("button[type='submit']");
  if (submitButton) submitButton.disabled = true;
  let avatarUrl = existingAvatar;
  if (photoFile) {
    showToast("Laddar upp profilbild...");
    avatarUrl = await uploadProofImage(photoFile, "profile", "avatar", { profileName: name });
    if (!avatarUrl) {
      if (submitButton) submitButton.disabled = false;
      window.alert("Profilbilden kunde inte laddas upp. Testa igen med en vanlig kamerabild.");
      return;
    }
  }
  state.profile = name;
  state.adminMode = false;
  state.adminOwner = "";
  if (Date.now() < EVENT_START.getTime()) state.page = "prep";
  const profile = activeProfile();
  profile.avatarUrl = avatarUrl;
  showToast(`Inloggad som ${state.profile}`);
  saveState();
  if (submitButton) submitButton.disabled = false;
  renderAll();
});

document.querySelector("#login-photo")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  const preview = document.querySelector("#login-photo-preview");
  const label = document.querySelector("#login-photo-label");
  if (!file || !preview) return;
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
  if (label) label.textContent = "Profilbild vald";
});

function returnToPrepFromProfile() {
  clearTimeout(profileClickTimer);
  if (!state.profile) return;
  document.querySelector("#profile-dialog")?.close();
  state.page = "prep";
  galleryIndex = null;
  galleryMotion = "open";
  saveState();
  renderAll();
}

function returnToLoginForTest() {
  clearTimeout(profileClickTimer);
  document.querySelector("#profile-dialog")?.close();
  state.profile = "";
  state.adminMode = false;
  state.adminOwner = "";
  state.page = "prep";
  galleryIndex = null;
  galleryMotion = "open";
  saveState();
  renderAll();
}

function openEventAddressInMaps() {
  const address = "Taltrastvägen 12, Eskilstuna";
  const encodedAddress = encodeURIComponent(address);
  const agent = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(agent)) {
    window.location.href = `maps://?q=${encodedAddress}`;
    setTimeout(() => {
      if (!document.hidden) window.location.href = `https://maps.apple.com/?q=${encodedAddress}`;
    }, 650);
    return;
  }
  if (/Android/i.test(agent)) {
    window.location.href = `geo:0,0?q=${encodedAddress}`;
    setTimeout(() => {
      if (!document.hidden) window.location.href = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    }, 650);
    return;
  }
  window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, "_blank", "noopener");
}

document.querySelector(".prep-location-pin")?.addEventListener("click", openEventAddressInMaps);

function skipLoginForTest() {
  if (state.profile) return;
  state.profile = "Test";
  state.adminMode = false;
  state.adminOwner = "";
  if (Date.now() < EVENT_START.getTime()) state.page = "prep";
  activeProfile();
  showToast("Testläge öppnat");
  saveState();
  renderAll();
}

document.querySelector("#login-screen")?.addEventListener("dblclick", (event) => {
  if (event.target.closest("input, button, label")) return;
  event.preventDefault();
  skipLoginForTest();
});
document.querySelector("#login-screen")?.addEventListener("pointerup", (event) => {
  if (event.pointerType === "mouse") return;
  if (event.target.closest("input, button, label")) return;
  const now = Date.now();
  if (now - lastLoginTap < 420) {
    event.preventDefault();
    lastLoginTap = 0;
    skipLoginForTest();
    return;
  }
  lastLoginTap = now;
});

document.querySelector("#profile-button").addEventListener("click", (event) => {
  const now = Date.now();
  clearTimeout(profileClickTimer);
  if (now - lastProfileTap < 360) {
    event.preventDefault();
    lastProfileTap = 0;
    returnToPrepFromProfile();
    return;
  }
  lastProfileTap = now;
  profileClickTimer = setTimeout(() => {
    document.querySelector("#profile-dialog").showModal();
  }, 260);
});
document.querySelector("#profile-button").addEventListener("dblclick", (event) => {
  event.preventDefault();
  returnToPrepFromProfile();
});
document.querySelector("#countdown-ring")?.addEventListener("dblclick", (event) => {
  event.preventDefault();
  openPartyForTest();
});
document.querySelector("#countdown-ring")?.addEventListener("click", (event) => {
  const now = Date.now();
  if (now - lastCountdownTap < 380) {
    event.preventDefault();
    lastCountdownTap = 0;
    openPartyForTest();
    return;
  }
  lastCountdownTap = now;
});
document.querySelector("[data-admin-mode]").addEventListener("click", () => {
  if (!state.adminMode) return;
  state.adminMode = !state.adminMode;
  state.adminOwner = "";
  showToast("Admin mode av");
  saveState();
  document.querySelector("#profile-dialog").close();
  renderAll();
});
document.querySelector("[data-admin-code]").addEventListener("click", () => {
  const input = document.querySelector("#admin-code-input");
  if (!canUseAdmin()) {
    showToast("Endast Max kan öppna admin");
    return;
  }
  if (input.value.trim() !== "0202") {
    showToast("Fel adminkod");
    input.select();
    return;
  }
  state.adminMode = true;
  state.adminOwner = "Max";
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
  if (oldName === "Max" && name !== "Max") {
    showToast("Max måste heta Max för admin");
    return;
  }
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
  const deleteButton = event.target.closest("[data-delete-profile]");
  if (deleteButton) {
    const name = deleteButton.dataset.deleteProfile;
    if (!window.confirm(`Radera profilen ${name}? Det går inte att ångra.`)) return;
    if (!deleteProfile(name)) return;
    showToast(`Raderade ${name}`);
    saveState();
    renderAll();
    return;
  }
  const button = event.target.closest("[data-profile]");
  if (!button) return;
  state.profile = button.dataset.profile;
  if (!canUseAdmin()) {
    state.adminMode = false;
    state.adminOwner = "";
  }
  activeProfile();
  showToast(`Profil bytt till ${state.profile}`);
  saveState();
  document.querySelector("#profile-dialog").close();
  renderAll();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.activeSnapId) {
    state.activeSnapId = "";
    saveState();
    renderAll();
    return;
  }
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
