(function (app) {
  const { ACTIVITY_API_URL } = app.constants;
  const state = app.state;
  const {
    table,
    chartsSection,
    statsTotalActivities,
    statsTotalHours,
    statsStudyHours,
    statsRangeLabel,
    selectedDateDisplay,
    selectedDateInput,
    dateRangeSelect,
    exportCsvBtn,
  } = app.dom;
  const utils = app.utils;

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
    state.timeChart = new Chart(document.getElementById("timeChart"), {
      type: "pie",
      data: { labels: categoryLabels, datasets: [{ data: categoryData }] },
    });

    const activityLabels = activities.map((activity) => activity.name);
    const activityData = activities.map((activity) => activity.hours);

    if (state.projectChart) {
      state.projectChart.destroy();
    }
    state.projectChart = new Chart(document.getElementById("projectChart"), {
      type: "bar",
      data: {
        labels: activityLabels,
        datasets: [{ label: "Ore", data: activityData }],
      },
      options: { scales: { y: { beginAtZero: true } } },
    });
  }

  function renderActivities() {
    if (!table) {
      return [];
    }
    const range = utils.getSelectedRange();
    const referenceDate = utils.getReferenceDate();
    const bounds = utils.getRangeBounds(referenceDate, range);

    const rangeLabel = utils.formatRangeLabel(range, bounds);
    if (selectedDateDisplay) {
      selectedDateDisplay.textContent = rangeLabel;
    }
    if (statsRangeLabel) {
      statsRangeLabel.textContent = rangeLabel;
    }

    const filteredActivities = utils.filterActivitiesByBounds(bounds).sort(
      (a, b) => new Date(a.startTime) - new Date(b.startTime)
    );

    table.innerHTML = "";
    filteredActivities.forEach((activity) => {
      const row = table.insertRow();
      row.className = "bg-white bg-opacity-20";
      const startTime = new Date(activity.startTime);
      const endTime = new Date(activity.endTime);
      row.innerHTML = `
            <td class="p-2">${activity.name}</td>
            <td class="p-2">${activity.category}</td>
            <td class="p-2">${activity.hours}</td>
            <td class="p-2">${startTime.toLocaleString()} - ${endTime.toLocaleString()}</td>
            <td class="p-2">
                <button class="text-red-500 hover:underline" onclick="deleteActivity(${activity.id})">Șterge</button>
            </td>
        `;
    });

    renderCharts(filteredActivities);
    updateStats(filteredActivities);
    return filteredActivities;
  }

  async function loadActivities() {
    try {
      const response = await fetch(ACTIVITY_API_URL);
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
    const header = ["Nume", "Categorie", "Ore", "Început", "Sfârșit"];
    const rows = activities.map((activity) => [
      activity.name,
      activity.category,
      activity.hours,
      new Date(activity.startTime).toLocaleString(),
      new Date(activity.endTime).toLocaleString(),
    ]);

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

  function attachEventListeners() {
    if (selectedDateInput) {
      selectedDateInput.addEventListener("change", renderActivities);
    }
    if (dateRangeSelect) {
      dateRangeSelect.addEventListener("change", renderActivities);
    }
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener("click", handleExport);
    }
  }

  window.deleteActivity = async function deleteActivity(id) {
    try {
      const response = await fetch(`${ACTIVITY_API_URL}/${id}`, {
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
  };

  app.activities = {
    renderActivities,
    loadActivities,
    exportActivitiesToCsv,
    updateStats,
    renderCharts,
    attachEventListeners,
  };
})(window.TimeTrackr || (window.TimeTrackr = {}));
