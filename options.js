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

// Regex pattern management
const regexInput = document.getElementById('tag-input');
const addRegexButton = document.getElementById('add-tag');
const resetButton = document.getElementById('reset-filters');
const regexContainer = document.getElementById('tags-container');

// Default regex patterns
const DEFAULT_PATTERNS = ['^radix-'];
let patterns = new Set();

function savePatterns() {
  chrome.storage.sync.set({ regexPatterns: Array.from(patterns) }, () => {
    // Show save confirmation
    const status = document.createElement('div');
    status.textContent = 'Filters saved.';
    status.style.color = '#4CAF50';
    status.style.marginTop = '10px';
    document.querySelector('.tag-section').appendChild(status);
    setTimeout(() => {
      status.remove();
    }, 2000);
  });
}

function isValidRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

function createRegexElement(pattern) {
  const pill = document.createElement('span');
  pill.className = 'tag';
  pill.textContent = pattern;
  
  const removeButton = document.createElement('button');
  removeButton.className = 'remove-tag';
  removeButton.innerHTML = '&times;';
  removeButton.onclick = () => {
    pill.remove();
    patterns.delete(pattern);
    savePatterns();
  };
  
  pill.appendChild(removeButton);
  return pill;
}

function addRegexPattern() {
  const pattern = regexInput.value.trim();
  
  if (!pattern) return;
  
  if (!isValidRegex(pattern)) {
    regexInput.classList.add('invalid-regex');
    return;
  }
  
  regexInput.classList.remove('invalid-regex');
  
  if (!patterns.has(pattern)) {
    patterns.add(pattern);
    regexContainer.appendChild(createRegexElement(pattern));
    regexInput.value = '';
    savePatterns();
  }
}

function resetPatterns() {
  patterns = new Set(DEFAULT_PATTERNS);
  regexContainer.innerHTML = '';
  DEFAULT_PATTERNS.forEach(pattern => {
    regexContainer.appendChild(createRegexElement(pattern));
  });
  savePatterns();
}

// Event listeners
addRegexButton.addEventListener('click', addRegexPattern);
resetButton.addEventListener('click', resetPatterns);
regexInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addRegexPattern();
  }
});

regexInput.addEventListener('input', () => {
  if (regexInput.classList.contains('invalid-regex')) {
    const pattern = regexInput.value.trim();
    if (isValidRegex(pattern) || !pattern) {
      regexInput.classList.remove('invalid-regex');
    }
  }
});

// Initialize patterns
function initializePatterns() {
  chrome.storage.sync.get(['regexPatterns'], (result) => {
    // Only use default patterns if there's no stored value at all
    if (result.regexPatterns === undefined) {
      patterns = new Set(DEFAULT_PATTERNS);
      savePatterns();
    } else {
      patterns = new Set(result.regexPatterns);
    }
    
    // Clear and rebuild patterns display
    regexContainer.innerHTML = '';
    patterns.forEach(pattern => {
      regexContainer.appendChild(createRegexElement(pattern));
    });
  });
}

// Initialize when options page loads
document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  initializePatterns();
});
