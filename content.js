let overlays = new Map();
let elementColors = new Map();
let isEnabled = false;
let isProcessing = false;
let isOverlayLoaded = false;

function hashStringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 70%, 60%, 0.3)`; // Using HSLA for direct opacity control
}

// Function to get standardized ID and matching pattern
function getStandardizedId(originalId, combinePatterns) {
  console.log('Original ID:', originalId);
  console.log('Combine Patterns:', combinePatterns);

  for (const pattern of combinePatterns) {
    try {
      const regex = new RegExp(pattern);
      const match = originalId.match(regex);
      console.log('Testing pattern:', pattern, 'Match:', match);

      if (match) {
        // For IDs like user-catalog-item-f52-928e-44e2-b909-6364fdbc46a6
        // Get the base part before the UUID/hash
        const parts = originalId.split('-');
        const baseId = parts.slice(0, 3).join('-'); // Get 'user-catalog-item'
        const standardizedId = `${baseId}-*`; // Make it 'user-catalog-item-*'

        console.log('Standardized ID:', standardizedId);
        return {
          id: standardizedId,
          pattern: pattern,
        };
      }
    } catch (e) {
      console.error(`Invalid regex pattern: ${pattern}`, e);
    }
  }
  return {
    id: originalId,
    pattern: null,
  };
}

function createOverlays() {
  isProcessing = true;
  chrome.runtime.sendMessage({ action: 'updateLoadingState', isLoading: true });

  // Get both exclusion and combining patterns
  chrome.storage.sync.get(
    {
      regexPatterns: [],
      combineRegex: [],
    },
    (result) => {
      const exclusionPatterns = result.regexPatterns;
      const combinePatterns = result.combineRegex;

      // Remove existing overlays
      removeOverlays();

      // Add escape key handler
      const escapeHandler = (e) => {
        if (e.key === 'Escape') {
          document.removeEventListener('keydown', escapeHandler);
          removeOverlays();
          isEnabled = false;
          chrome.runtime.sendMessage({
            action: 'updateIcon',
            enabled: false,
          });
        }
      };
      document.addEventListener('keydown', escapeHandler);

      // Create full-page overlay to prevent interaction with the page
      const pageOverlay = document.createElement('div');
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
      pageOverlay.setAttribute('data-page-overlay', '');
      document.body.appendChild(pageOverlay);

      // Prevent scrolling and add padding for scrollbar
      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = scrollbarWidth + 'px';
      document.body.style.overflow = 'hidden';

      // Group elements by standardized IDs
      const groupedElements = new Map();

      // Find all elements with ID attributes
      const elementsWithId = document.querySelectorAll('[id]');

      elementsWithId.forEach((element) => {
        // Skip elements that match any exclusion pattern
        const shouldExclude = exclusionPatterns.some((pattern) => {
          try {
            const regex = new RegExp(pattern);
            return regex.test(element.id);
          } catch (e) {
            console.error(`Invalid regex pattern: ${pattern}`, e);
            return false;
          }
        });

        if (shouldExclude) {
          return;
        }

        // Get standardized ID and pattern based on combining patterns
        const { id: standardizedId, pattern: matchingPattern } =
          getStandardizedId(element.id, combinePatterns);

        // Group elements with the same standardized ID
        if (!groupedElements.has(standardizedId)) {
          groupedElements.set(standardizedId, {
            elements: [],
            pattern: matchingPattern,
          });
        }
        groupedElements.get(standardizedId).elements.push(element);
      });

      // Create overlays for grouped elements
      groupedElements.forEach(({ elements, pattern }, standardizedId) => {
        console.log(
          'Creating overlay for group:',
          standardizedId,
          'Pattern:',
          pattern
        );
        // Use existing color or generate new one for the group
        if (!elementColors.has(standardizedId)) {
          elementColors.set(standardizedId, hashStringToColor(standardizedId));
        }
        const color = elementColors.get(standardizedId);

        elements.forEach((element) => {
          const overlay = document.createElement('button');
          overlay.style.cssText = `
            position: absolute;
            z-index: 10000;
            background-color: ${color};
            cursor: pointer;
            pointer-events: auto;
            border: none;
            padding: 0;
            margin: 0;
            outline: none;
            width: 100%;
            height: 100%;
          `;
          overlay.setAttribute('data-highlight-overlay', '');
          overlay.setAttribute('data-group-id', standardizedId);

          // Create ID label element
          const idLabel = document.createElement('div');
          idLabel.style.cssText = `
            display: none;
            position: absolute;
            background-color: #333;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: nowrap;
            z-index: 10001;
          `;

          // Show standardized ID
          idLabel.textContent = standardizedId;
          overlay.appendChild(idLabel);

          // Position overlay
          const rect = element.getBoundingClientRect();
          overlay.style.top = rect.top + window.scrollY + 'px';
          overlay.style.left = rect.left + window.scrollX + 'px';
          overlay.style.width = rect.width + 'px';
          overlay.style.height = rect.height + 'px';

          // Show ID and position it dynamically on hover
          overlay.addEventListener('mouseenter', () => {
            if (isProcessing) return;
            const baseHue = color.match(/hsla?\((\d+)/)[1];
            overlay.style.border = `2px dashed hsla(${baseHue}, 70%, 60%, 1)`;
            idLabel.style.display = 'block';

            // Get overlay dimensions
            const overlayRect = overlay.getBoundingClientRect();
            const isTallOverlay = overlayRect.height > 200;

            if (isTallOverlay) {
              // Center label for tall overlays
              idLabel.style.top = '50%';
              idLabel.style.bottom = 'auto';
              idLabel.style.left = '50%';
              idLabel.style.transform = 'translate(-50%, -50%)';
            } else {
              // First try to position above
              idLabel.style.bottom = '100%';
              idLabel.style.top = 'auto';
              idLabel.style.left = '50%';
              idLabel.style.transform = 'translateX(-50%)';

              // Check if label is visible in window
              const labelRect = idLabel.getBoundingClientRect();
              const isVisible = labelRect.top >= 0 && 
                              labelRect.left >= 0 && 
                              labelRect.bottom <= window.innerHeight &&
                              labelRect.right <= window.innerWidth;

              if (!isVisible) {
                // If not visible, center it in the overlay
                idLabel.style.top = '50%';
                idLabel.style.bottom = 'auto';
                idLabel.style.left = '50%';
                idLabel.style.transform = 'translate(-50%, -50%)';
              }
            }
          });

          overlay.addEventListener('mouseleave', () => {
            if (isProcessing) return;
            overlay.style.border = 'none';
            idLabel.style.display = 'none';
          });

          // Handle click
          overlay.onclick = async (e) => {
            if (isProcessing) return; // Prevent multiple clicks while processing
            isProcessing = true;

            e.preventDefault();
            e.stopPropagation();

            console.log('Selected element ID:', element.id);
            console.log('Matching pattern:', pattern);

            // Create search pattern by replacing matched part with .*
            let searchId = element.id;
            if (pattern) {
              const regex = new RegExp(pattern);
              searchId = element.id.replace(regex, '.*');
            }

            // Create processing overlay
            const processingOverlay = document.createElement('div');
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
            processingOverlay.setAttribute('data-processing-overlay', '');

            // Add loading spinner
            const spinner = document.createElement('div');
            
            // Get the preferred editor and set spinner color accordingly
            chrome.storage.sync.get(
              {
                preferredEditor: 'vscode', // default value
              },
              (items) => {
                const isWindsurf = items.preferredEditor === 'windsurf';
                // Use the same colors as defined in options.js
                const ideColor = isWindsurf ? '#4CAF50' : '#007ACC';
                
                spinner.style.cssText = `
                  position: absolute;
                  top: 50%;
                  left: 50%;
                  transform: translate(-50%, -50%);
                  width: 50px;
                  height: 50px;
                  border: 5px solid #444444;
                  border-top: 5px solid ${ideColor};
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                `;
              }
            );

            // Add keyframe animation for spinner
            const styleSheet = document.createElement('style');
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
                    action: 'makeRequest',
                    data: `id={?(\"|'|\`)${searchId}(\"|'|\`)}?`,
                  },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(chrome.runtime.lastError.message));
                    } else if (!response || !response.success) {
                      reject(
                        new Error(response?.error || 'Unknown error occurred')
                      );
                    } else {
                      resolve(response);
                    }
                  }
                );
              });

              console.log('response:', response);

              if (response && response.path) {
                // Get the preferred editor from storage
                chrome.storage.sync.get(
                  {
                    preferredEditor: 'vscode', // default to vscode if not set
                  },
                  (items) => {
                    const editorScheme =
                      items.preferredEditor === 'windsurf'
                        ? 'windsurf'
                        : 'vscode';
                    const deeplink = `${editorScheme}://file${response.path}`;
                    window.open(deeplink, '_blank');
                  }
                );
              } else if (response && response.notFound) {
                alert('Element not found in the codebase.');
              } else {
                alert('Unexpected response from server.');
              }
            } catch (error) {
              console.error('Failed to connect to the code editor:', error);
              alert('Please make sure the code editor bridge is connected.');
            } finally {
              // Reset processing state
              isProcessing = false;

              // Remove processing overlay
              const processingOverlay = document.querySelector(
                '[data-processing-overlay]'
              );
              if (processingOverlay) {
                processingOverlay.remove();
              }

              // Reset cursor state and remove overlays
              removeOverlays();

              // Toggle extension state back
              isEnabled = false;
              chrome.runtime.sendMessage({
                action: 'updateIcon',
                enabled: false,
              });
            }
          };

          document.body.appendChild(overlay);
          overlays.set(element, overlay);
        });
      });

      isProcessing = false;
      isOverlayLoaded = true;
      chrome.runtime.sendMessage({ 
        action: 'updateLoadingState', 
        isLoading: false,
        isEnabled: true 
      });
    }
  );
}

function removeOverlays() {
  // Remove all existing overlays
  document.querySelectorAll('[data-highlight-overlay]').forEach((overlay) => {
    overlay.remove();
  });

  // Remove the full-page overlay if it exists
  const pageOverlay = document.querySelector('[data-page-overlay]');
  if (pageOverlay) {
    pageOverlay.remove();
  }

  // Remove any processing overlay if it exists
  const processingOverlay = document.querySelector('[data-processing-overlay]');
  if (processingOverlay) {
    processingOverlay.remove();
  }

  // Restore scrolling and remove padding
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
  overlays.clear();
  isProcessing = false; // Reset processing state when overlays are removed
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'toggle' && !isProcessing) {
    if (!isEnabled) {
      createOverlays();
    } else {
      removeOverlays();
      isOverlayLoaded = false;
      chrome.runtime.sendMessage({ 
        action: 'updateLoadingState', 
        isLoading: false,
        isEnabled: false 
      });
    }
    isEnabled = !isEnabled;
  }
});
