(function (app) {
  const { ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const {
    todoTimerDisplay,
    todoNameInput,
    todoHoursInput,
    todoStartBtn,
    todoCategoryInput,
  } = app.dom;

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
    alert(`Time is up for "${name}"!`);

    const activity = {
      name,
      category,
      hours,
      startTime: startTime.toISOString(),
      endTime: state.todoEndTime.toISOString(),
    };

    try {
      const response = await fetch(ACTIVITY_API_URL, {
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

  function handleCountdownStart() {
    if (!todoNameInput || !todoCategoryInput || !todoHoursInput) {
      return;
    }
    const name = todoNameInput.value.trim();
    const category = todoCategoryInput.value;
    const hours = parseFloat(todoHoursInput.value);
    if (!name || !category || Number.isNaN(hours) || hours <= 0) {
      alert("Enter valid name, category & duration");
      return;
    }

    const startTime = new Date();
    state.todoEndTime = new Date(startTime.getTime() + hours * 3600000);

    if (state.todoInterval) {
      clearInterval(state.todoInterval);
    }

    state.todoInterval = setInterval(async () => {
      const remaining = state.todoEndTime - new Date();
      if (remaining <= 0) {
        clearInterval(state.todoInterval);
        state.todoInterval = null;
        await finalizeCountdown(name, category, hours, startTime);
        return;
      }
      updateCountdownDisplay(remaining);
    }, 1000);
  }

  function init() {
    if (todoStartBtn) {
      todoStartBtn.addEventListener("click", handleCountdownStart);
    }
  }

  app.todoCountdown = {
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
