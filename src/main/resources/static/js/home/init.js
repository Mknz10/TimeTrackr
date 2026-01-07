(function (app) {
  function initializeDates() {
    const { selectedDateInput, selectedDateDisplay, heroTodayDate } = app.dom;
    const today = new Date();
    if (selectedDateInput) {
      selectedDateInput.valueAsDate = today;
    }
    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = today.toLocaleDateString(
        app.constants.APP_LOCALE
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
      app.manualActivity.setDefaultManualStartTime();
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

  function loadData() {
    if (app.categories) {
      app.categories.loadCategories();
    }
    if (app.activities) {
      app.activities.loadActivities();
    }
  }

  function init() {
    initializeDates();
    initializeFragments();
    loadData();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window.TimeTrackr || (window.TimeTrackr = {}));
