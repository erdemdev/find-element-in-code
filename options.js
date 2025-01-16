// Save options to chrome.storage
function saveOptions() {
  const editor = document.getElementById('editor-select').value;
  chrome.storage.sync.set(
    {
      preferredEditor: editor,
    },
    () => {
      showToast('Options saved');
    }
  );
}

// Toast notification
let toastTimeout;
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}

// Restores select box state using the preferences stored in chrome.storage
function restoreOptions() {
  chrome.storage.sync.get(
    {
      preferredEditor: 'vscode', // default value
    },
    (items) => {
      document.getElementById('editor-select').value = items.preferredEditor;
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document
  .getElementById('editor-select')
  .addEventListener('change', saveOptions);

// Regex pattern management
const exclusionInput = document.getElementById('exclusion-input');
const exclusionAddButton = document.getElementById('exclusion-add');
const exclusionResetButton = document.getElementById('exclusion-reset');
const exclusionContainer = document.querySelector(
  '.tag-container.exclusion-tags'
);

// Regex combination management
const combiningInput = document.getElementById('combining-input');
const combiningAddButton = document.getElementById('combining-add');
const combiningResetButton = document.getElementById('combining-reset');
const combiningContainer = document.querySelector(
  '.tag-container.combining-tags'
);

// File extension management
const extensionInput = document.getElementById('extension-input');
const extensionAddButton = document.getElementById('extension-add');
const extensionResetButton = document.getElementById('extension-reset');
const extensionContainer = document.querySelector(
  '.tag-container.extension-tags'
);

// Default values
const DEFAULT_PATTERNS = ['^.{1,2}$', '^radix-', '^path'];
const DEFAULT_EXTENSIONS = ['html', 'jsx', 'tsx', 'astro', 'php', 'svg'];
const DEFAULT_COMBINE_REGEX = [
  '\\d+$',
  '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$',
];

let patterns = new Set();
let fileTypes = new Set();
let combineRegex = new Set();

function savePatterns() {
  chrome.storage.sync.set({ regexPatterns: Array.from(patterns) }, () => {
    showToast('Options saved');
  });
}

function saveFileTypes() {
  chrome.storage.sync.set({ fileTypes: Array.from(fileTypes) }, () => {
    showToast('Options saved');
  });
}

function saveCombineRegex() {
  chrome.storage.sync.set(
    {
      combineRegex: Array.from(
        document.querySelectorAll('.combine-regex-pill')
      ).map((el) => el.dataset.pattern),
      exclusionPatterns: Array.from(
        document.querySelectorAll('.regex-pill')
      ).map((el) => el.dataset.pattern),
    },
    () => {
      showToast('Options saved');
    }
  );
}

function isValidRegex(pattern) {
  try {
    new RegExp(pattern);
    return true;
  } catch (e) {
    return false;
  }
}

function isValidExtension(extension) {
  return /^[a-zA-Z0-9]+$/.test(extension);
}

function createPillElement(pattern, onRemove) {
  const pill = document.createElement('span');
  pill.className = 'tag';
  pill.dataset.pattern = pattern;
  pill.title = pattern; // Add title for tooltip

  const textSpan = document.createElement('span');
  textSpan.textContent = pattern;
  pill.appendChild(textSpan);

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-tag';
  removeButton.innerHTML = '&times;';
  removeButton.onclick = () => {
    pill.remove();
    if (onRemove) onRemove(pattern);
  };

  pill.appendChild(removeButton);
  return pill;
}

function createExclusionElement(pattern) {
  return createPillElement(pattern, (text) => {
    patterns.delete(text);
    savePatterns();
  });
}

function createCombiningElement(pattern) {
  const pill = document.createElement('span');
  pill.className = 'combine-regex-pill';
  pill.dataset.pattern = pattern;
  pill.title = pattern; // Add title for tooltip

  const textSpan = document.createElement('span');
  textSpan.textContent = pattern;
  pill.appendChild(textSpan);

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-tag';
  removeButton.innerHTML = '&times;';
  removeButton.onclick = () => {
    pill.remove();
    saveCombineRegex();
  };

  pill.appendChild(removeButton);
  return pill;
}

function createExtensionElement(extension) {
  return createPillElement(extension, (text) => {
    fileTypes.delete(text);
    saveFileTypes();
  });
}

function addExclusionPattern() {
  const pattern = exclusionInput.value.trim();
  if (!pattern) return;

  if (!isValidRegex(pattern)) {
    showToast('Invalid regex pattern');
    return;
  }

  const existingPatterns = Array.from(
    document.querySelectorAll('.regex-pill')
  ).map((el) => el.dataset.pattern);
  if (existingPatterns.includes(pattern)) {
    showToast('Pattern already exists');
    return;
  }

  const pillElement = createExclusionElement(pattern);
  exclusionContainer.appendChild(pillElement);
  exclusionInput.value = '';
  savePatterns();
}

function addCombiningPattern() {
  const pattern = combiningInput.value.trim();
  if (!pattern) return;

  if (!isValidRegex(pattern)) {
    showToast('Invalid regex pattern');
    return;
  }

  const existingPatterns = Array.from(
    document.querySelectorAll('.combine-regex-pill')
  ).map((el) => el.dataset.pattern);
  if (existingPatterns.includes(pattern)) {
    showToast('Pattern already exists');
    return;
  }

  const pillElement = createCombiningElement(pattern);
  combiningContainer.appendChild(pillElement);
  combiningInput.value = '';
  saveCombineRegex();
}

function addExtension() {
  const extension = extensionInput.value.trim().toLowerCase();
  if (!extension) return;

  if (!isValidExtension(extension)) {
    showToast('Invalid file extension');
    return;
  }

  const existingExtensions = Array.from(document.querySelectorAll('.tag')).map(
    (el) => el.dataset.pattern
  );
  if (existingExtensions.includes(extension)) {
    showToast('Extension already exists');
    return;
  }

  const pillElement = createExtensionElement(extension);
  extensionContainer.appendChild(pillElement);
  extensionInput.value = '';
  saveFileTypes();
}

function resetPatterns() {
  patterns = new Set(DEFAULT_PATTERNS);
  exclusionContainer.innerHTML = '';
  DEFAULT_PATTERNS.forEach((pattern) => {
    exclusionContainer.appendChild(createExclusionElement(pattern));
  });
  savePatterns();
}

function resetFileTypes() {
  fileTypes.clear();
  extensionContainer.innerHTML = '';
  DEFAULT_EXTENSIONS.forEach((extension) => {
    fileTypes.add(extension);
    extensionContainer.appendChild(createExtensionElement(extension));
  });
  saveFileTypes();
}

function resetCombineRegex() {
  combiningContainer.innerHTML = '';
  DEFAULT_COMBINE_REGEX.forEach((pattern) => {
    const pillElement = createCombiningElement(pattern);
    combiningContainer.appendChild(pillElement);
  });
  saveCombineRegex();
}

// Event listeners
exclusionAddButton.addEventListener('click', addExclusionPattern);
exclusionResetButton.addEventListener('click', resetPatterns);
exclusionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addExclusionPattern();
  }
});

