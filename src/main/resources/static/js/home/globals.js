(function (app) {
  app.constants = {
    ACTIVITY_API_URL: "http://localhost:8080/api/activities",
    CATEGORY_API_URL: "http://localhost:8080/api/categories",
    PERSONAL_ACTIVITY_API_URL: "http://localhost:8080/api/personal/activities",
    PERSONAL_CATEGORY_API_URL: "http://localhost:8080/api/personal/categories",
    WORKSPACE_API_URL: "http://localhost:8080/api/workspaces",
    STUDY_CATEGORY_KEYS: [
      "studii",
      "study",
      "studying",
      "temă",
      "tema",
      "teme",
      "curs",
      "cursuri",
      "laborator",
      "seminar",
      "proiect",
      "examen",
      "învățare",
      "învatare",
      "learning",
      "homework",
      "course",
      "courses",
      "lab",
      "seminar",
      "project",
      "exam",
    ],
    APP_LOCALE: "ro-RO",
  };

  app.state = {
    context: document.body
      ? document.body.dataset.context || "personal"
      : "personal",
    cachedCategories: [],
    timeChart: null,
    projectChart: null,
    timerInterval: null,
    timerStartTime: null,
    todoInterval: null,
    todoEndTime: null,
    isTimerRunning: false,
    allActivities: [],
    workspaces: [],
    currentWorkspaceId: null,
    workspaceMembers: [],
  };

  app.dom = {
    table: document.getElementById("activityTable"),
    chartsSection: document.getElementById("chartsSection"),
    categorySelects: [
      document.getElementById("activityCategory"),
      document.getElementById("todoCategory"),
      document.getElementById("timerActivityCategory"),
    ],
    categoryToggleBtn: document.getElementById("toggleCategoryForm"),
    categoryFormContainer: document.getElementById("categoryFormContainer"),
    categoryFeedback: document.getElementById("categoryFeedback"),
    categoryChipList: document.getElementById("categoryChipList"),
    statsTotalActivities: document.getElementById("statsTotalActivities"),
    statsTotalHours: document.getElementById("statsTotalHours"),
    statsStudyHours: document.getElementById("statsStudyHours"),
    statsRangeLabel: document.getElementById("statsRangeLabel"),
    selectedDateInput: document.getElementById("selectedDate"),
    selectedDateDisplay: document.getElementById("selectedDateDisplay"),
    selectedWorkspaceLabel: document.getElementById("selectedWorkspaceLabel"),
    dateRangeSelect: document.getElementById("dateRange"),
    datePrevBtn: document.getElementById("datePrevBtn"),
    dateNextBtn: document.getElementById("dateNextBtn"),
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
    workspaceSelect: document.getElementById("workspaceSelect"),
    workspaceCreateBtn: document.getElementById("workspaceCreateBtn"),
    workspaceInviteBtn: document.getElementById("workspaceInviteBtn"),
    workspaceRenameBtn: document.getElementById("workspaceRenameBtn"),
    workspaceLeaveBtn: document.getElementById("workspaceLeaveBtn"),
    workspaceNameDisplay: document.getElementById("workspaceNameDisplay"),
    workspacePrevBtn: document.getElementById("workspacePrevBtn"),
    workspaceNextBtn: document.getElementById("workspaceNextBtn"),
    workspaceMemberContent: document.getElementById("workspaceMemberContent"),
    workspaceMemberList: document.getElementById("workspaceMemberList"),
    workspaceMemberEmptyState: document.getElementById(
      "workspaceMemberEmptyState"
    ),
    workspaceMemberCount: document.getElementById("workspaceMemberCount"),
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

  function toLocalDateTimeString(date) {
    const pad = (value) => String(value).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  app.utils = {
    formatHoursValue,
    formatDateForDisplay,
    getSelectedRange,
    getReferenceDate,
    getRangeBounds,
    formatRangeLabel,
    filterActivitiesByBounds,
    toLocalDateTimeString,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
