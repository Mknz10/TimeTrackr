(function (app) {
  const { ACTIVITY_API_URL, PERSONAL_ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const { toLocalDateTimeString } = app.utils;
  const {
    todoTimerDisplay,
    todoNameInput,
    todoHoursInput,
    todoStartBtn,
    todoCategoryInput,
  } = app.dom;

  function isWorkspaceMode() {
    return state.context === "workspace";
  }

  function getWorkspaceId() {
    if (!isWorkspaceMode()) {
      return null;
    }
    if (
      !app.workspaces ||
      typeof app.workspaces.getCurrentWorkspaceId !== "function"
    ) {
      return null;
    }
    return app.workspaces.getCurrentWorkspaceId();
  }

  function setCountdownRunning(running) {
    state.todoRunning = running;
    if (!todoStartBtn) return;
    todoStartBtn.textContent = running ? "Stop" : "Start";
    todoStartBtn.classList.toggle("bg-pink-500", !running);
    todoStartBtn.classList.toggle("hover:bg-pink-600", !running);
    todoStartBtn.classList.toggle("bg-gray-600", running);
    todoStartBtn.classList.toggle("hover:bg-gray-700", running);
    if (todoNameInput) todoNameInput.disabled = running;
    if (todoCategoryInput) todoCategoryInput.disabled = running;
    if (todoHoursInput) todoHoursInput.disabled = running;
  }

  function resetCountdown() {
    clearInterval(state.todoInterval);
    state.todoInterval = null;
    state.todoEndTime = null;
    if (todoTimerDisplay) todoTimerDisplay.textContent = "00:00:00";
    setCountdownRunning(false);
  }

  function updateCountdownDisplay(remaining) {
    if (!todoTimerDisplay) {
      return;
    }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    todoTimerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  async function finalizeCountdown(name, category, hours, startTime) {
    if (todoTimerDisplay) {
      todoTimerDisplay.textContent = "00:00:00";
    }
    setCountdownRunning(false);
    alert(`Time is up for "${name}"!`);

    const activity = {
      name,
      category,
      hours,
      startTime: toLocalDateTimeString(startTime),
      endTime: toLocalDateTimeString(state.todoEndTime),
    };

    try {
      let requestUrl = PERSONAL_ACTIVITY_API_URL;
      if (isWorkspaceMode()) {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
          return;
        }
        requestUrl = `${ACTIVITY_API_URL}?workspaceId=${encodeURIComponent(
          workspaceId
        )}`;
      }

      const response = await fetch(requestUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
      });
      if (response.ok) {
        await app.activities.loadActivities();
        if (todoNameInput) todoNameInput.value = "";
        if (todoHoursInput) todoHoursInput.value = "";
        app.categories.resetCategorySelection(todoCategoryInput);
      } else {
        alert("Failed to save To-Do.");
      }
    } catch (error) {
      console.error(error);
    }
  }

  function handleCountdownToggle() {
    if (!todoNameInput || !todoCategoryInput || !todoHoursInput) {
      return;
    }

    if (state.todoRunning) {
      resetCountdown();
      return;
    }

    const name = todoNameInput.value.trim();
    const category = todoCategoryInput.value;
    const hours = parseFloat(todoHoursInput.value);
    if (!name || !category || Number.isNaN(hours) || hours <= 0) {
      alert("Enter valid name, category & duration");
      return;
    }

    if (isWorkspaceMode() && !getWorkspaceId()) {
      alert("Selectați un workspace activ.");
      return;
    }

    const startTime = new Date();
    state.todoEndTime = new Date(startTime.getTime() + hours * 3600000);
    setCountdownRunning(true);

    if (state.todoInterval) {
      clearInterval(state.todoInterval);
    }

    state.todoInterval = setInterval(async () => {
      const remaining = state.todoEndTime - new Date();
      if (remaining <= 0) {
        resetCountdown();
        await finalizeCountdown(name, category, hours, startTime);
        return;
      }
      updateCountdownDisplay(remaining);
    }, 1000);
  }

  function init() {
    if (todoStartBtn) {
      todoStartBtn.addEventListener("click", handleCountdownToggle);
    }
    setCountdownRunning(false);
  }

  app.todoCountdown = {
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
