// Save options to chrome.storage
function saveOptions() {
  const editor = document.getElementById('editor').value;
  chrome.storage.sync.set(
    {
      preferredEditor: editor
    },
    () => {
      // Update status to let user know options were saved.
      const status = document.createElement('div');
      status.textContent = 'Options saved.';
      status.style.color = '#4CAF50';
      status.style.marginTop = '10px';
      document.querySelector('.option-container').appendChild(status);
      setTimeout(() => {
        status.remove();
      }, 2000);
    }
  );
}

// Restores select box state using the preferences stored in chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(
    {
      preferredEditor: 'vscode' // default value
    },
    (items) => {
      document.getElementById('editor').value = items.preferredEditor;
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('editor').addEventListener('change', saveOptions);
