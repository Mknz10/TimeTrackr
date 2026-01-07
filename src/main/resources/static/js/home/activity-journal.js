(function (app) {
  const { ACTIVITY_API_URL, PERSONAL_ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const {
    table,
    chartsSection,
    statsTotalActivities,
    statsTotalHours,
    statsStudyHours,
    statsRangeLabel,
    selectedDateDisplay,
    selectedWorkspaceLabel,
    selectedDateInput,
    dateRangeSelect,
    datePrevBtn,
    dateNextBtn,
    exportCsvBtn,
  } = app.dom;
  const utils = app.utils;
  const { toLocalDateTimeString } = app.utils;
  const chartPalette = [
    "#ec4899",
    "#fb7185",
    "#f472b6",
    "#f9a8d4",
    "#fbcfe8",
    "#f43f5e",
  ];

  const workspaceDefaultLabel = "Selectează un workspace";

  function isWorkspaceMode() {
    return state.context === "workspace";
  }

  function findWorkspaceById(workspaceId) {
    if (
      workspaceId === null ||
      workspaceId === undefined ||
      workspaceId === ""
    ) {
      return null;
    }
    const numericId = Number(workspaceId);
    if (!Number.isFinite(numericId)) {
      return null;
    }
    const workspaces = Array.isArray(state.workspaces) ? state.workspaces : [];
    return (
      workspaces.find((workspace) => Number(workspace.id) === numericId) || null
    );
  }

  function isPersonalWorkspace(workspace, workspaceId) {
    if (!workspace) {
      return false;
    }
    if (Number(workspaceId) === 0) {
      return true;
    }
    const ownerNumeric = Number(workspace.owner);
    return Number.isFinite(ownerNumeric) && ownerNumeric === 0;
  }

  function resolveWorkspaceLabel() {
    if (!isWorkspaceMode()) {
      return "Activități personale";
    }
    const workspaceId = getWorkspaceId();
    if (
      workspaceId === null ||
      workspaceId === undefined ||
      workspaceId === ""
    ) {
      return workspaceDefaultLabel;
    }
    const workspace = findWorkspaceById(workspaceId);
    if (!workspace) {
      return workspaceDefaultLabel;
    }
    if (isPersonalWorkspace(workspace, workspaceId)) {
      return "Activități personale";
    }
    const name =
      typeof workspace.name === "string" ? workspace.name.trim() : "";
    const owner =
      typeof workspace.owner === "string" ? workspace.owner.trim() : "";
    if (name && owner) {
      return `${name} • ${owner}`;
    }
    return name || owner || workspaceDefaultLabel;
  }

  function updateWorkspaceLabel() {
    if (!selectedWorkspaceLabel) {
      return;
    }
    const label = resolveWorkspaceLabel();
    selectedWorkspaceLabel.textContent = label || "";
  }

  function updateStats(activities) {
    if (!statsTotalActivities || !statsTotalHours || !statsStudyHours) {
      return;
    }
    const totalHours = activities.reduce((sum, activity) => {
      const value = Number(activity.hours);
      return sum + (Number.isFinite(value) ? value : 0);
    }, 0);
    const studyHours = activities.reduce((sum, activity) => {
      const category = (activity.category || "").toLowerCase();
      const isStudyCategory = app.constants.STUDY_CATEGORY_KEYS.some((key) =>
        category.includes(key)
      );
      if (isStudyCategory) {
        const value = Number(activity.hours);
        return sum + (Number.isFinite(value) ? value : 0);
      }
      return sum;
    }, 0);

    statsTotalActivities.textContent = activities.length;
    statsTotalHours.textContent = utils.formatHoursValue(totalHours);
    statsStudyHours.textContent = utils.formatHoursValue(studyHours);
  }

  function renderCharts(activities) {
    if (!chartsSection) {
      return;
    }
    if (!activities || activities.length === 0) {
      chartsSection.classList.add("hidden");
      return;
    }
    chartsSection.classList.remove("hidden");

    const categoryTotals = {};
    activities.forEach((activity) => {
      categoryTotals[activity.category] =
        (categoryTotals[activity.category] || 0) + activity.hours;
    });

    const categoryLabels = Object.keys(categoryTotals);
    const categoryData = Object.values(categoryTotals);

    if (state.timeChart) {
      state.timeChart.destroy();
    }
    const timeCtx = document.getElementById("timeChart");
    state.timeChart = new Chart(timeCtx, {
      type: "doughnut",
      data: {
        labels: categoryLabels,
        datasets: [
          {
            data: categoryData,
            backgroundColor: categoryLabels.map(
              (_, index) => chartPalette[index % chartPalette.length]
            ),
            borderWidth: 1,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#9f1239",
            },
          },
        },
      },
    });

    const activityLabels = activities.map((activity) => activity.name);
    const activityData = activities.map((activity) => activity.hours);

    if (state.projectChart) {
      state.projectChart.destroy();
    }
    const projectCtx = document.getElementById("projectChart");
    state.projectChart = new Chart(projectCtx, {
      type: "bar",
      data: {
        labels: activityLabels,
        datasets: [
          {
            label: "Ore investite",
            data: activityData,
            backgroundColor: "#ec4899",
            borderRadius: 8,
          },
        ],
      },
      options: {
        scales: {
          x: {
            ticks: {
              color: "#9f1239",
            },
          },
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: "#9f1239",
            },
            grid: {
              color: "rgba(236, 72, 153, 0.1)",
            },
          },
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => {
                const value =
                  typeof context.parsed.y === "number" ? context.parsed.y : 0;
                return `${value.toFixed(2)} ore`;
              },
            },
          },
        },
      },
    });
  }

  function renderActivities() {
    updateWorkspaceLabel();
    if (!table) {
      return [];
    }
    const range = utils.getSelectedRange();
    const referenceDate = utils.getReferenceDate();
    const bounds = utils.getRangeBounds(referenceDate, range);

    const rangeLabel = utils.formatRangeLabel(range, bounds);
    const selectionLabel =
      range === "day"
        ? bounds.start.toLocaleDateString(app.constants.APP_LOCALE, {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : rangeLabel;
    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = selectionLabel;
    }
    if (statsRangeLabel) {
      statsRangeLabel.textContent = rangeLabel;
    }

    const filteredActivities = utils
      .filterActivitiesByBounds(bounds)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

    table.innerHTML = "";
    filteredActivities.forEach((activity) => {
      const row = table.insertRow();
      row.className = "bg-white bg-opacity-20";
      const startTime = new Date(activity.startTime);
      const endTime = new Date(activity.endTime);
      const startLabel = startTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const endLabel = endTime.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      const origin =
        typeof activity.source === "string"
          ? activity.source.toUpperCase()
          : "";
      const inferredOrigin =
        origin || (isWorkspaceMode() ? "WORKSPACE" : "PERSONAL");
      const isWorkspaceActivity = inferredOrigin === "WORKSPACE";
      const rawMemberName =
        typeof activity.memberName === "string"
          ? activity.memberName.trim()
          : "";
      const rawWorkspaceName =
        typeof activity.workspaceName === "string"
          ? activity.workspaceName.trim()
          : "";
      const workspaceLabel = isWorkspaceActivity
        ? rawWorkspaceName ||
          (isWorkspaceMode() ? resolveWorkspaceLabel() : "Workspace")
        : "Personal";
      const memberLabel = rawMemberName
        ? rawMemberName
        : isWorkspaceActivity
        ? "Membru necunoscut"
        : "Tu";
      const contextLabel = isWorkspaceMode() ? memberLabel : workspaceLabel;
      const hoursValue = utils.formatHoursValue(Number(activity.hours));
      const workspaceIdValue = isWorkspaceActivity
        ? activity.workspaceId
        : null;
      const deleteCall =
        workspaceIdValue === null || workspaceIdValue === undefined
          ? `deleteActivity(${activity.id})`
          : `deleteActivity(${activity.id}, ${workspaceIdValue})`;
      row.innerHTML = `
            <td class="p-2">${activity.name}</td>
            <td class="p-2">${activity.category}</td>
            <td class="p-2">${contextLabel}</td>
            <td class="p-2">${hoursValue}</td>
            <td class="p-2">${startLabel} - ${endLabel}</td>
            <td class="p-2">
                <button class="text-red-500 hover:underline" onclick="${deleteCall}">Șterge</button>
            </td>
        `;
    });

    renderCharts(filteredActivities);
    updateStats(filteredActivities);
    return filteredActivities;
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

  async function loadActivities() {
    if (!isWorkspaceMode()) {
      try {
        const response = await fetch(PERSONAL_ACTIVITY_API_URL);
        if (!response.ok) {
          throw new Error("Cannot load personal activities");
        }
        state.allActivities = await response.json();
        renderActivities();
      } catch (error) {
        console.error("Error fetching personal activities:", error);
        state.allActivities = [];
        updateStats([]);
        renderCharts([]);
      }
      return;
    }

    const workspaceId = getWorkspaceId();
    if (
      workspaceId === null ||
      workspaceId === undefined ||
      workspaceId === ""
    ) {
      state.allActivities = [];
      renderActivities();
      return;
    }
    try {
      const response = await fetch(
        `${ACTIVITY_API_URL}?workspaceId=${encodeURIComponent(workspaceId)}`
      );
      if (!response.ok) {
        throw new Error("Cannot load activities");
      }
      state.allActivities = await response.json();
      renderActivities();
    } catch (error) {
      console.error("Error fetching activities:", error);
      updateStats([]);
      renderCharts([]);
    }
  }

  function exportActivitiesToCsv(activities, range, bounds) {
    const header = [
      "Nume",
      "Categorie",
      "Context",
      "Ore",
      "Început",
      "Sfârșit",
    ];
    const rows = activities.map((activity) => {
      const origin =
        typeof activity.source === "string"
          ? activity.source.toUpperCase()
          : "";
      const inferredOrigin =
        origin || (isWorkspaceMode() ? "WORKSPACE" : "PERSONAL");
      const rawMemberName =
        typeof activity.memberName === "string"
          ? activity.memberName.trim()
          : "";
      const rawWorkspaceName =
        typeof activity.workspaceName === "string"
          ? activity.workspaceName.trim()
          : "";
      const workspaceName =
        inferredOrigin === "WORKSPACE"
          ? rawWorkspaceName ||
            (isWorkspaceMode() ? resolveWorkspaceLabel() : "Workspace")
          : "Personal";
      const memberName = rawMemberName
        ? rawMemberName
        : inferredOrigin === "WORKSPACE"
        ? "Membru necunoscut"
        : "Tu";
      const contextName = isWorkspaceMode() ? memberName : workspaceName;
      return [
        activity.name,
        activity.category,
        contextName,
        activity.hours,
        new Date(activity.startTime).toLocaleString(),
        new Date(activity.endTime).toLocaleString(),
      ];
    });

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((value) => {
            const stringValue = String(value ?? "");
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeLabel = utils
      .formatRangeLabel(range, bounds)
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9_\-]/g, "");
    link.href = url;
    link.download = `timetrackr_${safeLabel || "interval"}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    const range = utils.getSelectedRange();
    const referenceDate = utils.getReferenceDate();
    const bounds = utils.getRangeBounds(referenceDate, range);
    const activities = utils.filterActivitiesByBounds(bounds);
    if (!activities.length) {
      alert("Nu există activități pentru intervalul selectat.");
      return;
    }
    exportActivitiesToCsv(activities, range, bounds);
  }

  function updateSelectedDateInput(date) {
    if (!selectedDateInput || !(date instanceof Date)) {
      return;
    }
    const isoDate = toLocalDateTimeString(date).slice(0, 10);
    selectedDateInput.value = isoDate;
    if (typeof selectedDateInput.valueAsDate !== "undefined") {
      selectedDateInput.valueAsDate = new Date(date.getTime());
    }
  }

  function shiftSelectedDate(step) {
    if (!Number.isFinite(step)) {
      return;
    }
    const current = utils.getReferenceDate();
    if (!(current instanceof Date)) {
      return;
    }
    const range = utils.getSelectedRange();
    const next = new Date(current.getTime());

    if (range === "month") {
      const day = next.getDate();
      next.setDate(1);
      next.setMonth(next.getMonth() + step);
      const lastDay = new Date(
        next.getFullYear(),
        next.getMonth() + 1,
        0
      ).getDate();
      next.setDate(Math.min(day, lastDay));
    } else if (range === "week") {
      next.setDate(next.getDate() + step * 7);
    } else {
      next.setDate(next.getDate() + step);
    }

    updateSelectedDateInput(next);
    renderActivities();
  }

  function attachEventListeners() {
    if (selectedDateInput) {
      selectedDateInput.addEventListener("change", renderActivities);
    }
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener("change", renderActivities);
    }
    if (datePrevBtn) {
      datePrevBtn.addEventListener("click", () => shiftSelectedDate(-1));
    }
    if (dateNextBtn) {
      dateNextBtn.addEventListener("click", () => shiftSelectedDate(1));
    }
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", handleExport);
    }
  }

  window.deleteActivity = async function deleteActivity(id, workspaceId) {
    const hasWorkspaceId =
      workspaceId !== null &&
      workspaceId !== undefined &&
      workspaceId !== "" &&
      Number.isFinite(Number(workspaceId));

    if (!isWorkspaceMode()) {
      if (hasWorkspaceId) {
        try {
          const response = await fetch(
            `${ACTIVITY_API_URL}/${id}?workspaceId=${encodeURIComponent(
              Number(workspaceId)
            )}`,
            {
              method: "DELETE",
            }
          );
          if (response.ok) {
            await loadActivities();
          } else {
            alert("Failed to delete activity.");
          }
        } catch (error) {
          console.error(error);
        }
        return;
      }

      try {
        const response = await fetch(`${PERSONAL_ACTIVITY_API_URL}/${id}`, {
          method: "DELETE",
        });
        if (response.ok) {
          await loadActivities();
        } else {
          alert("Failed to delete activity.");
        }
      } catch (error) {
        console.error(error);
      }
      return;
    }

    const resolvedWorkspaceId = hasWorkspaceId
      ? Number(workspaceId)
      : getWorkspaceId();
    if (
      resolvedWorkspaceId === null ||
      resolvedWorkspaceId === undefined ||
      resolvedWorkspaceId === ""
    ) {
      return;
    }
    try {
      const response = await fetch(
        `${ACTIVITY_API_URL}/${id}?workspaceId=${encodeURIComponent(
          resolvedWorkspaceId
        )}`,
        {
          method: "DELETE",
        }
      );
      if (response.ok) {
        await loadActivities();
      } else {
        alert("Failed to delete activity.");
      }
    } catch (error) {
      console.error(error);
    }
  };

  app.activities = {
    renderActivities,
    loadActivities,
    exportActivitiesToCsv,
    updateStats,
    renderCharts,
    attachEventListeners,
    updateWorkspaceLabel,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
