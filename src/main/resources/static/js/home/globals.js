(function (app) {
  app.constants = {
    ACTIVITY_API_URL: "http://localhost:8080/api/activities",
    CATEGORY_API_URL: "http://localhost:8080/api/categories",
    STUDY_CATEGORY_KEYS: ["studii", "study", "studying"],
    APP_LOCALE: "ro-RO",
  };

  app.state = {
    cachedCategories: ["Muncă", "Studii", "Relaxare"],
    timeChart: null,
    projectChart: null,
    timerInterval: null,
    timerStartTime: null,
    todoInterval: null,
    todoEndTime: null,
    isTimerRunning: false,
    allActivities: [],
  };

  app.dom = {
    table: document.getElementById("activityTable"),
    chartsSection: document.getElementById("chartsSection"),
    categorySelects: [
      document.getElementById("activityCategory"),
      document.getElementById("todoCategory"),
      document.getElementById("timerActivityCategory"),
    ],
    categoryFeedback: document.getElementById("categoryFeedback"),
    categoryChipList: document.getElementById("categoryChipList"),
    statsTotalActivities: document.getElementById("statsTotalActivities"),
    statsTotalHours: document.getElementById("statsTotalHours"),
    statsStudyHours: document.getElementById("statsStudyHours"),
    statsRangeLabel: document.getElementById("statsRangeLabel"),
    selectedDateInput: document.getElementById("selectedDate"),
    selectedDateDisplay: document.getElementById("selectedDateDisplay"),
    dateRangeSelect: document.getElementById("dateRange"),
    exportCsvBtn: document.getElementById("exportCsvBtn"),
    heroTodayDate: document.getElementById("heroTodayDate"),
    activityForm: document.getElementById("activityForm"),
    categoryForm: document.getElementById("newCategoryForm"),
    timerDisplay: document.getElementById("timer"),
    timerToggleBtn: document.getElementById("timerToggleBtn"),
    timerActivityName: document.getElementById("timerActivityName"),
    timerActivityCategory: document.getElementById("timerActivityCategory"),
    todoTimerDisplay: document.getElementById("todoTimer"),
    todoNameInput: document.getElementById("todoName"),
    todoHoursInput: document.getElementById("todoHours"),
    todoStartBtn: document.getElementById("todoStart"),
    todoCategoryInput: document.getElementById("todoCategory"),
  };

  function formatHoursValue(hours) {
    if (!Number.isFinite(hours)) {
      return "0";
    }
    const rounded = Math.round(hours * 10) / 10;
    return rounded.toFixed(1).replace(/\.0$/, "");
  }

  function formatDateForDisplay(date) {
    return date.toLocaleDateString(app.constants.APP_LOCALE, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function getSelectedRange() {
    const select = app.dom.dateRangeSelect;
    return select ? select.value : "day";
  }

  function getReferenceDate() {
    const { selectedDateInput } = app.dom;
    if (selectedDateInput && selectedDateInput.valueAsDate) {
      return new Date(selectedDateInput.valueAsDate.getTime());
    }
    const fallback = new Date();
    if (selectedDateInput) {
      selectedDateInput.valueAsDate = fallback;
    }
    return fallback;
  }

  function getRangeBounds(referenceDate, range) {
    const start = new Date(referenceDate);
    start.setHours(0, 0, 0, 0);
    let end = new Date(start);

    if (range === "week") {
      const day = start.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setDate(start.getDate() + diff);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
    } else if (range === "month") {
      start.setDate(1);
      end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    }

    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  function formatRangeLabel(range, bounds) {
    if (range === "month") {
      return bounds.start.toLocaleDateString(app.constants.APP_LOCALE, {
        month: "long",
        year: "numeric",
      });
    }
    if (range === "week") {
      return `${formatDateForDisplay(bounds.start)} - ${formatDateForDisplay(
        bounds.end
      )}`;
    }
    return formatDateForDisplay(bounds.start);
  }

  function filterActivitiesByBounds(bounds, source) {
    const list = Array.isArray(source) ? source : app.state.allActivities;
    return list.filter((activity) => {
      const start = new Date(activity.startTime);
      return start >= bounds.start && start <= bounds.end;
    });
  }

  app.utils = {
    formatHoursValue,
    formatDateForDisplay,
    getSelectedRange,
    getReferenceDate,
    getRangeBounds,
    formatRangeLabel,
    filterActivitiesByBounds,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
