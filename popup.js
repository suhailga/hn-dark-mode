const toggle = document.querySelector("#dark-mode-toggle");
const status = document.querySelector("#status");

function updateStatus(enabled) {
  status.textContent = `Dark mode is ${enabled ? "on" : "off"}`;
}

chrome.storage.sync.get({ enabled: true }, ({ enabled }) => {
  toggle.checked = enabled;
  updateStatus(enabled);
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  updateStatus(enabled);
  chrome.storage.sync.set({ enabled });
});
