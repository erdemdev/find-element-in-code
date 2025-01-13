let overlays = new Map();
let elementColors = new Map();
let isEnabled = false;

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

    overlay.addEventListener('mouseenter', () => {
      const baseHue = color.match(/hsla?\((\d+)/)[1];
      overlay.style.backgroundColor = `hsla(${baseHue}, 70%, 60%, 0.5), hsla(60, 70%, 60%, 0.3)`;
    });

    overlay.addEventListener('mouseleave', () => {
      overlay.style.backgroundColor = color;
    });

    const rect = element.getBoundingClientRect();
    overlay.style.left = window.scrollX + rect.left + "px";
    overlay.style.top = window.scrollY + rect.top + "px";
    overlay.style.width = rect.width + "px";
    overlay.style.height = rect.height + "px";

    overlay.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        await fetch("http://localhost:12800", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ id: element.id }),
        });
      } catch (error) {
        alert("Failed to connect code editor.");
        console.error("Failed to send ID:", error);
      }

      removeOverlays();
      isEnabled = false;
    };

    document.body.appendChild(overlay);
    overlays.set(element, overlay);
  });
}

function removeOverlays() {
  overlays.forEach((overlay) => overlay.remove());
  overlays.clear();
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
