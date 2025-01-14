let overlays = new Map();
let elementColors = new Map();
let isEnabled = false;
let isProcessing = false;

function hashStringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 70%, 60%, 0.3)`; // Using HSLA for direct opacity control
}

function createOverlays() {
  // Remove existing overlays
  removeOverlays();

  // Add escape key handler
  const escapeHandler = (e) => {
    if (e.key === "Escape") {
      document.removeEventListener("keydown", escapeHandler);
      removeOverlays();
      isEnabled = false;
      chrome.runtime.sendMessage({
        action: "updateIcon",
        enabled: false,
      });
    }
  };
  document.addEventListener("keydown", escapeHandler);

  // Create full-page overlay to prevent interaction with the page
  const pageOverlay = document.createElement("div");
  pageOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: transparent;
    z-index: 9999;
    cursor: crosshair;
  `;
  pageOverlay.setAttribute("data-page-overlay", "");
  document.body.appendChild(pageOverlay);

  // Prevent scrolling and add padding for scrollbar
  const scrollbarWidth =
    window.innerWidth - document.documentElement.clientWidth;
  document.body.style.paddingRight = scrollbarWidth + "px";
  document.body.style.overflow = "hidden";

  // Find all elements with ID attributes
  const elementsWithId = document.querySelectorAll("[id]");

  elementsWithId.forEach((element) => {
    const overlay = document.createElement("div");

    // Use existing color or generate new one
    if (!elementColors.has(element.id)) {
      elementColors.set(element.id, hashStringToColor(element.id));
    }
    const color = elementColors.get(element.id);

    overlay.style.cssText = `
      position: absolute;
      z-index: 10000;
      background-color: ${color};
      cursor: pointer;
      pointer-events: auto;
    `;
    overlay.setAttribute("data-highlight-overlay", "");

    // Create ID label element
    const idLabel = document.createElement("div");
    idLabel.style.cssText = `
      display: none;
      position: absolute;
      top: -25px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #333;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 12px;
      white-space: nowrap;
      z-index: 10001;
    `;
    idLabel.textContent = element.id;
    overlay.appendChild(idLabel);

    overlay.addEventListener("mouseenter", () => {
      if (isProcessing) return;
      const baseHue = color.match(/hsla?\((\d+)/)[1];
      overlay.style.border = `2px dashed hsla(${baseHue}, 70%, 60%, 1)`;
      idLabel.style.display = "block";
    });

    overlay.addEventListener("mouseleave", () => {
      if (isProcessing) return;
      overlay.style.border = "none";
      idLabel.style.display = "none";
    });

    overlay.onclick = async (e) => {
      if (isProcessing) return; // Prevent multiple clicks while processing
      isProcessing = true;

      e.preventDefault();
      e.stopPropagation();

      console.log("Selected element ID:", element.id);

      // Create processing overlay
      const processingOverlay = document.createElement("div");
      processingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        z-index: 20000;
        display: flex;
        justify-content: center;
        align-items: center;
      `;
      processingOverlay.setAttribute("data-processing-overlay", "");

      // Add loading spinner
      const spinner = document.createElement("div");
      spinner.style.cssText = `
        width: 50px;
        height: 50px;
        border: 5px solid #f3f3f3;
        border-top: 5px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      `;

      // Add keyframe animation for spinner
      const styleSheet = document.createElement("style");
      styleSheet.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(styleSheet);

      processingOverlay.appendChild(spinner);
      document.body.appendChild(processingOverlay);

      try {
        const response = await new Promise((resolve, reject) => {
          chrome.runtime.sendMessage(
            {
              action: "makeRequest",
              data: `id=("|')${element.id}("|')`,
            },
            (response) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (!response || !response.success) {
                reject(
                  new Error(
                    response?.error || "Unknown error occurred",
                  ),
                );
              } else {
                resolve(response);
              }
            },
          );
        });

        console.log("response:", response);

        if (response && response.path) {
          // Get the preferred editor from storage
          chrome.storage.sync.get(
            {
              preferredEditor: "vscode", // default to vscode if not set
            },
            (items) => {
              const editorScheme =
                items.preferredEditor === "vscode"
                  ? "vscode"
                  : "windsurf";
              const deeplink = `${editorScheme}://file${response.path}`;
              window.open(deeplink, "_blank");
            },
          );
        } else if (response && response.notFound) {
          alert("Element not found in the codebase.");
        } else {
          alert("Unexpected response from server.");
        }
      } catch (error) {
        console.error("Failed to connect to the code editor:", error);
        alert(
          `Failed to connect to the code editor: ${error.message}`,
        );
      } finally {
        // Reset processing state
        isProcessing = false;

        // Remove processing overlay
        const processingOverlay = document.querySelector(
          "[data-processing-overlay]",
        );
        if (processingOverlay) {
          processingOverlay.remove();
        }

        // Reset cursor state and remove overlays
        removeOverlays();

        // Toggle extension state back
        isEnabled = false;
        chrome.runtime.sendMessage({
          action: "updateIcon",
          enabled: false,
        });
      }
    };

    document.body.appendChild(overlay);

    // Position the overlay
    const rect = element.getBoundingClientRect();
    overlay.style.top = `${rect.top + window.scrollY}px`;
    overlay.style.left = `${rect.left + window.scrollX}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;

    overlays.set(element, overlay);
  });
}

function removeOverlays() {
  // Remove all existing overlays
  document
    .querySelectorAll("[data-highlight-overlay]")
    .forEach((overlay) => {
      overlay.remove();
    });

  // Remove the full-page overlay if it exists
  const pageOverlay = document.querySelector("[data-page-overlay]");
  if (pageOverlay) {
    pageOverlay.remove();
  }

  // Remove any processing overlay if it exists
  const processingOverlay = document.querySelector(
    "[data-processing-overlay]",
  );
  if (processingOverlay) {
    processingOverlay.remove();
  }

  // Restore scrolling and remove padding
  document.body.style.overflow = "";
  document.body.style.paddingRight = "";
  overlays.clear();
  isProcessing = false; // Reset processing state when overlays are removed
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "toggle") {
    isEnabled = !isEnabled;
    if (isEnabled) {
      createOverlays();
    } else {
      removeOverlays();
    }
    // Update icon state
    chrome.runtime.sendMessage({
      action: "updateIcon",
      enabled: isEnabled,
    });
  }
});
