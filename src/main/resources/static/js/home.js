const ACTIVITY_API_URL = "http://localhost:8080/api/activities";
const CATEGORY_API_URL = "http://localhost:8080/api/categories";

const table = document.getElementById("activityTable");
const chartsSection = document.getElementById("chartsSection");
const categorySelects = [
  document.getElementById("activityCategory"),
  document.getElementById("todoCategory"),
  document.getElementById("timerActivityCategory"),
];
const categoryFeedback = document.getElementById("categoryFeedback");

let cachedCategories = ["Muncă", "Studii", "Relaxare"];

let timeChart = null;
let projectChart = null;

let timerInterval = null;
let timerStartTime = null;

let todoInterval = null;
let todoEndTime = null;

const selectedDateInput = document.getElementById("selectedDate");
const selectedDateDisplay = document.getElementById("selectedDateDisplay");
const dateRangeSelect = document.getElementById("dateRange");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const today = new Date();
selectedDateInput.valueAsDate = today;
selectedDateDisplay.textContent = today.toLocaleDateString();
let allActivities = [];

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

function renderCategoryOptions(categories) {
  categorySelects.forEach((select) => {
    if (!select) return;
    const previousValue = select.value;
    select.innerHTML = "";
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    });
    if (categories.includes(previousValue)) {
      select.value = previousValue;
    } else if (categories.length > 0) {
      select.value = categories[0];
    }
  });
}

function showCategoryFeedback(message, isSuccess) {
  if (!categoryFeedback) {
    return;
  }
  if (!message) {
    categoryFeedback.textContent = "";
    categoryFeedback.className = "text-sm mt-2";
    return;
  }
  categoryFeedback.textContent = message;
  categoryFeedback.className = isSuccess
    ? "text-sm mt-2 text-green-500"
    : "text-sm mt-2 text-red-500";
}

function resetCategorySelection(select) {
  if (select && cachedCategories.length > 0) {
    const matching = cachedCategories.find(
      (category) => category === select.value
    );
    if (!matching) {
      select.value = cachedCategories[0];
    }
  }
}

async function loadCategories() {
  try {
    const response = await fetch(CATEGORY_API_URL);
    if (!response.ok) {
      throw new Error("Nu s-au putut încărca categoriile.");
    }
    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      cachedCategories = data;
      renderCategoryOptions(cachedCategories);
      showCategoryFeedback("", true);
    } else {
      showCategoryFeedback("", true);
    }
  } catch (error) {
    console.error("Error fetching categories:", error);
    showCategoryFeedback("Nu s-au putut încărca categoriile.", false);
  }
}

function formatDateForDisplay(date) {
  return date.toLocaleDateString();
}

function getSelectedRange() {
  return dateRangeSelect ? dateRangeSelect.value : "day";
}

