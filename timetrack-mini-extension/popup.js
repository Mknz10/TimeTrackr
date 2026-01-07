// timetrackr-mini-extension/popup.js

const timerDisplay = document.getElementById("timerDisplay");
const activityNameInput = document.getElementById("activityName");
const activityCategorySelect = document.getElementById("activityCategory");
const startBtn = document.getElementById("startBtn");
const stopBtn = document.getElementById("stopBtn");
const sendBtn = document.getElementById("sendBtn");
const statusMessage = document.getElementById("statusMessage");
const SERVER_URL = "http://localhost:8080/api/activities";
const SESSION_URL = "http://localhost:8080/api/session";
const CATEGORY_URL = "http://localhost:8080/api/categories";

const FALLBACK_CATEGORIES = ["Muncă", "Studii", "Relaxare"];
let categoryOptions = [...FALLBACK_CATEGORIES];
let categoryLoadPromise = null;

function populateCategoryOptions(preferredValue) {
  if (!activityCategorySelect) {
    return;
  }

  const options = categoryOptions.length
    ? categoryOptions
    : FALLBACK_CATEGORIES;
  const preferred = preferredValue ? preferredValue.toLowerCase() : null;
  let matched = false;

  activityCategorySelect.innerHTML = "";

  options.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;

    if (!matched && preferred && name.toLowerCase() === preferred) {
      option.selected = true;
      matched = true;
    }

    activityCategorySelect.appendChild(option);
  });

  if (!matched && activityCategorySelect.options.length > 0) {
    activityCategorySelect.selectedIndex = 0;
  }
}

function applyFallbackCategories(preferredValue) {
  categoryOptions = [...FALLBACK_CATEGORIES];
  populateCategoryOptions(preferredValue);
}

async function loadCategories() {
  const preferredValue = activityCategorySelect
    ? activityCategorySelect.value
    : null;

  if (!isAuthenticated) {
    applyFallbackCategories(preferredValue);
    return;
  }

  if (categoryLoadPromise) {
    return categoryLoadPromise;
  }

  categoryLoadPromise = (async () => {
    try {
      const response = await fetch(CATEGORY_URL, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          categoryOptions = data;
        } else {
          applyFallbackCategories(preferredValue);
          return;
        }
      } else {
        applyFallbackCategories(preferredValue);
        return;
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      applyFallbackCategories(preferredValue);
      return;
    } finally {
      populateCategoryOptions(preferredValue);
      categoryLoadPromise = null;
    }
  })();

  return categoryLoadPromise;
}

