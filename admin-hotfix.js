(function () {
  const STORAGE_KEY = "midsommar-dashboard-v6";
  const ADMIN_PROFILE = "Admin";
  const tripleTap = { count: 0, last: 0, timer: null };

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

  function isAdminState(state) {
    return state.adminMode === true && (state.profile === ADMIN_PROFILE || state.adminOwner);
  }

  function toggleAdmin() {
    const state = readState();
    if (!state.profile && !state.adminReturnProfile) return;

    if (isAdminState(state)) {
      const returnProfile = state.adminReturnProfile && state.adminReturnProfile !== ADMIN_PROFILE ? state.adminReturnProfile : "";
      state.profile = returnProfile;
      state.adminMode = false;
      state.adminOwner = "";
      state.adminReturnProfile = "";
    } else {
      state.adminReturnProfile = state.profile;
      state.profile = ADMIN_PROFILE;
      state.adminMode = true;
      state.adminOwner = "Max";
    }

    writeState(state);
    window.location.reload();
  }

  function handleTripleTap(event) {
    const now = Date.now();
    tripleTap.count = now - tripleTap.last < 520 ? tripleTap.count + 1 : 1;
    tripleTap.last = now;
    clearTimeout(tripleTap.timer);
    tripleTap.timer = setTimeout(() => {
      tripleTap.count = 0;
    }, 620);

    if (tripleTap.count < 3) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    tripleTap.count = 0;
    toggleAdmin();
  }

  document.querySelector('[data-section="today"]')?.addEventListener("pointerup", handleTripleTap, true);
})();