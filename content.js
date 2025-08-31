// Apply all stored custom properties on initial load
chrome.storage.sync.get(null, (settings) => {
  if (settings.themeEnabled) {
    // Inject the main stylesheet first
    const styleSheetId = 'chatgpt-custom-theme-content';
    if (!document.getElementById(styleSheetId)) {
      const link = document.createElement('link');
      link.id = styleSheetId;
      link.rel = 'stylesheet';
      link.type = 'text/css';
      link.href = chrome.runtime.getURL('style.css');
      document.head.appendChild(link);
    }

    // Then, apply the dynamic CSS variables
    Object.entries(settings).forEach(([key, value]) => {
      if (key.startsWith('--custom-')) {
        document.documentElement.style.setProperty(key, value);
      }
    });
  }
});
