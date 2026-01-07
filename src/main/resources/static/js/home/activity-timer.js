(function (app) {
  const { ACTIVITY_API_URL, PERSONAL_ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const { toLocalDateTimeString } = app.utils;
  const {
    timerDisplay,
    timerToggleBtn,
    timerActivityName,
    timerActivityCategory,
  } = app.dom;

  function getWorkspaceId() {
    if (state.context !== "workspace") {
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

  function setTimerButtonState(running) {
    if (!timerToggleBtn) {
      return;
    }
    if (running) {
      timerToggleBtn.textContent = "Stop";
      timerToggleBtn.classList.remove(
        "bg-pink-500",
        "hover:bg-pink-600",
        "shadow-pink-500/40"
      );
      timerToggleBtn.classList.add(
        "bg-gray-600",
        "hover:bg-gray-700",
        "shadow-gray-600/30"
      );
    } else {
      timerToggleBtn.textContent = "Start";
      timerToggleBtn.classList.remove(
        "bg-gray-600",
        "hover:bg-gray-700",
        "shadow-gray-600/30"
      );
      timerToggleBtn.classList.add(
        "bg-pink-500",
        "hover:bg-pink-600",
        "shadow-pink-500/40"
      );
    }
  }

  function beginTimer() {
    if (!timerActivityName || !timerActivityCategory || !timerDisplay) {
      return;
    }
    const name = timerActivityName.value.trim();
    const category = timerActivityCategory.value.trim();
    if (!name || !category) {
      alert("Enter name & category");
      return;
    }

    if (state.context === "workspace" && !getWorkspaceId()) {
      alert("Selectați un workspace înainte de a porni timer-ul.");
      return;
    }

    state.timerStartTime = new Date();
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
    }

    state.timerInterval = setInterval(() => {
      if (!state.timerStartTime) {
        return;
      }
      const elapsed = new Date() - state.timerStartTime;
      const hours = Math.floor(elapsed / 3600000);
      const minutes = Math.floor((elapsed % 3600000) / 60000);
      const seconds = Math.floor((elapsed % 60000) / 1000);
      timerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }, 1000);

    state.isTimerRunning = true;
    setTimerButtonState(true);
  }

  async function finishTimer() {
    if (!state.timerStartTime) {
      setTimerButtonState(false);
      state.isTimerRunning = false;
      return;
    }

    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }

    const endTime = new Date();
    const hours = (endTime - state.timerStartTime) / 3600000;

    const activity = {
      name: timerActivityName ? timerActivityName.value.trim() : "",
      category: timerActivityCategory ? timerActivityCategory.value.trim() : "",
      hours: parseFloat(hours.toFixed(2)),
      startTime: toLocalDateTimeString(state.timerStartTime),
      endTime: toLocalDateTimeString(endTime),
    };

    try {
      let requestUrl = PERSONAL_ACTIVITY_API_URL;
      if (state.context === "workspace") {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
          alert("Selectați un workspace activ înainte de a salva activitatea.");
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
        if (timerActivityName) {
          timerActivityName.value = "";
        }
        app.categories.resetCategorySelection(timerActivityCategory);
        if (timerDisplay) {
          timerDisplay.textContent = "00:00:00";
        }
      } else {
        alert("Failed to save activity.");
      }
    } catch (error) {
      console.error(error);
    } finally {
      state.timerStartTime = null;
      state.isTimerRunning = false;
      setTimerButtonState(false);
    }
  }

  function handleToggle() {
    if (state.isTimerRunning) {
      finishTimer();
    } else {
      beginTimer();
    }
  }

  function init() {
    if (timerToggleBtn) {
      timerToggleBtn.addEventListener("click", handleToggle);
    }
  }

  app.activityTimer = {
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
