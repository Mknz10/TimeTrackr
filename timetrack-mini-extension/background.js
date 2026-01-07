// timetrackr-mini-extension/background.js

function formatTime(sec) {
  const hours = Math.floor(sec / 3600);
  const minutes = Math.floor((sec % 3600) / 60);
  const seconds = sec % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;
}

// State variables stored in the Service Worker
let timerInterval = null;
let timerSeconds = 0;
let currentStartTime = null;
let activityName = ""; // The activity name is stored here
let activityCategory = "";

// ... (formatTime function remains the same)

// Function to start the persistent timer
function startTimer(name, category) {
  if (timerInterval) {
    return; // Prevent restarting the timer if already running
  }

  timerSeconds = 0;
  currentStartTime = new Date();
  activityName = name;
  activityCategory = category || "";

  timerInterval = setInterval(() => {
    timerSeconds++;
    chrome.action.setBadgeText({ text: formatTime(timerSeconds) });
    chrome.action.setBadgeBackgroundColor({ color: "#F472B6" });
  }, 1000);
}

// Function to stop the timer (remains the same)
function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  chrome.action.setBadgeText({ text: "" });
}

// Function to package data and reset state
function resetAndGetData() {
  stopTimer();
  const data = {
    name: activityName,
    category: activityCategory,
    seconds: timerSeconds,
    startTime: currentStartTime,
    endTime: new Date(), // Calculate endTime right before sending
  };
  // Reset state after data is retrieved
  timerSeconds = 0;
  currentStartTime = null;
  activityName = "";
  activityCategory = "";
  return data;
}

// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "start") {
    startTimer(request.name, request.category);
    sendResponse({ status: "Timer started" });
  } else if (request.command === "stop") {
    stopTimer();
    sendResponse({ status: "Timer stopped" });
  } else if (request.command === "getData") {
    sendResponse({
      seconds: timerSeconds,
      name: activityName,
      category: activityCategory,
      isTiming: timerInterval !== null,
    });
  } else if (request.command === "sendData") {
    if (timerInterval) {
      stopTimer(); // Ensure timer is stopped before sending data
    }
    const data = resetAndGetData();
    sendResponse({ status: "Data packaged", data });
  }
  return true;
});