function getReferenceDate() {
  const value = selectedDateInput.valueAsDate;
  if (value) {
    return new Date(value.getTime());
  }
  const fallback = new Date();
  selectedDateInput.valueAsDate = fallback;
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
    return bounds.start.toLocaleDateString(undefined, {
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

function filterActivitiesByBounds(bounds) {
  return allActivities.filter((activity) => {
    const start = new Date(activity.startTime);
    return start >= bounds.start && start <= bounds.end;
  });
}

function renderActivities() {
  const range = getSelectedRange();
  const referenceDate = getReferenceDate();
  const bounds = getRangeBounds(referenceDate, range);
  selectedDateDisplay.textContent = formatRangeLabel(range, bounds);

  const filteredActivities = filterActivitiesByBounds(bounds);
  const sortedActivities = filteredActivities
    .slice()
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  table.innerHTML = "";

  sortedActivities.forEach((activity) => {
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

  renderCharts(sortedActivities);
  return sortedActivities;
}

async function loadActivities() {
  try {
    const response = await fetch(ACTIVITY_API_URL);
    if (!response.ok) {
      throw new Error("Cannot load activities");
    }
    allActivities = await response.json();
    renderActivities();
  } catch (error) {
    console.error("Error fetching activities:", error);
  }
}

function renderCharts(activities) {
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

  if (timeChart) timeChart.destroy();
  timeChart = new Chart(document.getElementById("timeChart"), {
    type: "pie",
    data: { labels: categoryLabels, datasets: [{ data: categoryData }] },
  });

  const activityLabels = activities.map((activity) => activity.name);
  const activityData = activities.map((activity) => activity.hours);

  if (projectChart) projectChart.destroy();
  projectChart = new Chart(document.getElementById("projectChart"), {
    type: "bar",
    data: {
      labels: activityLabels,
      datasets: [{ label: "Ore", data: activityData }],
    },
    options: { scales: { y: { beginAtZero: true } } },
  });
}

selectedDateInput.addEventListener("change", renderActivities);
if (dateRangeSelect) {
  dateRangeSelect.addEventListener("change", renderActivities);
}
if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", () => {
    const range = getSelectedRange();
    const referenceDate = getReferenceDate();
    const bounds = getRangeBounds(referenceDate, range);
    const activities = filterActivitiesByBounds(bounds);
    if (!activities.length) {
      alert("Nu există activități pentru intervalul selectat.");
      return;
    }
    exportActivitiesToCsv(activities, range, bounds);
  });
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
  const safeLabel = formatRangeLabel(range, bounds)
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-]/g, "");
  link.href = url;
  link.download = `timetrackr_${safeLabel || "interval"}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const activityForm = document.getElementById("activityForm");
if (activityForm) {
  activityForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("activityName").value.trim();
    const category = document.getElementById("activityCategory").value;
    const hours = parseFloat(document.getElementById("activityHours").value);
    const startInput = document.getElementById("activityStartTime").value;

    if (!name || !category || isNaN(hours) || hours <= 0) {
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
        await loadActivities();
        this.reset();
        setDefaultManualStartTime();
        resetCategorySelection(document.getElementById("activityCategory"));
      } else {
        alert("Failed to add activity.");
      }
    } catch (error) {
      console.error("Error adding activity:", error);
    }
  });
}

const categoryForm = document.getElementById("newCategoryForm");
if (categoryForm) {
  categoryForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("newCategoryName");
    const name = input.value.trim();

    if (!name) {
      showCategoryFeedback("Introduceți un nume valid.", false);
      return;
    }

    try {
      const response = await fetch(CATEGORY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch (parseError) {
        data = null;
      }

      if (response.ok && Array.isArray(data)) {
        cachedCategories = data;
        renderCategoryOptions(cachedCategories);
        showCategoryFeedback("Categorie adăugată.", true);
        input.value = "";
        const primarySelect = categorySelects[0];
        if (primarySelect) {
          const match = cachedCategories.find(
            (category) => category.toLowerCase() === name.toLowerCase()
          );
          if (match) {
            primarySelect.value = match;
          }
        }
      } else {
        const message =
          (data && (data.message || data.error || data.status || data.detail)) ||
          "Categoria există deja.";
        showCategoryFeedback(message, false);
      }
    } catch (error) {
      console.error("Error adding category:", error);
      showCategoryFeedback("Nu s-a putut adăuga categoria.", false);
    }
  });
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

const timerDisplay = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const timerActivityName = document.getElementById("timerActivityName");
const timerActivityCategory = document.getElementById("timerActivityCategory");

startBtn.addEventListener("click", () => {
  const name = timerActivityName.value.trim();
  const category = timerActivityCategory.value.trim();
  if (!name || !category) {
    alert("Enter name & category");
    return;
  }

  timerStartTime = new Date();
  if (timerInterval) clearInterval(timerInterval);

  timerInterval = setInterval(() => {
    const elapsed = new Date() - timerStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    timerDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }, 1000);
});

stopBtn.addEventListener("click", async () => {
  if (!timerStartTime) return;

  clearInterval(timerInterval);
  const endTime = new Date();
  const hours = (endTime - timerStartTime) / 3600000;

  const activity = {
    name: timerActivityName.value.trim(),
    category: timerActivityCategory.value.trim(),
    hours: parseFloat(hours.toFixed(2)),
    startTime: timerStartTime.toISOString(),
    endTime: endTime.toISOString(),
  };

  try {
    const response = await fetch(ACTIVITY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(activity),
    });
    if (response.ok) {
      await loadActivities();
      timerActivityName.value = "";
      resetCategorySelection(timerActivityCategory);
      timerDisplay.textContent = "00:00:00";
      timerStartTime = null;
    } else alert("Failed to save activity.");
  } catch (error) {
    console.error(error);
  }
});

const todoTimerDisplay = document.getElementById("todoTimer");
const todoNameInput = document.getElementById("todoName");
const todoHoursInput = document.getElementById("todoHours");
const todoStartBtn = document.getElementById("todoStart");
const todoCategoryInput = document.getElementById("todoCategory");

todoStartBtn.addEventListener("click", () => {
  const name = todoNameInput.value.trim();
  const category = todoCategoryInput.value;
  const hours = parseFloat(todoHoursInput.value);
  if (!name || !category || isNaN(hours) || hours <= 0) {
    alert("Enter valid name, category & duration");
    return;
  }

  const startTime = new Date();
  todoEndTime = new Date(startTime.getTime() + hours * 3600000);

  if (todoInterval) clearInterval(todoInterval);

  todoInterval = setInterval(async () => {
    const remaining = todoEndTime - new Date();
    if (remaining <= 0) {
      clearInterval(todoInterval);
      todoTimerDisplay.textContent = "00:00:00";
      alert(`Time is up for "${name}"!`);

      const activity = {
        name,
        category,
        hours,
        startTime: startTime.toISOString(),
        endTime: todoEndTime.toISOString(),
      };
      try {
        const response = await fetch(ACTIVITY_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(activity),
        });
        if (response.ok) {
          await loadActivities();
          todoNameInput.value = "";
          todoHoursInput.value = "";
          resetCategorySelection(todoCategoryInput);
        } else alert("Failed to save To-Do.");
      } catch (error) {
        console.error(error);
      }

      return;
    }
    const h = Math.floor(remaining / 3600000);
    const m = Math.floor((remaining % 3600000) / 60000);
    const s = Math.floor((remaining % 60000) / 1000);
    todoTimerDisplay.textContent = `${String(h).padStart(2, "0")}:${String(
      m
    ).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }, 1000);
});

document.addEventListener("DOMContentLoaded", () => {
  setDefaultManualStartTime();
  renderCategoryOptions(cachedCategories);
  loadCategories();
  loadActivities();
});