populateCategoryOptions(FALLBACK_CATEGORIES[0]);

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(
    s
  ).padStart(2, "0")}`;
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function toLocalDateTimeString(date) {
  const localDate = new Date(date);
  const year = localDate.getFullYear();
  const month = pad(localDate.getMonth() + 1);
  const day = pad(localDate.getDate());
  const hours = pad(localDate.getHours());
  const minutes = pad(localDate.getMinutes());
  const seconds = pad(localDate.getSeconds());
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function setStatus(text, cssClass) {
  if (!statusMessage) {
    return;
  }
  statusMessage.textContent = text;
  statusMessage.className = `status-pill ${cssClass}`;
}

let isAuthenticated = false;
let currentUsername = null;
let authRefreshPromise = null;
let isTyping = false; // Flag to track if the user is typing
let isChoosingCategory = false;

async function refreshAuthState() {
  if (authRefreshPromise) {
    return authRefreshPromise;
  }

  authRefreshPromise = (async () => {
    try {
      const response = await fetch(SESSION_URL, {
        method: "GET",
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        currentUsername = data.username;
        isAuthenticated = true;
        setStatus(`Autentificat ca ${currentUsername}`, "status-ok");
        await loadCategories();
      } else if (response.status === 401) {
        currentUsername = null;
        isAuthenticated = false;
        setStatus(
          "Autentifică-te în TimeTrackr pentru a urmări activități.",
          "status-warn"
        );
        applyFallbackCategories(
          activityCategorySelect ? activityCategorySelect.value : null
        );
      } else {
        currentUsername = null;
        isAuthenticated = false;
        setStatus(
          "Verificarea autentificării a eșuat. Încearcă mai târziu.",
          "status-error"
        );
        applyFallbackCategories(
          activityCategorySelect ? activityCategorySelect.value : null
        );
      }
    } catch (error) {
      console.error("Error checking session:", error);
      currentUsername = null;
      isAuthenticated = false;
      setStatus(
        "Server indisponibil. Pornește backend-ul TimeTrackr.",
        "status-error"
      );
      applyFallbackCategories(
        activityCategorySelect ? activityCategorySelect.value : null
      );
    } finally {
      authRefreshPromise = null;
    }
  })();

  return authRefreshPromise;
}

async function triggerAppRefresh() {
  if (!chrome.tabs) {
    return;
  }
  try {
    const tabs = await chrome.tabs.query({ url: "http://localhost:8080/*" });
    await Promise.all(
      tabs.map((tab) => {
        if (!tab.id) {
          return Promise.resolve();
        }
        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { type: "refreshActivities" }, () => {
            if (chrome.runtime.lastError) {
              console.warn(
                "Tab refresh message failed",
                chrome.runtime.lastError.message
              );
            }
            resolve();
          });
        });
      })
    );
  } catch (error) {
    console.error("Error refreshing app tabs:", error);
  }
}

activityNameInput.addEventListener("input", () => {
  isTyping = true; // Set the flag when the user starts typing
});

activityNameInput.addEventListener("blur", () => {
  // Defer so button handlers read the current value before UI polling clears it
  setTimeout(() => {
    isTyping = false; // Reset the flag when the input loses focus
  }, 0);
});

activityCategorySelect.addEventListener("focus", () => {
  isChoosingCategory = true;
});

activityCategorySelect.addEventListener("change", () => {
  isChoosingCategory = false;
});

activityCategorySelect.addEventListener("blur", () => {
  isChoosingCategory = false;
});
// Function to update the UI based on the background state
async function updateUI() {
  const response = await chrome.runtime.sendMessage({ command: "getData" });

  // Update the display with the background timer's current seconds
  timerDisplay.textContent = formatTime(response.seconds);

  const shouldPopulateName =
    response.name &&
    (!isTyping || response.isTiming || activityNameInput.value.trim() === "");
  if (shouldPopulateName) {
    activityNameInput.value = response.name;
  }

  if (response.category && (!isChoosingCategory || response.isTiming)) {
    activityCategorySelect.value = response.category;
  }

  sendBtn.disabled = true;
  sendBtn.style.display = "none";

  if (!isAuthenticated) {
    activityNameInput.disabled = true;
    activityCategorySelect.disabled = true;
    startBtn.disabled = true;
    stopBtn.disabled = true;
    startBtn.style.display = "inline-flex";
    stopBtn.style.display = "none";
    return;
  }

  // Enable/Disable the activity name input based on the timer state
  activityNameInput.disabled = response.isTiming;
  activityCategorySelect.disabled = response.isTiming;

  // Enable/Disable buttons based on whether the timer is currently running
  startBtn.disabled = response.isTiming;
  stopBtn.disabled = !response.isTiming;

  // Toggle button visibility so only the relevant control is shown
  startBtn.style.display = response.isTiming ? "none" : "inline-flex";
  stopBtn.style.display = response.isTiming ? "inline-flex" : "none";
}

async function initializePopup() {
  await refreshAuthState();
  await loadCategories();
  await updateUI();
}

initializePopup();

// Periodically update the display while the popup is open
let popupInterval = setInterval(async () => {
  await refreshAuthState();
  await loadCategories();
  await updateUI();
}, 1000);

// Clear the interval when the popup closes (cleanup)
window.addEventListener("unload", () => {
  clearInterval(popupInterval);
});

// --- Button Handlers ---

startBtn.addEventListener("click", async () => {
  const activityName = activityNameInput.value.trim();
  const activityCategory = activityCategorySelect.value;

  await refreshAuthState();
  if (!isAuthenticated) {
    alert("Autentifică-te în TimeTrackr înainte de a porni cronometrul.");
    return;
  }

  // Check if the user has entered a valid activity name
  if (!activityName) {
    alert("Introdu o denumire pentru activitate înainte de pornire.");
    return;
  }

  if (!activityCategory) {
    alert("Selectează o categorie înainte de pornire.");
    return;
  }

  // Prevent `updateUI` from overwriting the input field
  isTyping = false;
  isChoosingCategory = false;

  // Disable the input field and start the timer
  activityNameInput.disabled = true;
  activityCategorySelect.disabled = true;
  await chrome.runtime.sendMessage({
    command: "start",
    name: activityName,
    category: activityCategory,
  });
  await updateUI();
});

stopBtn.addEventListener("click", async () => {
  await refreshAuthState();
  if (!isAuthenticated) {
    await chrome.runtime.sendMessage({ command: "stop" });
    alert("Autentifică-te în TimeTrackr înainte de a salva activitatea.");
    await updateUI();
    return;
  }

  const bgResponse = await chrome.runtime.sendMessage({ command: "sendData" });
  const payload = bgResponse.data;

  if (!payload || payload.seconds === 0) {
    alert("Nu există nicio activitate de trimis.");
    await updateUI();
    return;
  }

  const activity = {
    name: payload.name,
    category: payload.category || activityCategorySelect.value || "Muncă",
    hours: Math.round((payload.seconds / 3600) * 100) / 100,
    startTime: toLocalDateTimeString(payload.startTime),
    endTime: toLocalDateTimeString(payload.endTime),
  };

  try {
    const response = await fetch(SERVER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
      credentials: "include",
      body: JSON.stringify(activity),
    });

    if (response.ok) {
      setStatus(
        `Am salvat ${activity.name} (${activity.category})`,
        "status-ok"
      );
      await triggerAppRefresh();
    } else {
      const bodyText = await response.text();
      console.error("Save failed", response.status, bodyText);
      const message =
        response.status === 401
          ? "Autentifică-te în TimeTrackr și încearcă din nou."
          : "Nu am putut salva activitatea.";
      setStatus(message, "status-error");
    }
  } catch (error) {
    console.error("Error saving activity:", error);
    setStatus("A apărut o eroare la salvarea activității.", "status-error");
  }

  activityNameInput.value = "";
  if (activityCategorySelect.options.length > 0) {
    activityCategorySelect.selectedIndex = 0;
  }
  await updateUI();
});
