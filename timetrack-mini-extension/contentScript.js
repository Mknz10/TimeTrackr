// timetrack-mini-extension/contentScript.js

(function () {
  const refreshListener = (message, sender, sendResponse) => {
    if (!message || message.type !== "refreshActivities") {
      return;
    }

    if (typeof window.fetchActivities === "function") {
      try {
        window.fetchActivities();
        sendResponse?.({ refreshed: true });
      } catch (error) {
        console.error("Failed to refresh activities:", error);
        sendResponse?.({ refreshed: false, error: error.message });
      }
    } else {
      sendResponse?.({
        refreshed: false,
        error: "fetchActivities not available",
      });
    }
  };

  chrome.runtime.onMessage.addListener(refreshListener);
})();
