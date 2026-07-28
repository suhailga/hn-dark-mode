const DARK_MODE_ATTRIBUTE = "data-hn-dark-mode";

function applyDarkMode(enabled) {
  document.documentElement.toggleAttribute(DARK_MODE_ATTRIBUTE, enabled);
}

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  applyDarkMode(enabled);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.enabled) {
    applyDarkMode(changes.enabled.newValue);
  }
});
