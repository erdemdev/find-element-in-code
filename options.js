// Save options to chrome.storage
function saveOptions() {
  const editor = document.getElementById('editor').value;
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

// File extension management
const extensionInput = document.getElementById('extension-input');
const addExtensionButton = document.getElementById('add-extension');
const resetExtensionsButton = document.getElementById('reset-extensions');
const extensionsContainer = document.getElementById('extensions-container');

// Default values
const DEFAULT_PATTERNS = ['^radix-'];
const DEFAULT_EXTENSIONS = ['html', 'jsx', 'tsx', 'astro', 'php'];

let patterns = new Set();
let extensions = new Set();

function savePatterns() {
  chrome.storage.sync.set({ regexPatterns: Array.from(patterns) }, () => {
    showToast('Options saved');
  });
}

function saveExtensions() {
  chrome.storage.sync.set({ fileExtensions: Array.from(extensions) }, () => {
    showToast('Options saved');
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

function isValidExtension(extension) {
  return /^[a-zA-Z0-9]+$/.test(extension);
}

function createPillElement(text, onRemove) {
  const pill = document.createElement('span');
  pill.className = 'tag';
  pill.textContent = text;

  const removeButton = document.createElement('button');
  removeButton.className = 'remove-tag';
  removeButton.innerHTML = '&times;';
  removeButton.onclick = () => {
    pill.remove();
    onRemove(text);
  };

  pill.appendChild(removeButton);
  return pill;
}

function createRegexElement(pattern) {
  return createPillElement(pattern, (text) => {
    patterns.delete(text);
    savePatterns();
  });
}

function createExtensionElement(extension) {
  return createPillElement(extension, (text) => {
    extensions.delete(text);
    saveExtensions();
  });
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

function addExtension() {
  // Remove leading dot and convert to lowercase
  const extension = extensionInput.value
    .trim()
    .toLowerCase()
    .replace(/^\./, '');

  if (!extension) return;

  if (!isValidExtension(extension)) {
    extensionInput.classList.add('invalid-input');
    return;
  }

  extensionInput.classList.remove('invalid-input');

  if (!extensions.has(extension)) {
    extensions.add(extension);
    extensionsContainer.appendChild(createExtensionElement(extension));
    extensionInput.value = '';
    saveExtensions();
  }
}

function resetPatterns() {
  patterns = new Set(DEFAULT_PATTERNS);
  regexContainer.innerHTML = '';
  DEFAULT_PATTERNS.forEach((pattern) => {
    regexContainer.appendChild(createRegexElement(pattern));
  });
  savePatterns();
}

function resetExtensions() {
  extensions = new Set(DEFAULT_EXTENSIONS);
  extensionsContainer.innerHTML = '';
  DEFAULT_EXTENSIONS.forEach((extension) => {
    extensionsContainer.appendChild(createExtensionElement(extension));
  });
  saveExtensions();
}

// Event listeners
addRegexButton.addEventListener('click', addRegexPattern);
resetButton.addEventListener('click', resetPatterns);
regexInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addRegexPattern();
  }
});

addExtensionButton.addEventListener('click', addExtension);
resetExtensionsButton.addEventListener('click', resetExtensions);
extensionInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addExtension();
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

extensionInput.addEventListener('input', () => {
  if (extensionInput.classList.contains('invalid-input')) {
    const extension = extensionInput.value.trim();
    if (isValidExtension(extension) || !extension) {
      extensionInput.classList.remove('invalid-input');
    }
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

    regexContainer.innerHTML = '';
    patterns.forEach((pattern) => {
      regexContainer.appendChild(createRegexElement(pattern));
    });
  });
}

function initializeExtensions() {
  chrome.storage.sync.get(['fileExtensions'], (result) => {
    if (result.fileExtensions === undefined) {
      extensions = new Set(DEFAULT_EXTENSIONS);
      saveExtensions();
    } else {
      extensions = new Set(result.fileExtensions);
    }

    extensionsContainer.innerHTML = '';
    extensions.forEach((extension) => {
      extensionsContainer.appendChild(createExtensionElement(extension));
    });
  });
}

// Initialize when options page loads
document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();
  initializePatterns();
  initializeExtensions();
});
