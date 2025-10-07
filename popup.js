// popup.js
function isMac() {
  const p = navigator.platform || navigator.userAgent;
  return /Mac|Macintosh|MacIntel|MacPPC|Mac68K/.test(p);
}

function combo(global = false) {
  if (isMac()) {
    return global ? "⌘ ⇧ S" : "Enter or C";
  }
  return global ? "Ctrl ⇧ S" : "Enter or C";
}

function setShortcutTexts() {
  document.getElementById("sc-global").textContent = isMac()
    ? "⌘ ⇧ S"
    : "Ctrl ⇧ S";
  document.getElementById("sc-copy").textContent = combo(false);
  document.getElementById("sc-cancel").textContent = "Esc";
}

async function ensureContent(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "ENSURE_CONTENT", tabId }, (res) =>
      resolve(res?.ok)
    );
  });
}

document.addEventListener("DOMContentLoaded", setShortcutTexts);

document.getElementById("start").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await ensureContent(tab.id);
  chrome.tabs.sendMessage(tab.id, { type: "START_SNIP" });
  window.close();
});
