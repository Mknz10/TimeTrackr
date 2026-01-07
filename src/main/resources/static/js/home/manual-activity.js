(function (app) {
  const { ACTIVITY_API_URL, PERSONAL_ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const { activityForm, categorySelects } = app.dom;
  const { toLocalDateTimeString } = app.utils;
  const QUICK_BUTTON_BASE_CLASS =
    "rounded-full border border-pink-200 bg-white/80 px-4 py-2 text-sm font-medium text-pink-500 transition hover:border-pink-400 hover:text-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300";
  const QUICK_BUTTON_ACTIVE_CLASS =
    "rounded-full border border-pink-500 bg-pink-500 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-300";
  let activeDurationHours = null;

  function isWorkspaceMode() {
    return state.context === "workspace";
  }

  function getWorkspaceId() {
    if (
      !app.workspaces ||
      typeof app.workspaces.getCurrentWorkspaceId !== "function"
    ) {
      return null;
    }
    return app.workspaces.getCurrentWorkspaceId();
  }

  function getTimeInputs() {
    return {
      nameField: document.getElementById("activityName"),
      categoryField: document.getElementById("activityCategory"),
      startField: document.getElementById("activityStartTime"),
      endField: document.getElementById("activityEndTime"),
      hoursField: document.getElementById("activityHours"),
      durationLabel: document.getElementById("activityDurationLabel"),
      durationButtons: document.getElementById("durationQuickButtons"),
      startNowButton: document.getElementById("activityStartNow"),
    };
  }

  function getQuickDurationButtons() {
    const { durationButtons } = getTimeInputs();
    if (!durationButtons) {
      return [];
    }
    return Array.from(
      durationButtons.querySelectorAll("button[data-duration]") || []
    );
  }

  function clearQuickDurationSelection() {
    activeDurationHours = null;
    const buttons = getQuickDurationButtons();
    buttons.forEach((button) => {
      button.className = QUICK_BUTTON_BASE_CLASS;
      button.setAttribute("aria-pressed", "false");
    });
  }

  function setQuickDurationSelection(durationHours, button) {
    activeDurationHours = Number.isFinite(durationHours) ? durationHours : null;
    const buttons = getQuickDurationButtons();
    let reference = button;
    if (!reference && Number.isFinite(durationHours)) {
      reference = buttons.find(
        (item) =>
          parseFloat(item.getAttribute("data-duration")) === durationHours
      );
    }
    buttons.forEach((item) => {
      const isActive = reference ? item === reference : false;
      item.className = isActive
        ? QUICK_BUTTON_ACTIVE_CLASS
        : QUICK_BUTTON_BASE_CLASS;
      item.setAttribute("aria-pressed", isActive ? "true" : "false");
    });
  }

  function formatForInput(date) {
    const rounded = new Date(date.getTime());
    rounded.setSeconds(0, 0);
    return toLocalDateTimeString(rounded).slice(0, 16);
  }

  function calculateHoursBetween(startValue, endValue) {
    if (!startValue || !endValue) {
      return null;
    }
    const start = new Date(startValue);
    const end = new Date(endValue);
    const diff = end.getTime() - start.getTime();
    if (diff <= 0) {
      return null;
    }
    return diff / 3600000;
  }

  function updateDurationDisplay() {
    const { startField, endField, hoursField, durationLabel } = getTimeInputs();
    if (!startField || !endField || !hoursField) {
      return null;
    }

    endField.min = startField.value || "";

    if (!startField.value || !endField.value) {
      hoursField.value = "";
      endField.setCustomValidity("");
      if (durationLabel) {
        durationLabel.textContent =
          "Alege un interval pentru a vedea durata totală.";
      }
      return null;
    }

    const hours = calculateHoursBetween(startField.value, endField.value);
    if (hours === null) {
      hoursField.value = "";
      endField.setCustomValidity("Ora de final trebuie să fie după început.");
      if (durationLabel) {
        durationLabel.textContent =
          "Intervalul ales nu este valid. Ajustează ora de final.";
      }
      return null;
    }

    const roundedHours = Math.round(hours * 100) / 100;
    hoursField.value = String(roundedHours);
    endField.setCustomValidity("");

    if (durationLabel) {
      const totalMinutes = Math.round(roundedHours * 60);
      const hoursPart = Math.floor(totalMinutes / 60);
      const minutesPart = totalMinutes % 60;
      const parts = [];
      if (hoursPart > 0) {
        parts.push(`${hoursPart} ${hoursPart === 1 ? "oră" : "ore"}`);
      }
      if (minutesPart > 0) {
        parts.push(`${minutesPart} min`);
      }
      const friendly = parts.length ? parts.join(" și ") : "0 min";
      durationLabel.textContent = `Durată totală: ${roundedHours.toFixed(
        2
      )} ore (${friendly})`;
    }

    return roundedHours;
  }

  function setDefaultManualRange() {
    const { startField, endField } = getTimeInputs();
    if (!startField || !endField) {
      return;
    }
    const now = new Date();
    now.setMinutes(Math.floor(now.getMinutes() / 15) * 15);
    now.setSeconds(0, 0);
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    startField.value = formatForInput(now);
    endField.value = formatForInput(later);
    endField.min = startField.value;
    clearQuickDurationSelection();
    updateDurationDisplay();
    const defaultButton = getQuickDurationButtons().find((button) => {
      return button.getAttribute("data-duration") === "1";
    });
    if (defaultButton) {
      setQuickDurationSelection(1, defaultButton);
    } else {
      activeDurationHours = 1;
    }
  }

  function applyQuickDuration(durationHours) {
    const { startField, endField } = getTimeInputs();
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      return;
    }
    if (!startField || !endField) {
      return;
    }

    if (!startField.value) {
      const now = new Date();
      now.setMinutes(Math.floor(now.getMinutes() / 15) * 15);
      now.setSeconds(0, 0);
      startField.value = formatForInput(now);
    }

    const startDate = new Date(startField.value);
    if (Number.isNaN(startDate.getTime())) {
      return;
    }

    const endDate = new Date(startDate.getTime() + durationHours * 3600000);
    endField.value = formatForInput(endDate);
    endField.min = startField.value;
    updateDurationDisplay();
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const { nameField, categoryField, startField, endField, hoursField } =
      getTimeInputs();

    if (
      !nameField ||
      !categoryField ||
      !hoursField ||
      !startField ||
      !endField
    ) {
      return;
    }

    const name = nameField.value.trim();
    const category = categoryField.value;
    const startValue = startField.value;
    const endValue = endField.value;

    const computedHours = updateDurationDisplay();

    if (!name || !category || !startValue || !endValue) {
      alert("Te rugăm să completezi corect toate câmpurile obligatorii.");
      return;
    }

    if (
      computedHours === null ||
      Number.isNaN(computedHours) ||
      computedHours <= 0
    ) {
      alert("Ora de final trebuie să fie după început.");
      return;
    }

    const startTime = new Date(startValue);
    const endTime = new Date(endValue);
    const durationHours = Math.round(computedHours * 100) / 100;

    const activity = {
      name,
      category,
      hours: durationHours,
      startTime: toLocalDateTimeString(startTime),
      endTime: toLocalDateTimeString(endTime),
    };

    try {
      let requestUrl = PERSONAL_ACTIVITY_API_URL;
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
      };

      if (isWorkspaceMode()) {
        const workspaceId = getWorkspaceId();
        if (!workspaceId) {
          alert(
            "Selectează un workspace activ înainte de a salva activitatea."
          );
          return;
        }
        requestUrl = `${ACTIVITY_API_URL}?workspaceId=${encodeURIComponent(
          workspaceId
        )}`;
      }

      const response = await fetch(requestUrl, options);

      if (response.ok) {
        await app.activities.loadActivities();
        if (activityForm) {
          activityForm.reset();
        }
        setDefaultManualRange();
        const primarySelect = categorySelects[0];
        if (primarySelect && app.categories) {
          app.categories.resetCategorySelection(primarySelect);
        }
      } else {
        alert("Nu s-a putut adăuga activitatea.");
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  }

  function init() {
    const { startField, endField, startNowButton, durationButtons } =
      getTimeInputs();

    if (!startField || !endField || !startField.value || !endField.value) {
      setDefaultManualRange();
    } else {
      clearQuickDurationSelection();
      updateDurationDisplay();
    }

    if (activityForm) {
      activityForm.addEventListener("submit", handleSubmit);
    }

    if (startField) {
      const handleStartChange = () => {
        if (endField && startField.value && endField.value) {
          const startDate = new Date(startField.value);
          const endDate = new Date(endField.value);
          if (Number.isNaN(startDate.getTime())) {
            clearQuickDurationSelection();
            updateDurationDisplay();
            return;
          }
          if (Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            const adjustedEnd = new Date(startDate.getTime() + 30 * 60 * 1000);
            endField.value = formatForInput(adjustedEnd);
          }
        }
        if (!startField.value && endField) {
          endField.min = "";
          clearQuickDurationSelection();
          updateDurationDisplay();
          return;
        }
        if (activeDurationHours !== null) {
          applyQuickDuration(activeDurationHours);
        } else {
          clearQuickDurationSelection();
          updateDurationDisplay();
        }
      };
      startField.addEventListener("input", handleStartChange);
      startField.addEventListener("change", handleStartChange);
    }

    if (endField) {
      const handleEndChange = () => {
        clearQuickDurationSelection();
        updateDurationDisplay();
      };
      endField.addEventListener("input", handleEndChange);
      endField.addEventListener("change", handleEndChange);
    }

    if (startNowButton && startField) {
      startNowButton.addEventListener("click", (event) => {
        event.preventDefault();
        const now = new Date();
        now.setMinutes(Math.floor(now.getMinutes() / 5) * 5);
        now.setSeconds(0, 0);
        startField.value = formatForInput(now);
        if (endField) {
          const currentEnd = endField.value ? new Date(endField.value) : null;
          if (
            !currentEnd ||
            Number.isNaN(currentEnd.getTime()) ||
            currentEnd <= now
          ) {
            const duration = activeDurationHours || 0.5;
            const defaultEnd = new Date(now.getTime() + duration * 3600000);
            endField.value = formatForInput(defaultEnd);
          }
        }
        if (activeDurationHours !== null) {
          applyQuickDuration(activeDurationHours);
        } else {
          clearQuickDurationSelection();
          updateDurationDisplay();
        }
      });
    }

    if (durationButtons) {
      durationButtons.addEventListener("click", (event) => {
        const source = event.target;
        if (!source || typeof source.closest !== "function") {
          return;
        }
        const button = source.closest("button[data-duration]");
        if (!button) {
          return;
        }
        event.preventDefault();
        const durationValue = parseFloat(button.getAttribute("data-duration"));
        if (!Number.isFinite(durationValue) || durationValue <= 0) {
          return;
        }
        const isAlreadyActive = button.getAttribute("aria-pressed") === "true";
        if (isAlreadyActive) {
          clearQuickDurationSelection();
          updateDurationDisplay();
          return;
        }
        setQuickDurationSelection(durationValue, button);
        applyQuickDuration(durationValue);
      });
    }
  }

  app.manualActivity = {
    setDefaultManualRange,
    init,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
