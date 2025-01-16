// Track active tabs
const activeTabStates = new Map();
const loadingStates = new Map();

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Reset state for newly loaded tabs
    activeTabStates.delete(tabId);
    loadingStates.delete(tabId);
    updateIconForTab(tabId, false);
  }
});

// Listen for tab activation
chrome.tabs.onActivated.addListener((activeInfo) => {
  const isEnabled = activeTabStates.get(activeInfo.tabId) || false;
  const isLoading = loadingStates.get(activeInfo.tabId) || false;
  updateIconForTab(activeInfo.tabId, isEnabled, isLoading);
});

function updateIconForTab(tabId, enabled, isLoading = false) {
  let iconPath;
  if (isLoading) {
    iconPath = {
      16: 'icons/icon16-processing.png',
      48: 'icons/icon48-processing.png',
      128: 'icons/icon128-processing.png',
    };
  } else {
    iconPath = enabled
      ? {
          16: 'icons/icon16.png',
          48: 'icons/icon48.png',
          128: 'icons/icon128.png',
        }
      : {
          16: 'icons/icon16-disabled.png',
          48: 'icons/icon48-disabled.png',
          128: 'icons/icon128-disabled.png',
        };
  }

  chrome.action.setIcon({ path: iconPath });
  activeTabStates.set(tabId, enabled);

  // Disable the button while loading
  chrome.action.setEnabled({ tabId: tabId, enabled: !isLoading });
}

chrome.action.onClicked.addListener((tab) => {
  if (!loadingStates.get(tab.id)) {
    chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateLoadingState' && sender.tab) {
    const tabId = sender.tab.id;
    loadingStates.set(tabId, request.isLoading);
    updateIconForTab(tabId, request.isEnabled, request.isLoading);
  } else if (request.action === 'makeRequest') {
    chrome.storage.sync.get(
      {
        fileTypes: ['js', 'jsx', 'ts', 'tsx'],
        combineRegex: [],
        exclusionPatterns: [],
      },
      (items) => {
        const requestBody = JSON.stringify({
          regex: request.data,
          fileTypes: items.fileTypes,
        });

        fetch('http://localhost:12800', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: requestBody,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
          })
          .then((data) => {
            console.log('Server response:', data);
            if (data && data.path) {
              sendResponse({ success: true, path: data.path });
            } else {
              sendResponse({ success: true, notFound: true });
            }
          })
          .catch((error) => {
            console.error('Fetch error:', error);
            sendResponse({ success: false, error: error.message });
          });
      }
    );

    return true; // Will respond asynchronously
  } else if (request.action === 'updateIcon') {
    if (sender.tab) {
      updateIconForTab(sender.tab.id, request.enabled);
    }
  }
});
