chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, { action: "toggle" });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "makeRequest") {
    fetch("http://localhost:12800", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        "Accept": "application/json"
      },
      body: request.data
    })
    .then(response => response.json())
    .then(data => sendResponse({ success: true, data }))
    .catch(error => sendResponse({ success: false, error: error.message }));
    
    return true; // Will respond asynchronously
  }
});