combiningAddButton.addEventListener('click', addCombiningPattern);
combiningResetButton.addEventListener('click', resetCombineRegex);
combiningInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addCombiningPattern();
  }
});

extensionAddButton.addEventListener('click', addExtension);
extensionResetButton.addEventListener('click', resetFileTypes);
extensionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addExtension();
  }
});

// Initialize
function initializePatterns() {
  chrome.storage.sync.get(['regexPatterns'], (result) => {
    if (result.regexPatterns === undefined) {
      patterns = new Set(DEFAULT_PATTERNS);
      savePatterns();
    } else {
      patterns = new Set(result.regexPatterns);
    }

    exclusionContainer.innerHTML = '';
    patterns.forEach((pattern) => {
      exclusionContainer.appendChild(createExclusionElement(pattern));
    });
  });
}

function initializeCombineRegex() {
  chrome.storage.sync.get({ combineRegex: DEFAULT_COMBINE_REGEX }, (items) => {
    const combineRegexPatterns = items.combineRegex;
    combiningContainer.innerHTML = '';
    combineRegexPatterns.forEach((pattern) => {
      const pillElement = createCombiningElement(pattern);
      combiningContainer.appendChild(pillElement);
    });
  });
}

function initializeFileTypes() {
  chrome.storage.sync.get({ fileTypes: DEFAULT_EXTENSIONS }, (items) => {
    fileTypes = new Set(items.fileTypes);
    extensionContainer.innerHTML = '';
    items.fileTypes.forEach((extension) => {
      extensionContainer.appendChild(createExtensionElement(extension));
    });
  });
}

// Initialize when options page loads
document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  initializePatterns();
  initializeFileTypes();
  initializeCombineRegex();
});
