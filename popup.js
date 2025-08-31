document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-link');
  const contents = document.querySelectorAll('.tab-content');
  const mainToggle = document.getElementById('theme-enabled-toggle');
  const controls = document.querySelectorAll('input[data-css-var]');

  // --- Utility Functions ---

  const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), delay);
    };
  };

  const getActiveTab = async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.url?.startsWith("https://chatgpt.com")) {
      return tab;
    }
    return null;
  };

  const applyCssProperty = (tabId, key, value) => {
    chrome.scripting.executeScript({
      target: { tabId },
      func: (k, v) => document.documentElement.style.setProperty(k, v),
      args: [key, value],
    });
  };

  // --- Core Logic ---

  const applyAllSettings = async (tabId) => {
    const settings = await chrome.storage.sync.get(null);
    for (const [key, value] of Object.entries(settings)) {
      if (key.startsWith('--custom-')) {
        applyCssProperty(tabId, key, value);
      }
    }
  };
  
  const saveAndApplySetting = async (key, value) => {
    await chrome.storage.sync.set({ [key]: value });
    const tab = await getActiveTab();
    if (tab) {
      applyCssProperty(tab.id, key, value);
    }
  };

  const debouncedSaveAndApply = debounce(saveAndApplySetting, 150);

  const loadSettings = async () => {
    const settings = await chrome.storage.sync.get(null);
    mainToggle.checked = !!settings.themeEnabled;

    controls.forEach(control => {
      const { cssVar, unit = '' } = control.dataset;
      const savedValue = settings[cssVar] || control.value + unit;
      
      control.value = savedValue.replace(unit, '');
      if (control.type === 'range') {
        const valueDisplay = control.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('value-display')) {
          valueDisplay.textContent = savedValue;
        }
      }
    });
  };

  // --- Event Listeners ---

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
    });
  });

  mainToggle.addEventListener('change', async () => {
    const enabled = mainToggle.checked;
    await chrome.storage.sync.set({ themeEnabled: enabled });
    
    const tab = await getActiveTab();
    if (tab) {
      if (enabled) {
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['style.css'] });
        await applyAllSettings(tab.id);
      } else {
        const settings = await chrome.storage.sync.get(null);
        for (const key of Object.keys(settings)) {
            if (key.startsWith('--custom-')) {
                applyCssProperty(tab.id, key, null);
            }
        }
        await chrome.scripting.removeCSS({ target: { tabId: tab.id }, files: ['style.css'] });
      }
    }
  });

  controls.forEach(control => {
    control.addEventListener('input', e => {
      const { cssVar, unit = '' } = e.target.dataset;
      const value = e.target.value + unit;
      
      if (e.target.type === 'range') {
        const valueDisplay = e.target.nextElementSibling;
        if (valueDisplay && valueDisplay.classList.contains('value-display')) {
            valueDisplay.textContent = value;
        }
      }
      
      debouncedSaveAndApply(cssVar, value);
    });
  });

  // --- Initialization ---
  loadSettings();
});
