// popup.js
function isMac() {
  const p = navigator.platform || navigator.userAgent || "";
  return /Mac|Macintosh|MacIntel|MacPPC|Mac68K/.test(p);
}

function setShortcutTexts() {
  document.getElementById("sc-global").textContent = isMac()
    ? "⌘ ⇧ S"
    : "Ctrl ⇧ S";
}

// Load & bind auto-copy preference
function initAutoCopyCheckbox() {
  const el = document.getElementById("autoCopy");
  chrome.storage.sync.get(
    { autoCopyOnMouseup: true },
    ({ autoCopyOnMouseup }) => {
      el.checked = !!autoCopyOnMouseup;
    }
  );
  el.addEventListener("change", () => {
    chrome.storage.sync.set({ autoCopyOnMouseup: el.checked });
  });
}

async function ensureContent(tabId) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "ENSURE_CONTENT", tabId }, (res) =>
      resolve(res?.ok)
    );
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setShortcutTexts();
  initAutoCopyCheckbox();

  document.getElementById("start").addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (!tab?.id) return;

    // read current setting and pass through to content
    chrome.storage.sync.get(
      { autoCopyOnMouseup: true },
      async ({ autoCopyOnMouseup }) => {
        await ensureContent(tab.id);
        chrome.tabs.sendMessage(tab.id, {
          type: "START_SNIP",
          autoCopyOnMouseup: !!autoCopyOnMouseup,
        });
        window.close();
      }
    );
  });
});
