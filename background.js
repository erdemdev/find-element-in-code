chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle" });
});

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.action === "makeRequest") {
      fetch("http://localhost:12800", {
        method: "POST",
        headers: {
          "Content-Type": "text/plain",
          Accept: "application/json",
        },
        body: request.data,
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log("Server response:", data);
          if (data && data.path) {
            sendResponse({ success: true, path: data.path });
          } else {
            sendResponse({ success: true, notFound: true });
          }
        })
        .catch((error) => {
          console.error("Fetch error:", error);
          sendResponse({ success: false, error: error.message });
        });

      return true; // Will respond asynchronously
    } else if (request.action === "updateIcon") {
      // Update the extension icon based on state
      const iconPath = request.enabled
        ? {
            16: "icons/icon16.png",
            48: "icons/icon48.png",
            128: "icons/icon128.png",
          }
        : {
            16: "icons/icon16-disabled.png",
            48: "icons/icon48-disabled.png",
            128: "icons/icon128-disabled.png",
          };

      chrome.action.setIcon({ path: iconPath });
    }
  },
);
