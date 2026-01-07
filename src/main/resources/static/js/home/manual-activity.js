(function (app) {
  const { ACTIVITY_API_URL } = app.constants;
  const { activityForm, categorySelects } = app.dom;

  function setDefaultManualStartTime() {
    const startInput = document.getElementById("activityStartTime");
    if (!startInput) {
      return;
    }
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    startInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nameField = document.getElementById("activityName");
    const categoryField = document.getElementById("activityCategory");
    const hoursField = document.getElementById("activityHours");
    const startField = document.getElementById("activityStartTime");

    if (!nameField || !categoryField || !hoursField) {
      return;
    }

    const name = nameField.value.trim();
    const category = categoryField.value;
    const hours = parseFloat(hoursField.value);
    const startInput = startField ? startField.value : "";

    if (!name || !category || Number.isNaN(hours) || hours <= 0) {
      alert("Please fill in all required fields correctly.");
      return;
    }

    const startTime = startInput ? new Date(startInput) : new Date();
    const endTime = new Date(startTime.getTime() + hours * 3600000);

    const activity = {
      name,
      category,
      hours,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    };

    try {
      const response = await fetch(ACTIVITY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
      });

      if (response.ok) {
        await app.activities.loadActivities();
        if (activityForm) {
          activityForm.reset();
        }
        setDefaultManualStartTime();
        const primarySelect = categorySelects[0];
        app.categories.resetCategorySelection(primarySelect);
      } else {
        alert("Failed to add activity.");
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  }

  function init() {
    if (activityForm) {
      activityForm.addEventListener("submit", handleSubmit);
    }
  }

  app.manualActivity = {
    setDefaultManualStartTime,
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
