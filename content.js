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

  // Prevent scrolling
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
      transition: background-color 0.2s ease;
      pointer-events: auto;
    `;
    overlay.setAttribute("data-highlight-overlay", "");

    overlay.addEventListener("mouseenter", () => {
      if (isProcessing) return;
      const baseHue = color.match(/hsla?\((\d+)/)[1];
      overlay.style.backgroundColor = `hsla(${baseHue}, 100%, 50%, 0.5)`;
    });

    overlay.addEventListener("mouseleave", () => {
      if (isProcessing) return;
      overlay.style.backgroundColor = color;
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
        background: rgba(0, 0, 0, 0.1);
        z-index: 20000;
        cursor: wait;
      `;
      processingOverlay.setAttribute("data-processing-overlay", "");
      document.body.appendChild(processingOverlay);

      // Set cursor to loading state
      document.body.style.cursor = "wait";
      overlay.style.cursor = "wait";

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
          const deeplink = `windsurf://file${response.path}`;
          window.open(deeplink, "_blank");
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
        const processingOverlay = document.querySelector("[data-processing-overlay]");
        if (processingOverlay) {
          processingOverlay.remove();
        }
        
        // Reset cursor state and remove overlays
        document.body.style.cursor = "";
        removeOverlays();
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
  const processingOverlay = document.querySelector("[data-processing-overlay]");
  if (processingOverlay) {
    processingOverlay.remove();
  }

  // Restore scrolling
  document.body.style.overflow = "";

  overlays.clear();
  isProcessing = false; // Reset processing state when overlays are removed
}

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {
    if (request.action === "toggle") {
      isEnabled = !isEnabled;
      if (isEnabled) {
        createOverlays();
      } else {
        removeOverlays();
      }
      sendResponse({ success: true });
    }
  },
);
