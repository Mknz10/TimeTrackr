(function (app) {
  const { toLocalDateTimeString } = app.utils || {};

  function initializeDates() {
    const { selectedDateInput, selectedDateDisplay, heroTodayDate } = app.dom;
    const today = new Date();
    if (selectedDateInput) {
      if (typeof selectedDateInput.valueAsDate !== "undefined") {
        selectedDateInput.valueAsDate = today;
      }
      const formattedToday = toLocalDateTimeString
        ? toLocalDateTimeString(today).slice(0, 10)
        : null;
      if (formattedToday) {
        selectedDateInput.value = formattedToday;
      }
    }
    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = today.toLocaleDateString(
        app.constants.APP_LOCALE,
        {
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );
    }
    if (heroTodayDate) {
      heroTodayDate.textContent = today.toLocaleDateString(
        app.constants.APP_LOCALE,
        {
          weekday: "long",
          day: "numeric",
          month: "long",
        }
      );
    }
  }

  function initializeFragments() {
    if (app.categories) {
      app.categories.renderCategoryOptions(app.state.cachedCategories);
      app.categories.init();
    }
    if (app.manualActivity) {
      app.manualActivity.setDefaultManualRange();
      app.manualActivity.init();
    }
    if (app.activityTimer) {
      app.activityTimer.init();
    }
    if (app.todoCountdown) {
      app.todoCountdown.init();
    }
    if (app.activities) {
      app.activities.attachEventListeners();
      app.activities.renderActivities();
    }
  }

  async function loadData() {
    if (app.categories) {
      await app.categories.loadCategories();
    }
    if (app.activities) {
      await app.activities.loadActivities();
    }
  }

  async function init() {
    initializeDates();
    initializeFragments();
    if (app.workspaces && typeof app.workspaces.init === "function") {
      await app.workspaces.init();
    }
    await loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      init();
    });
  } else {
    init();
  }
})(window.TimeTrackr || (window.TimeTrackr = {}));
