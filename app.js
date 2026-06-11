const EVENT_START = new Date("2026-06-19T08:00:00+02:00");
const BEFORE_VIDEO_OPEN = new Date("2026-06-19T00:00:00+02:00");
const BEFORE_VIDEO_CLOSE = new Date("2026-06-19T11:00:00+02:00");
const AFTER_VIDEO_OPEN = new Date("2026-06-19T20:00:00+02:00");
const MATCH_TIP_DEADLINE = new Date("2026-06-20T19:00:00+02:00");
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
  "matchResult",
  "matchAwarded",
  "schedule",
  "content",
  "settings",
  "galleryArchive",
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
let lastLoginTap = 0;
let lastAdminCardTap = 0;
let deferredInstallPrompt = null;
const tripleTapTrackers = {};

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
const ADMIN_PROFILE = "Admin";

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
  adminReturnProfile: "",
  adminEdit: "",
  game: "vote",
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
  matchResult: { home: "", away: "" },
  matchAwarded: false,
  schedule: [],
  content: {},
  settings: {},
  galleryArchive: [],
};

const profileSeed = {
  points: 0,
  avatarUrl: "",
  bingoHits: [],
  bingoProofs: {},
  bingoRewards: {},
  votes: {},
  voteDeck: [],
  quizAnswers: {},
  quizAwarded: {},
  quizIndex: 0,
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

const quizQuestions = [
  {
    question: "Vilket datum infaller midsommarafton alltid pa?",
    options: ["Fredagen mellan 19 och 25 juni", "Alltid 21 juni", "Sista fredagen i juni"],
    answer: 0,
  },
  {
    question: "Vad kallas stangen man dansar kring?",
    options: ["Majstang", "Solstang", "Sommarstang"],
    answer: 0,
  },
  {
    question: "Vilken blomma ar starkt kopplad till midsommar?",
    options: ["Julros", "Prastkrage", "Pasklilja"],
    answer: 1,
  },
  {
    question: "Vad sags man kunna dromma om om man plockar sju sorters blommor?",
    options: ["Sin framtida karlek", "Nasta semester", "Vinnaren i 5-kampen"],
    answer: 0,
  },
  {
    question: "Vilken mat ar vanlig pa ett klassiskt midsommarbord?",
    options: ["Surstromming och tunnbrod", "Sill och farskpotatis", "Kalkon och brysselkal"],
    answer: 1,
  },
  {
    question: "Vilken visa sjungs ofta runt midsommarstangen?",
    options: ["Sma grodorna", "Staffan stalledrang", "Nu tandas tusen juleljus"],
    answer: 0,
  },
  {
    question: "Vad betyder 'maj' i majstang?",
    options: ["Manaden maj", "Att smycka med lov", "En gammal dryck"],
    answer: 1,
  },
  {
    question: "Vilken dryck brukar ofta serveras till snapsvisor?",
    options: ["Snaps", "Varm choklad", "Must"],
    answer: 0,
  },
  {
    question: "Vilken arstid firas midsommar?",
    options: ["Var", "Sommar", "Host"],
    answer: 1,
  },
  {
    question: "Vad symboliserar midsommar historiskt mest?",
    options: ["Arets morkaste natt", "Sommarsolstand och ljus", "Skordefestens slut"],
    answer: 1,
  },
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
  "Bingo: 3 i rad ger +3 poäng.",
];

const bingoFullReward = "Full bricka ger +5 poäng.";

function defaultSchedule() {
  return eventSchedule.map((item, index) => ({ id: `event-${index + 1}`, ...item }));
}

function ensureEditableContent() {
  state.schedule = normalizeSchedule(state.schedule);
  state.content = state.content && typeof state.content === "object" ? state.content : {};
  if (!Array.isArray(state.content.missions) || !state.content.missions.length) state.content.missions = [...missionPool];
  state.content.missions = normalizeMissionContent(state.content.missions);
  if (!Array.isArray(state.content.bingo) || !state.content.bingo.length) state.content.bingo = [...bingoPool];
  if (!Array.isArray(state.content.voteQuestions) || !state.content.voteQuestions.length) state.content.voteQuestions = [...voteQuestions];
  if (!Array.isArray(state.content.quizQuestions) || !state.content.quizQuestions.length) state.content.quizQuestions = structuredClone(quizQuestions);
  state.content.quizQuestions = normalizeQuizContent(state.content.quizQuestions);
  state.settings = state.settings && typeof state.settings === "object" ? state.settings : {};
  state.settings.dashboard = { next: true, schedule: true, score: true, weather: true, rsvp: true, feed: false, ...(state.settings.dashboard || {}) };
  state.settings.pentathlon = { started: false, visibleIndex: -1, ...(state.settings.pentathlon || {}) };
  state.galleryArchive = Array.isArray(state.galleryArchive) ? state.galleryArchive : [];
  if (state.game === "wheel") state.game = "vote";
  normalizePentathlonTeams();
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

function normalizeMissionContent(items) {
  return items
    .map((item, index) => {
      if (typeof item === "string") return { text: item, points: missionPointsFor(item, index) };
      return {
        text: String(item?.text || "").trim(),
        points: Math.max(0, Math.min(20, Number(item?.points ?? missionPointsFor(item?.text || "", index)) || 0)),
      };
    })
    .filter((item) => item.text)
    .sort((a, b) => Number(b.points || 0) - Number(a.points || 0) || a.text.localeCompare(b.text, "sv"));
}

function editableBingo() {
  ensureEditableContent();
  return state.content.bingo;
}

function editableVoteQuestions() {
  ensureEditableContent();
  return state.content.voteQuestions;
}

function editableQuizQuestions() {
  ensureEditableContent();
  return state.content.quizQuestions;
}

function normalizeQuizContent(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => {
      if (typeof item === "string") {
        const parts = item.split("|").map((part) => part.trim());
        return {
          question: parts[0] || "",
          options: [parts[1] || "1", parts[2] || "X", parts[3] || "2"],
          answer: Math.max(0, Math.min(2, Number(parts[4] || 0) || 0)),
        };
      }
      const options = Array.isArray(item?.options) ? item.options.slice(0, 3) : [];
      while (options.length < 3) options.push(["1", "X", "2"][options.length]);
      return {
        question: String(item?.question || "").trim(),
        options: options.map((option) => String(option || "").trim() || "-"),
        answer: Math.max(0, Math.min(2, Number(item?.answer ?? 0) || 0)),
      };
    })
    .filter((item) => item.question);
}

function serializeQuizContent(items) {
  return normalizeQuizContent(items)
    .map((item) => `${item.question} | ${item.options[0]} | ${item.options[1]} | ${item.options[2]} | ${item.answer}`)
    .join("\n");
}

function isoDatePart(value) {
  const match = String(value || "").match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function timePart(value) {
  const match = String(value || "").match(/T(\d{2}:\d{2})/);
  return match ? match[1] : "";
}

function normalizePentathlonTeams() {
  state.teamScores = (Array.isArray(state.teamScores) && state.teamScores.length ? state.teamScores : structuredClone(seed.teamScores))
    .map((team) => ({ team: team.team || "Nytt lag", score: Number(team.score || 0), members: Array.isArray(team.members) ? team.members : [] }));
  state.pentathlon = (Array.isArray(state.pentathlon) && state.pentathlon.length ? state.pentathlon : structuredClone(seed.pentathlon))
    .map((event) => {
      const scores = Array.isArray(event.scores) ? [...event.scores] : [];
      while (scores.length < state.teamScores.length) scores.push(0);
      return { ...event, scores: scores.slice(0, state.teamScores.length) };
    });
}

function dashboardVisible(key) {
  ensureEditableContent();
  return state.settings.dashboard?.[key] !== false;
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
  if (isAdminProfileName(state.profile)) return { ...structuredClone(profileSeed), points: 0 };
  if (!state.profiles[state.profile]) state.profiles[state.profile] = makeProfile(state.profile);
  state.profiles[state.profile] = { ...makeProfile(state.profile), ...state.profiles[state.profile] };
  migrateProfile(state.profile, state.profiles[state.profile]);
  return state.profiles[state.profile];
}

function makeProfile(name) {
  const profile = structuredClone(profileSeed);
  profile.voteDeck = [...editableVoteQuestions()];
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
  const questions = editableVoteQuestions();
  if (!Array.isArray(profile.voteDeck)) profile.voteDeck = [];
  profile.voteDeck = [...profile.voteDeck, ...questions.filter((question) => !profile.voteDeck.includes(question))];
  if (!profile.voteDeck.length) profile.voteDeck = [...questions];
  if (!profile.quizAnswers || typeof profile.quizAnswers !== "object") profile.quizAnswers = {};
  if (!profile.quizAwarded || typeof profile.quizAwarded !== "object") profile.quizAwarded = {};
  profile.quizIndex = Math.max(0, Math.min(editableQuizQuestions().length - 1, Number(profile.quizIndex || 0)));
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
  return source.slice(start, start + 4).map((mission, index) => ({
    id: `${name}-${index}`,
    text: mission.text || String(mission),
    points: Number(mission.points ?? missionPointsFor(mission.text || mission, index)),
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
  if (isAdmin() && state.page === "prep" && !hasAdminPrepView()) {
    state.page = "party";
    state.section = "today";
    if (!applyingRemoteState) saveState();
    return;
  }
  if (Date.now() < EVENT_START.getTime()) return;
  if (state.page === "party") return;
  state.page = "party";
  state.section = "today";
  if (!applyingRemoteState) saveState();
}

function openPartyForTest() {
  try {
    sessionStorage.setItem("midsommar-prep-bypass", "1");
    sessionStorage.removeItem("midsommar-admin-prep-view");
  } catch {}
  state.page = "party";
  state.section = "today";
  galleryIndex = null;
  galleryMotion = "open";
  saveState();
  renderAll();
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
    .filter((name) => name && !isAdminProfileName(name) && !guests.includes(name) && !overriddenNames.has(name));
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
  return state.adminMode === true && state.adminOwner === ADMIN_PROFILE;
}

function canUseAdmin() {
  return Boolean(state.profile);
}

function isAdminProfileName(name) {
  return String(name || "").toLowerCase() === ADMIN_PROFILE.toLowerCase();
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
  archiveProfileGalleryItems(name);
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

function archiveProfileGalleryItems(name) {
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
  if (items.length) state.galleryArchive = dedupeGalleryPhotos([...items, ...(state.galleryArchive || [])]);
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
  document.querySelector("#profile-button").disabled = !isAdmin();
  document.querySelector("#profile-grid").innerHTML = allParticipants()
    .map((name) => isAdmin()
      ? `<div class="profile-manage-row"><button class="${name === state.profile ? "is-selected" : ""}" value="${escapeHtml(name)}" type="button" data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button><button class="profile-delete-button" type="button" data-delete-profile="${escapeHtml(name)}" aria-label="Radera ${escapeHtml(name)}" ${name === "Max" ? "disabled" : ""}>×</button></div>`
      : `<button class="${name === state.profile ? "is-selected" : ""}" value="${escapeHtml(name)}" type="button" data-profile="${escapeHtml(name)}">${escapeHtml(name)}</button>`)
    .join("");
  const adminInput = document.querySelector("#admin-name-input");
  if (adminInput && (isAdmin() || !adminInput.value)) adminInput.value = state.profile || "";
  if (adminInput) adminInput.disabled = !isAdmin();
  document.querySelector("[data-admin-login]").disabled = !isAdmin();
  document.querySelector(".admin-name-field").hidden = !isAdmin();
  document.querySelector("#current-profile-card").hidden = !isAdmin();
  document.querySelector("#profile-grid").hidden = !isAdmin();
  document.querySelector("#admin-code-row").hidden = true;
  document.querySelector("[data-admin-mode]").hidden = !isAdmin();
  document.querySelector("[data-admin-mode]").textContent = "Lämna admin mode";
  setText("profile-dialog-copy", isAdmin() ? "Admin mode är aktivt. Du kan byta profil, döpa om aktiv person eller radera testprofiler." : "Profilen är låst.");
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
      (item) => `<label class="pack-row"><input type="checkbox" data-pack="${item.id}" ${item.done ? "checked" : ""} /><span>${escapeHtml(item.text)}</span>${isAdmin() ? `<button type="button" data-delete-pack="${escapeHtml(item.id)}" aria-label="Radera packpunkt">&times;</button>` : ""}</label>`,
    )
    .join("") + (isAdmin() ? `<div class="pack-admin-row"><input id="pack-admin-input" placeholder="Lägg till packning" /><button type="button" data-add-pack>+</button></div>` : "");

  if (profile) {
    setText("profile-label", `${state.profile} · ${profile.points} p${isAdmin() ? " · admin" : ""}`);
  }
}

function ensurePackList() {
  if (!Array.isArray(state.pack)) state.pack = structuredClone(seed.pack);
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
  const cards = [];
  if (isAdmin()) cards.push(renderDashboardVisibilityEditor());
  if (dashboardVisible("next")) cards.push(`<article class="dash-card dash-card--wide next-activity-card">
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
    </article>`);
  if (dashboardVisible("schedule")) cards.push(`<article class="dash-card dash-card--wide schedule-card">
      <div class="card-title-row"><span>Dagens schema</span>${isAdmin() ? `<button class="inline-admin-button" type="button" data-admin-edit="schedule">Redigera</button>` : ""}</div>
      <div class="timeline-mini timeline-mini--rich">${schedule.map((item) => `<i class="dot dot--${escapeHtml(item.color)}"></i><b>${escapeHtml(item.time)}</b><span>${escapeHtml(item.title)}</span>`).join("") || `<p class="hint">Inget schema f&ouml;r dagen &auml;n.</p>`}</div>
      ${isAdmin() ? renderScheduleEditor() : ""}
    </article>`);
  if (dashboardVisible("score")) cards.push(`<article class="dash-card dash-card--wide"><span>Poängställning</span>${renderScoreMini()}</article>`);
  if (dashboardVisible("weather")) cards.push(`<article class="dash-card dash-card--wide start-weather-card"><span>Väder</span>${renderWeatherMini()}</article>`);
  if (dashboardVisible("rsvp")) cards.push(`<article class="dash-card dash-card--wide rsvp-status-card"><span>OSA</span>${renderRsvpStatusMini()}</article>`);
  if (dashboardVisible("feed")) cards.push(`<article class="dash-card dash-card--wide activity-feed-card"><span>Senaste h&auml;ndelser</span>${renderActivityFeed()}</article>`);
  if (!cards.length) cards.push(`<article class="dash-card dash-card--wide"><p class="hint">Alla startkort &auml;r dolda. Sl&aring; p&aring n&aring;got i adminl&auml;get.</p></article>`);
  return `<div class="dashboard-grid">${cards.join("")}</div>`;
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

function renderRsvpStatusMini() {
  const groups = [
    ["yes", "Kommer"],
    ["maybe", "Kanske"],
    ["no", "Kan inte"],
  ].map(([status, label]) => ({
    status,
    label,
    names: allParticipants().filter((name) => rsvpStatus(name) === status),
  }));
  return `<div class="rsvp-mini-list">${groups.map((group) => `<section class="rsvp-mini-group rsvp-mini-group--${group.status}">
    <strong>${escapeHtml(group.label)} <b>${group.names.length}</b></strong>
    <p>${group.names.length ? escapeHtml(group.names.join(", ")) : "Ingen"}</p>
  </section>`).join("")}</div>`;
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
  return `<div class="admin-editor schedule-editor admin-editor--compact">
    <div class="admin-editor-head"><strong>Redigera schema</strong><small>${escapeHtml(day)}</small></div>
    <div class="admin-table admin-table--schedule">
      ${rows.map((item) => `<div class="schedule-edit-row" data-schedule-row="${escapeHtml(item.id)}">
        <input class="schedule-time-input" type="time" value="${escapeHtml(item.time)}" data-schedule-field="time" data-schedule-id="${escapeHtml(item.id)}" aria-label="Tid" />
        <input class="schedule-title-input" type="text" value="${escapeHtml(item.title)}" data-schedule-field="title" data-schedule-id="${escapeHtml(item.id)}" aria-label="Titel" />
        <button class="admin-delete-button" type="button" data-delete-schedule="${escapeHtml(item.id)}" aria-label="Radera hÃ¥llpunkt">&times;</button>
      </div>`).join("")}
    </div>
    <button class="admin-add-button" type="button" data-add-schedule>LÃ¤gg till hÃ¥llpunkt</button>
  </div>`;
}

function renderDashboardVisibilityEditor() {
  const items = [
    ["next", "Nästa"],
    ["schedule", "Schema"],
    ["score", "Poäng"],
    ["weather", "Väder"],
    ["rsvp", "OSA"],
    ["feed", "Händelser"],
  ];
  return `<article class="dash-card dash-card--wide dashboard-admin-card">
    <div class="card-title-row"><span>Startsida</span><small>Visa / dölj</small></div>
    <div class="dashboard-toggle-grid">
      ${items.map(([key, label]) => `<button class="dashboard-toggle ${dashboardVisible(key) ? "is-on" : ""}" type="button" data-dashboard-toggle="${key}">
        <span>${escapeHtml(label)}</span><b>${dashboardVisible(key) ? "På" : "Av"}</b>
      </button>`).join("")}
    </div>
  </article>`;
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
  const vote = state.matchVotes[state.profile] || {};
  const result = normalizeMatchResult(vote);
  const closed = matchTipClosed();
  return `<div class="match-wallpaper">
    <section class="match-wallpaper-hero">
      <span>VM 2026</span>
      <div class="match-versus">
        <div><b>🇸🇪</b><strong>Sverige</strong></div>
        <em>vs</em>
        <div><b>🇳🇱</b><strong>Netherlands</strong></div>
      </div>
      <p>${escapeHtml(`${matchFallback.selected.date} · ${matchFallback.selected.time}`)}</p>
      <strong>${escapeHtml(relativeToEvent("2026-06-20T19:00:00+02:00"))}</strong>
    </section>
    <article class="match-vote-card match-vote-card--wallpaper">
      <div class="score-inputs">
        <label><span>SWE</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.home)}" data-match-score="home" ${closed ? "disabled" : ""} /></label>
        <b>-</b>
        <label><span>NED</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(result.away)}" data-match-score="away" ${closed ? "disabled" : ""} /></label>
      </div>
      <p class="match-points-note">Rätt 1X2 ger 3 p. Rätt resultat ger 5 p.</p>
      <button class="pill-button match-save-button" type="button" data-match-save ${closed ? "disabled" : ""}>${closed ? "Tippning stängd" : "Spara tipp"}</button>
    </article>
    ${isAdmin() ? renderMatchAdmin() : ""}
  </div>`;
}

function renderMatchAdmin() {
  const actual = normalizeMatchResult(state.matchResult || {});
  return `<article class="game-card match-admin-card">
    <span class="micro-label">Admin</span>
    <h3>Rätta VM-tipset</h3>
    <div class="score-inputs">
      <label><span>SWE</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(actual.home)}" data-match-final="home" ${state.matchAwarded ? "disabled" : ""} /></label>
      <b>-</b>
      <label><span>NED</span><input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(actual.away)}" data-match-final="away" ${state.matchAwarded ? "disabled" : ""} /></label>
    </div>
    <button class="pill-button match-save-button" type="button" data-award-match ${state.matchAwarded ? "disabled" : ""}>${state.matchAwarded ? "Poäng utdelade" : "Dela ut poäng"}</button>
    <p class="hint">Rätt 1X2 ger 3 p. Exakt resultat ger 5 p.</p>
  </article>`;
}

function normalizeMatchResult(vote) {
  if (vote.home !== undefined || vote.away !== undefined) {
    const home = vote.home ?? "";
    const away = vote.away ?? "";
    return { home, away, text: home !== "" && away !== "" ? `${home}-${away}` : "" };
  }
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

function matchTipClosed() {
  return Date.now() >= MATCH_TIP_DEADLINE.getTime();
}

function matchOutcomeKey(result) {
  const home = Number(result.home);
  const away = Number(result.away);
  if (Number.isNaN(home) || Number.isNaN(away)) return "";
  if (home > away) return "1";
  if (home < away) return "2";
  return "x";
}

function awardMatchPoints() {
  if (state.matchAwarded) return 0;
  const actual = normalizeMatchResult(state.matchResult || {});
  if (!actual.text) return -1;
  const actualOutcome = matchOutcomeKey(actual);
  let awarded = 0;
  allParticipants().forEach((name) => {
    const vote = normalizeMatchResult(state.matchVotes[name] || {});
    if (!vote.text) return;
    const profile = state.profiles[name] || makeProfile(name);
    if (vote.text === actual.text) {
      profile.points += 5;
      awarded += 5;
    } else if (matchOutcomeKey(vote) === actualOutcome) {
      profile.points += 3;
      awarded += 3;
    }
    state.profiles[name] = profile;
  });
  state.matchAwarded = true;
  return awarded;
}

function renderGames() {
  const profile = activeProfile();
  if (!profile) return `<article class="game-card"><h3>Välj profil först</h3><p>Då får du egen bingo och egna uppdrag.</p></article>`;
  return `<div class="game-picker">
    ${renderGamePickerButton("vote", "vote", "Most likely")}
    ${renderGamePickerButton("quiz", "quiz", "Quiz")}
    ${renderGamePickerButton("snaps", "snaps", "Snaps")}
    ${renderGamePickerButton("mission", "mission", "Uppdrag")}
    ${renderGamePickerButton("bingo", "bingo", "Bingo")}
    ${renderGamePickerButton("beforeAfter", "people", "Före/efter")}
  </div>
  ${state.game === "vote" ? renderVote(profile) : ""}
  ${state.game === "quiz" ? renderQuiz(profile) : ""}
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
    quiz: `<svg viewBox="0 0 64 64"><path d="M16 12h32v40H16z"/><path d="M23 24h18M23 34h18M23 44h10"/><circle cx="44" cy="44" r="5"/></svg>`,
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
  return `<article class="game-card vote-game-card"><span class="micro-label">Most likely</span><h3>Vem ${escapeHtml(question)}</h3><div class="vote-options">${allParticipants().filter((name) => name !== state.profile).map((name) => `<button class="vote-button ${profile.votes[question] === name ? "is-selected" : ""}" type="button" data-vote="${escapeHtml(question)}" data-target="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")}</div><p class="hint">${profile.votes[question] ? `Ditt svar: ${escapeHtml(profile.votes[question])}` : "Spara svar nu. Max rättar sista dagen."}</p><button class="pill-button" type="button" data-next-personal-question>Nästa påstående</button></article>`;
}

function renderQuiz(profile) {
  const questions = editableQuizQuestions();
  const index = Math.max(0, Math.min(questions.length - 1, Number(profile.quizIndex || 0)));
  const question = questions[index];
  if (!question) return `<article class="game-card"><h3>Quiz saknas</h3><p class="hint">Admin kan lagga till fragor.</p></article>`;
  const answer = profile.quizAnswers?.[index];
  const answered = answer !== undefined;
  const correct = Number(answer) === Number(question.answer);
  const labels = ["1", "X", "2"];
  return `<article class="game-card quiz-card">
    <span class="micro-label">Quiz ${index + 1}/${questions.length}</span>
    <h3>${escapeHtml(question.question)}</h3>
    <div class="quiz-options">
      ${question.options.map((option, optionIndex) => `<button class="${Number(answer) === optionIndex ? "is-selected" : ""} ${answered && Number(question.answer) === optionIndex ? "is-correct" : ""}" type="button" data-quiz-answer="${optionIndex}" data-quiz-index="${index}">
        <b>${labels[optionIndex]}</b><span>${escapeHtml(option)}</span>
      </button>`).join("")}
    </div>
    <p class="hint">${answered ? (correct ? "Ratt. +1 poang." : `Fel. Ratt svar: ${labels[question.answer]}.`) : "Valj 1, X eller 2."}</p>
    <button class="pill-button" type="button" data-next-quiz>Nasta fraga</button>
  </article>`;
}

function renderGameAdminEditor() {
  ensureEditableContent();
  const config = {
    vote: { key: "voteQuestions", title: "Most likely", applyLabel: "Dela ut nya fr&aring;gor" },
    quiz: { key: "quizQuestions", title: "Quiz", applyLabel: "Nollst&auml;ll quizsvar" },
    mission: { key: "missions", title: "Uppdrag", applyLabel: "Dela ut nya uppdrag" },
    bingo: { key: "bingo", title: "Bingo", applyLabel: "Slumpa nya brickor" },
  }[state.game];
  if (!config) {
    return `<article class="admin-editor game-content-editor">
      <div class="admin-editor-head"><strong>Admin</strong><small>Inget textinneh&aring;ll f&ouml;r den h&auml;r leken.</small></div>
    </article>`;
  }
  const rows = state.content?.[config.key] || [];
  if (config.key === "missions") {
    const missions = normalizeMissionContent(rows);
    return `<article class="admin-editor game-content-editor mission-admin-editor">
      <div class="admin-editor-head"><strong>Redigera uppdrag</strong><small>Poäng följer med vid utdelning</small></div>
      <div class="mission-admin-table">
        ${missions.map((mission, index) => `<div class="mission-admin-row" data-mission-admin-row>
          <input class="mission-admin-text" value="${escapeHtml(mission.text)}" data-mission-admin-text aria-label="Uppdrag" />
          <input class="mission-admin-points" type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(mission.points)}" data-mission-admin-points aria-label="Poäng" />
          <button class="admin-delete-button" type="button" data-delete-mission-row="${index}" aria-label="Radera uppdrag">&times;</button>
        </div>`).join("")}
      </div>
      <div class="admin-actions">
        <button class="admin-secondary-button" type="button" data-add-mission-row>Lägg till</button>
        <button class="admin-add-button" type="button" data-save-content="missions">Spara lista</button>
        <button class="admin-secondary-button" type="button" data-apply-content="missions">${config.applyLabel}</button>
      </div>
    </article>`;
  }
  if (config.key === "quizQuestions") {
    return `<article class="admin-editor game-content-editor">
      <div class="admin-editor-head"><strong>Redigera quiz</strong><small>Fr&aring;ga | 1 | X | 2 | r&auml;tt 0-2</small></div>
      <textarea class="admin-textarea" data-content-editor="quizQuestions">${escapeHtml(serializeQuizContent(rows))}</textarea>
      <div class="admin-actions">
        <button class="admin-add-button" type="button" data-save-content="quizQuestions">Spara quiz</button>
        <button class="admin-secondary-button" type="button" data-apply-content="quizQuestions">${config.applyLabel}</button>
      </div>
    </article>`;
  }
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
    profile.points += 3;
  }
  if (hits.length === profile.bingo.length && !profile.bingoRewards.fullText) {
    profile.bingoRewards.fullText = bingoFullReward;
    profile.points += 5;
  }
}

function renderMission(profile) {
  return `<article class="game-card mission-explain-card"><span class="micro-label">Hemliga uppdrag</span><p>Nedan listas dina hemliga uppdrag. Genomf&ouml;r dem utan att avsl&ouml;ja dig f&ouml;r de andra. Bild bevis kr&auml;vs.</p></article><div class="mission-list">${profile.missions.map((mission, index) => `
    <article class="mission-card mission-card--compact ${mission.photo ? "is-complete" : ""}">
      <div class="mission-copy"><h3><span class="mission-points">${mission.points || missionPointsFor(mission.text, index)} p</span><span>${escapeHtml(mission.text)}</span></h3>${isAdmin() ? `<label class="mission-point-admin">Poäng <input type="number" min="0" max="20" inputmode="numeric" value="${escapeHtml(mission.points || missionPointsFor(mission.text, index))}" data-mission-points="${index}" /></label>` : ""}</div>
      ${mission.photo ? `<span class="done-pill">Klar</span>` : `<button class="upload-button" type="button" data-start-mission="${index}">Utför</button><input class="capture-input" type="file" accept="image/*" data-mission-upload="${index}" />`}
    </article>`).join("")}</div>`;
}

function renderBingo(profile) {
  const hits = getBingoHits(profile);
  return `<div class="bingo-grid">${profile.bingo.map((item, index) => {
    const isHit = hits.includes(item);
    return `<button class="bingo-cell ${isHit ? "is-hit" : ""}" type="button" data-bingo="${escapeHtml(item)}" data-bingo-index="${index}" ${isHit ? "disabled" : ""}>
      <span>${escapeHtml(item)}</span>
      <small>${isHit ? "Klar" : "Ta bild"}</small>
    </button><input class="capture-input" type="file" accept="image/*" data-bingo-upload="${index}" />`;
  }).join("")}</div>
  <div class="bingo-rewards">
    <p class="hint">${hits.length}/9 låsta · unik bricka för ${escapeHtml(state.profile)}</p>
    <p class="hint">3 i rad ger +3 poäng.</p>
    <p class="hint">Full bricka ger +5 poäng.</p>
  </div>`;
}

function renderBeforeAfter(profile) {
  const before = profile.beforeAfter?.before || {};
  const after = profile.beforeAfter?.after || {};
  const beforeState = beforeAfterSlotState("before", before, before);
  const afterState = beforeAfterSlotState("after", after, before);
  return `<article class="game-card before-after-card">
    <h3>Video challenge</h3>
    <p class="hint">Spela in en video innan midsommar börjar, och senare på kvällen en video när du är i full gång.</p>
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
    </article>`).join("")}${isAdmin() ? renderScoreAdmin() + renderVoteAdmin() : ""}</div>`;
}

function renderScoreAdmin() {
  const participants = allParticipants();
  const selectedPlayer = participants.includes(state.adminScorePlayer) ? state.adminScorePlayer : (state.profile || participants[0]);
  const selectedTeamIndex = state.teamScores[Number(state.adminScoreTeam)] ? Number(state.adminScoreTeam) : 0;
  const selectedProfile = state.profiles[selectedPlayer] || makeProfile(selectedPlayer);
  const selectedTeam = state.teamScores[selectedTeamIndex];
  return `<article class="game-card score-admin-card">
    <span class="micro-label">Admin</span>
    <h3>Justera poäng</h3>
    <div class="score-admin-picker">
      <label><span>Profil</span><select data-score-player>${participants.map((name) => `<option value="${escapeHtml(name)}" ${name === selectedPlayer ? "selected" : ""}>${escapeHtml(name)}</option>`).join("")}</select></label>
      <div class="score-admin-row score-admin-row--single">
        <strong>${escapeHtml(selectedPlayer)}</strong>
        <button type="button" data-adjust-player="${escapeHtml(selectedPlayer)}" data-points-delta="-1">-1</button>
        <span>${selectedProfile.points} p</span>
        <button type="button" data-adjust-player="${escapeHtml(selectedPlayer)}" data-points-delta="1">+1</button>
        <button type="button" data-reset-player="${escapeHtml(selectedPlayer)}">0</button>
      </div>
    </div>
    <div class="score-admin-picker">
      <label><span>Lag</span><select data-score-team>${state.teamScores.map((team, index) => `<option value="${index}" ${index === selectedTeamIndex ? "selected" : ""}>${escapeHtml(team.team)}</option>`).join("")}</select></label>
      <div class="score-admin-row score-admin-row--single">
        <strong>${escapeHtml(selectedTeam.team)}</strong>
        <button type="button" data-adjust-team="${selectedTeamIndex}" data-points-delta="-1">-1</button>
        <span>${selectedTeam.score || 0} p</span>
        <button type="button" data-adjust-team="${selectedTeamIndex}" data-points-delta="1">+1</button>
        <button type="button" data-reset-team="${selectedTeamIndex}">0</button>
      </div>
    </div>
  </article>`;
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
  const names = galleryParticipantNames();
  const missionPhotos = names.flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.missions) return [];
    return profile.missions
      .filter((mission) => mission.photo)
      .map((mission) => ({ name, text: mission.text, photo: mission.photo, type: "Uppdrag", takenAt: mission.completedAt, media: "image" }));
  });
  const bingoPhotos = names.flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.bingoProofs) return [];
    return Object.entries(profile.bingoProofs)
      .filter(([, proof]) => proof?.photo)
      .map(([text, proof]) => ({ name, text, photo: proof.photo, type: "Bingo", takenAt: proof.completedAt, media: "image" }));
  });
  const beforeAfterVideos = names.flatMap((name) => {
    const profile = state.profiles[name];
    if (!profile?.beforeAfter) return [];
    return ["before", "after"]
      .map((slot) => ({ slot, item: profile.beforeAfter[slot] }))
      .filter(({ item }) => item?.video)
      .map(({ slot, item }) => ({ name, text: slot === "before" ? "Före-video" : "Efter-video", photo: item.video, type: "Före / efter", takenAt: item.completedAt, media: "video" }));
  });
  return dedupeGalleryPhotos([...(state.galleryArchive || []), ...missionPhotos, ...bingoPhotos, ...beforeAfterVideos]);
}

function galleryParticipantNames() {
  return [...new Set([...allParticipants(), ...Object.keys(state.profiles || {})].filter(Boolean))];
}

function dedupeGalleryPhotos(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = `${item.media || "image"}::${item.photo}::${item.name}::${item.text}`;
    if (!item.photo || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => new Date(b.takenAt || 0) - new Date(a.takenAt || 0));
}

function archiveGalleryItem(item) {
  state.galleryArchive = dedupeGalleryPhotos([item, ...(state.galleryArchive || [])]);
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
      ${item.media === "video" ? `<video src="${item.photo}" muted playsinline preload="metadata"></video>` : `<img src="${item.photo}" alt="${escapeHtml(item.type)} från ${escapeHtml(item.name)}" />`}
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
      ${item.media === "video" ? `<video src="${item.photo}" controls playsinline preload="metadata"></video>` : `<img src="${item.photo}" alt="${escapeHtml(item.type)} från ${escapeHtml(item.name)}" />`}
      <figcaption><strong>${escapeHtml(item.name)} · ${escapeHtml(item.type)}</strong><span>${escapeHtml(item.text)}</span><small>${position} · ${escapeHtml(formatPhotoTime(item.takenAt))}</small></figcaption>
    </figure>
    <button class="photo-nav photo-nav--next" type="button" data-gallery-next aria-label="Nästa bild">›</button>
  </div>`;
}

function renderPentathlon() {
  const totals = pentathlonTeamRows();
  const started = state.settings.pentathlon?.started;
  const visibleIndex = Number(state.settings.pentathlon?.visibleIndex ?? -1);
  const visibleEvents = started ? state.pentathlon.slice(0, visibleIndex + 1) : [];
  return `<div class="pentathlon-summary-grid pentathlon-summary-grid--stack">${renderOwnTeamCard(totals)}${renderPentathlonRanking(totals)}</div>
  ${isAdmin() ? renderPentathlonRevealControls() : ""}
  ${!started || visibleIndex < 0 ? `<article class="game-card pentathlon-locked-card"><span class="micro-label">5-kamp</span><h3>Grenarna är hemliga</h3><p class="hint">Admin visar första grenen när det är dags.</p></article>` : ""}
  <div class="pentathlon-list">${visibleEvents.map((event, eventIndex) => {
    const status = pentathlonStatus(eventIndex);
    return `<article class="game-card pentathlon-event pentathlon-event--${status.key}">
      <div class="pentathlon-event__head"><span class="micro-label">${eventIndex + 1}/5</span><span class="event-status">${escapeHtml(status.label)}</span></div>
      <h3>${escapeHtml(event.name)}</h3>
      ${isAdmin() ? `<div class="five-placement-grid">${state.teamScores.map((team, teamIndex) => `<section>
        <strong>${escapeHtml(team.team)} <b>${event.scores[teamIndex] || 0} p</b></strong>
        <div>${[5, 3, 1, 0.5].map((points) => `<button class="${Number(event.scores[teamIndex] || 0) === points ? "is-selected" : ""}" type="button" data-five-event="${eventIndex}" data-five-team="${teamIndex}" data-five-points="${points}">${points}p</button>`).join("")}</div>
      </section>`).join("")}</div>` : ""}
    </article>`;
  }).join("")}</div>${isAdmin() ? renderPentathlonEditor() : ""}`;
}

function pentathlonTeamRows() {
  return state.teamScores.map((team, teamIndex) => ({
    team: team.team,
    index: teamIndex,
    members: team.members || [],
    score: Number(team.score || 0) + state.pentathlon.reduce((sum, event) => sum + Number(event.scores[teamIndex] || 0), 0),
  })).sort((a, b) => b.score - a.score || a.team.localeCompare(b.team, "sv"));
}

function ownTeamRow(rows) {
  return rows.find((team) => team.members.includes(state.profile)) || null;
}

function renderOwnTeamCard(rows) {
  const ownTeam = ownTeamRow(rows);
  if (!ownTeam) {
    return `<article class="game-card own-team-card"><span class="micro-label">Mitt lag</span><h3>Inget lag valt</h3><p class="hint">Admin kopplar deltagare till lag.</p></article>`;
  }
  return `<article class="game-card own-team-card">
    <span class="micro-label">Mitt lag</span>
    <input class="own-team-name-input" value="${escapeHtml(ownTeam.team)}" data-own-team-name="${ownTeam.index}" aria-label="Ändra lagnamn" />
    <strong>${ownTeam.score} p</strong>
    <p>${escapeHtml(ownTeam.members.join(", "))}</p>
  </article>`;
}

function renderPentathlonRanking(rows) {
  return `<article class="game-card pentathlon-ranking-card">
    <span class="micro-label">Tabell</span>
    <div class="team-rank-table">${rows.map((row, index) => `<div class="${row.members.includes(state.profile) ? "is-self" : ""}">
      <b>${index + 1}</b>
      <strong>${escapeHtml(row.team)}</strong>
      <span>${escapeHtml(row.members.join(", ") || "-")}</span>
      <em>${row.score} p</em>
    </div>`).join("")}</div>
  </article>`;
}

function renderPentathlonRevealControls() {
  const started = state.settings.pentathlon?.started;
  const visibleIndex = Number(state.settings.pentathlon?.visibleIndex ?? -1);
  return `<article class="game-card pentathlon-control-card">
    <span class="micro-label">Admin</span>
    <h3>${started ? "5-kampen är igång" : "Starta 5-kampen"}</h3>
    <div class="admin-actions">
      <button class="admin-add-button" type="button" data-start-five>${started ? "Startad" : "START"}</button>
      <button class="admin-secondary-button" type="button" data-prev-five ${!started || visibleIndex < 0 ? "disabled" : ""}>Ångra</button>
      <button class="admin-secondary-button" type="button" data-next-five ${!started || visibleIndex >= state.pentathlon.length - 1 ? "disabled" : ""}>Visa nästa</button>
    </div>
  </article>`;
}

function renderPentathlonEditor() {
  const participants = allParticipants();
  return `<article class="admin-editor pentathlon-editor">
    <div class="admin-editor-head"><strong>Redigera 5-kamp</strong><small>Lag, deltagare och grenar</small></div>
    <div class="team-builder">
      ${state.teamScores.map((team, index) => `<section class="team-builder-card">
        <div class="team-builder-head">
          <input type="text" value="${escapeHtml(team.team)}" data-team-name="${index}" aria-label="Lagnamn ${index + 1}" />
          <button class="admin-delete-button" type="button" data-delete-team="${index}" aria-label="Radera lag">&times;</button>
        </div>
        <div class="member-picker">
          ${participants.map((name) => {
            const selectedHere = (team.members || []).includes(name);
            const selectedElsewhere = state.teamScores.some((otherTeam, otherIndex) => otherIndex !== index && (otherTeam.members || []).includes(name));
            return `<button class="member-chip ${selectedHere ? "is-selected" : ""} ${selectedElsewhere ? "is-other" : ""}" type="button" data-team-member="${index}" data-member="${escapeHtml(name)}">${escapeHtml(name)}</button>`;
          }).join("")}
        </div>
      </section>`).join("")}
    </div>
    <button class="admin-add-button" type="button" data-add-team>Skapa lag</button>
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
  archiveGalleryItem({ name: state.profile, text: mission.text, photo, type: "Uppdrag", takenAt: mission.completedAt, media: "image" });
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
  const completedAt = new Date().toISOString();
  profile.bingoProofs[item] = { photo, completedAt };
  archiveGalleryItem({ name: state.profile, text: item, photo, type: "Bingo", takenAt: completedAt, media: "image" });
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
  const completedAt = new Date().toISOString();
  profile.beforeAfter[slot] = { video, completedAt };
  archiveGalleryItem({ name: state.profile, text: slot === "before" ? "Före-video" : "Efter-video", photo: video, type: "Före / efter", takenAt: completedAt, media: "video" });
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

  document.querySelector("[data-add-pack]")?.addEventListener("click", () => {
    const input = document.querySelector("#pack-admin-input");
    const text = input?.value.trim();
    if (!text) return;
    state.pack.push({ id: `pack-${Date.now()}`, text, done: false });
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-delete-pack]").forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    state.pack = state.pack.filter((item) => item.id !== button.dataset.deletePack);
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

  document.querySelector("[data-add-mission-row]")?.addEventListener("click", () => {
    ensureEditableContent();
    state.content.missions.push({ text: "Nytt uppdrag", points: 2 });
    state.content.missions = normalizeMissionContent(state.content.missions);
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-delete-mission-row]").forEach((button) => button.addEventListener("click", () => {
    ensureEditableContent();
    state.content.missions.splice(Number(button.dataset.deleteMissionRow), 1);
    state.content.missions = normalizeMissionContent(state.content.missions);
    saveState();
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

  document.querySelectorAll("[data-quiz-answer]").forEach((button) => button.addEventListener("click", () => {
    const profile = activeProfile();
    if (!profile) return;
    const questionIndex = Number(button.dataset.quizIndex);
    const answer = Number(button.dataset.quizAnswer);
    const question = editableQuizQuestions()[questionIndex];
    if (!question) return;
    profile.quizAnswers = profile.quizAnswers || {};
    profile.quizAwarded = profile.quizAwarded || {};
    profile.quizAnswers[questionIndex] = answer;
    if (answer === Number(question.answer) && !profile.quizAwarded[questionIndex]) {
      profile.points = Number(profile.points || 0) + 1;
      profile.quizAwarded[questionIndex] = true;
    }
    saveState();
    renderAll();
  }));

  document.querySelector("[data-next-quiz]")?.addEventListener("click", () => {
    const profile = activeProfile();
    if (!profile) return;
    const total = editableQuizQuestions().length || 1;
    profile.quizIndex = (Number(profile.quizIndex || 0) + 1) % total;
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-mission-points]").forEach((input) => input.addEventListener("change", () => {
    const profile = activeProfile();
    const mission = profile?.missions?.[Number(input.dataset.missionPoints)];
    if (!mission) return;
    mission.points = Math.max(0, Math.min(20, Number(input.value) || 0));
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

  document.querySelector("[data-score-player]")?.addEventListener("change", (event) => {
    state.adminScorePlayer = event.target.value;
    saveState();
    renderAll();
  });

  document.querySelector("[data-score-team]")?.addEventListener("change", (event) => {
    state.adminScoreTeam = event.target.value;
    saveState();
    renderAll();
  });

  document.querySelector("[data-reset-player]")?.addEventListener("click", (event) => {
    const name = event.currentTarget.dataset.resetPlayer;
    const profile = state.profiles[name] || makeProfile(name);
    profile.points = 0;
    state.profiles[name] = profile;
    saveState();
    renderAll();
  });

  document.querySelector("[data-reset-team]")?.addEventListener("click", (event) => {
    const team = state.teamScores[Number(event.currentTarget.dataset.resetTeam)];
    if (!team) return;
    team.score = 0;
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-adjust-player]").forEach((button) => button.addEventListener("click", () => {
    const name = button.dataset.adjustPlayer;
    const delta = Number(button.dataset.pointsDelta || 0);
    const profile = state.profiles[name] || makeProfile(name);
    profile.points = Math.max(0, Number(profile.points || 0) + delta);
    state.profiles[name] = profile;
    saveState();
    renderAll();
  }));

  document.querySelectorAll("[data-adjust-team]").forEach((button) => button.addEventListener("click", () => {
    const team = state.teamScores[Number(button.dataset.adjustTeam)];
    if (!team) return;
    team.score = Math.max(0, Number(team.score || 0) + Number(button.dataset.pointsDelta || 0));
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
    if (matchTipClosed()) {
      showToast("Tippningen stängde 19:00");
      renderAll();
      return;
    }
    const vote = { ...(state.matchVotes[state.profile] || {}) };
    const value = input.value === "" ? "" : String(Math.max(0, Math.min(20, Number(input.value) || 0)));
    if (input.dataset.matchScore === "home") vote.resultHome = value;
    if (input.dataset.matchScore === "away") vote.resultAway = value;
    vote.result = vote.resultHome !== "" && vote.resultAway !== "" ? `${vote.resultHome}-${vote.resultAway}` : "";
    delete vote.oneXtwo;
    state.matchVotes[state.profile] = vote;
    saveState();
    if (input.dataset.matchScore === "home" && value !== "") {
      document.querySelector('[data-match-score="away"]')?.focus();
    }
  }));

  document.querySelectorAll("[data-match-final]").forEach((input) => input.addEventListener("input", () => {
    const value = input.value === "" ? "" : String(Math.max(0, Math.min(20, Number(input.value) || 0)));
    state.matchResult = { ...(state.matchResult || {}) };
    if (input.dataset.matchFinal === "home") state.matchResult.home = value;
    if (input.dataset.matchFinal === "away") state.matchResult.away = value;
    saveState();
  }));

  document.querySelector("[data-award-match]")?.addEventListener("click", () => {
    const awarded = awardMatchPoints();
    if (awarded < 0) {
      showToast("Fyll i slutresultat först");
      return;
    }
    saveState();
    showToast(`VM-poäng utdelade: ${awarded} p`);
    renderAll();
  });

  document.querySelector("[data-match-save]")?.addEventListener("click", () => {
    if (matchTipClosed()) {
      showToast("Tippningen stängde 19:00");
      return;
    }
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
    const eventItem = state.pentathlon[Number(button.dataset.fiveEvent)];
    if (!eventItem) return;
    const teamIndex = Number(button.dataset.fiveTeam);
    const nextPoints = Number(button.dataset.fivePoints ?? 1);
    eventItem.scores[teamIndex] = Number(eventItem.scores[teamIndex] || 0) === nextPoints ? 0 : nextPoints;
    saveState();
    renderAll();
  }));

  document.querySelector("[data-start-five]")?.addEventListener("click", () => {
    state.settings.pentathlon.started = true;
    state.settings.pentathlon.visibleIndex = Math.max(0, Number(state.settings.pentathlon.visibleIndex ?? -1));
    saveState();
    renderAll();
  });

  document.querySelector("[data-next-five]")?.addEventListener("click", () => {
    if (!state.settings.pentathlon.started) return;
    state.settings.pentathlon.visibleIndex = Math.min(state.pentathlon.length - 1, Number(state.settings.pentathlon.visibleIndex ?? 0) + 1);
    saveState();
    renderAll();
  });

  document.querySelector("[data-prev-five]")?.addEventListener("click", () => {
    if (!state.settings.pentathlon.started) return;
    state.settings.pentathlon.visibleIndex = Math.max(-1, Number(state.settings.pentathlon.visibleIndex ?? 0) - 1);
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-team-name]").forEach((input) => input.addEventListener("change", () => {
    const team = state.teamScores[Number(input.dataset.teamName)];
    if (!team) return;
    team.team = input.value.trim() || team.team;
    saveState();
    renderAll();
  }));

  document.querySelector("[data-own-team-name]")?.addEventListener("change", (event) => {
    const team = state.teamScores[Number(event.target.dataset.ownTeamName)];
    if (!team) return;
    team.team = event.target.value.trim() || team.team;
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-team-member]").forEach((button) => button.addEventListener("click", () => {
    const teamIndex = Number(button.dataset.teamMember);
    const member = button.dataset.member;
    const team = state.teamScores[teamIndex];
    if (!team || !member) return;
    const alreadySelected = (team.members || []).includes(member);
    state.teamScores.forEach((item) => {
      item.members = (item.members || []).filter((name) => name !== member);
    });
    if (!alreadySelected) team.members.push(member);
    saveState();
    renderAll();
  }));

  document.querySelector("[data-add-team]")?.addEventListener("click", () => {
    state.teamScores.push({ team: `Lag ${state.teamScores.length + 1}`, score: 0, members: [] });
    state.pentathlon.forEach((eventItem) => eventItem.scores.push(0));
    saveState();
    renderAll();
  });

  document.querySelectorAll("[data-delete-team]").forEach((button) => button.addEventListener("click", () => {
    if (state.teamScores.length <= 1) {
      showToast("Minst ett lag behövs");
      return;
    }
    const index = Number(button.dataset.deleteTeam);
    if (!window.confirm(`Radera laget ${state.teamScores[index]?.team || ""}?`)) return;
    state.teamScores.splice(index, 1);
    state.pentathlon.forEach((eventItem) => eventItem.scores.splice(index, 1));
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
  if (key === "missions") {
    const rows = [...document.querySelectorAll("[data-mission-admin-row]")]
      .map((row, index) => ({
        text: row.querySelector("[data-mission-admin-text]")?.value.trim() || "",
        points: Math.max(0, Math.min(20, Number(row.querySelector("[data-mission-admin-points]")?.value || missionPointsFor("", index)) || 0)),
      }))
      .filter((row) => row.text);
    if (!rows.length) {
      showToast("Listan kan inte vara tom");
      return false;
    }
    state.content.missions = normalizeMissionContent(rows);
    saveState();
    return true;
  }
  if (key === "quizQuestions") {
    const textarea = document.querySelector(`[data-content-editor="${key}"]`);
    if (!textarea) return false;
    const rows = normalizeQuizContent(textarea.value.split(/\n+/));
    if (!rows.length) {
      showToast("Quizet kan inte vara tomt");
      return false;
    }
    state.content.quizQuestions = rows;
    saveState();
    return true;
  }
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
      profile.voteDeck = [...editableVoteQuestions()];
      profile.votes = {};
    }
    if (key === "quizQuestions") {
      profile.quizAnswers = {};
      profile.quizAwarded = {};
      profile.quizIndex = 0;
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

document.addEventListener("click", (event) => {
  const dashboardToggle = event.target.closest("[data-dashboard-toggle]");
  if (!dashboardToggle) return;
  event.preventDefault();
  event.stopPropagation();
  const key = dashboardToggle.dataset.dashboardToggle;
  ensureEditableContent();
  const current = state.settings.dashboard?.[key] !== false;
  state.settings.dashboard[key] = !current;
  saveState();
  renderAll();
});

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
  state.adminReturnProfile = "";
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

function returnToPrepFromStartTab() {
  if (!state.profile) return;
  state.page = "prep";
  galleryIndex = null;
  galleryMotion = "open";
  showToast("Prepp öppnad");
  saveState();
  renderAll();
}

function handleTripleTap(event, key, callback) {
  const now = Date.now();
  const tracker = tripleTapTrackers[key] || { count: 0, last: 0, timer: null };
  tracker.count = now - tracker.last < 520 ? tracker.count + 1 : 1;
  tracker.last = now;
  clearTimeout(tracker.timer);
  tracker.timer = setTimeout(() => {
    tracker.count = 0;
  }, 620);
  tripleTapTrackers[key] = tracker;
  if (tracker.count < 3) return;
  event.preventDefault();
  tracker.count = 0;
  callback();
}

function handleDoubleTap(event, key, callback) {
  const now = Date.now();
  const tracker = tripleTapTrackers[key] || { count: 0, last: 0, timer: null };
  tracker.count = now - tracker.last < 520 ? tracker.count + 1 : 1;
  tracker.last = now;
  clearTimeout(tracker.timer);
  tracker.timer = setTimeout(() => {
    tracker.count = 0;
  }, 620);
  tripleTapTrackers[key] = tracker;
  if (tracker.count < 2) return;
  event.preventDefault();
  tracker.count = 0;
  callback();
}

function returnToLoginForTest() {
  clearTimeout(profileClickTimer);
  document.querySelector("#profile-dialog")?.close();
  state.profile = "";
  state.adminMode = false;
  state.adminOwner = "";
  state.adminReturnProfile = "";
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

function isStandaloneApp() {
  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

function updateInstallButton() {
  const button = document.querySelector("[data-install-app]");
  if (!button) return;
  button.hidden = isStandaloneApp();
}

function showInstallInstructions() {
  const isAppleMobile = /iPad|iPhone|iPod/.test(navigator.userAgent || "");
  if (isAppleMobile) {
    window.alert("På iPhone: tryck på dela-knappen i Safari och välj Lägg till på hemskärmen.");
    return;
  }
  window.alert("Öppna webbläsarens meny och välj Installera app eller Lägg till på hemskärmen.");
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  updateInstallButton();
});

window.addEventListener("appinstalled", () => {
  deferredInstallPrompt = null;
  updateInstallButton();
  showToast("Appen är tillagd");
});

document.querySelector("[data-install-app]")?.addEventListener("click", async () => {
  if (isStandaloneApp()) return;
  if (!deferredInstallPrompt) {
    showInstallInstructions();
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  updateInstallButton();
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => console.warn("Service worker kunde inte registreras", error));
  });
}

updateInstallButton();

function skipLoginForTest() {
  if (state.profile) return;
  state.profile = "Test";
  state.adminMode = false;
  state.adminOwner = "";
  state.adminReturnProfile = "";
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

document.querySelector("#profile-button").addEventListener("click", () => {
  if (!isAdmin()) return;
  document.querySelector("#profile-dialog").showModal();
});
document.querySelector("#countdown-ring")?.addEventListener("pointerup", (event) => {
  handleDoubleTap(event, "countdown", openPartyForTest);
});
document.querySelector('[data-section="today"]')?.addEventListener("pointerup", (event) => {
  handleTripleTap(event, "start-tab", toggleAdminFromStartTab);
});
document.querySelector("[data-admin-mode]").addEventListener("click", () => {
  if (!state.adminMode) return;
  leaveAdminMode();
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
  enterAdminMode();
  input.value = "";
  saveState();
  renderAll();
});

function enterAdminMode() {
  if (!state.profile) {
    showToast("VÃ¤lj profil fÃ¶rst");
    return;
  }
  if (!isAdmin()) state.adminReturnProfile = isAdminProfileName(state.profile) ? "" : state.profile;
  clearAdminPrepView();
  state.adminMode = true;
  state.adminOwner = ADMIN_PROFILE;
  state.profile = ADMIN_PROFILE;
  state.page = "party";
  state.section = "today";
  showToast("Admin mode pÃ¥");
  activeProfile();
}

function leaveAdminMode() {
  const returnProfile = state.adminReturnProfile && !isAdminProfileName(state.adminReturnProfile) ? state.adminReturnProfile : "";
  state.adminMode = false;
  state.adminOwner = "";
  state.adminReturnProfile = "";
  state.profile = returnProfile;
  if (state.profile) activeProfile();
  showToast(state.profile ? `Tillbaka som ${state.profile}` : "Admin mode av");
}

function toggleAdminFromStartTab() {
  if (isAdmin()) {
    setAdminPrepView();
    state.page = "prep";
    galleryIndex = null;
    galleryMotion = "open";
    showToast("Prepp oppnad");
  } else {
    enterAdminMode();
  }
  saveState();
  renderAll();
}

document.querySelector("#current-profile-card")?.addEventListener("dblclick", (event) => {
  event.preventDefault();
});
document.querySelector("#current-profile-card")?.addEventListener("pointerup", (event) => {
  event.preventDefault();
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
  if (isAdminProfileName(oldName)) {
    showToast("Välj en profil att byta namn på");
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
  if (!isAdmin()) return;
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
  toast.textContent = String(message)
    .replaceAll("ÃƒÂ¥", "å")
    .replaceAll("ÃƒÂ¤", "ä")
    .replaceAll("ÃƒÂ¶", "ö")
    .replaceAll("Ãƒâ€¦", "Å")
    .replaceAll("Ãƒâ€ž", "Ä")
    .replaceAll("Ãƒâ€“", "Ö");
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
