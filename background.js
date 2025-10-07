// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "CAPTURE_VISIBLE") {
    chrome.tabs.captureVisibleTab(
      sender.tab.windowId,
      { format: "png" },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
          return;
        }
        sendResponse({ ok: true, dataUrl });
      }
    );
    return true; // async
  }

  if (msg?.type === "ENSURE_CONTENT") {
    chrome.scripting.executeScript(
      { target: { tabId: msg.tabId }, files: ["content.js"] },
      () => {
        if (chrome.runtime.lastError) {
          sendResponse({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ ok: true });
        }
      }
    );
    return true;
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "start-snip") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await new Promise((resolve) => {
    chrome.scripting.executeScript(
      { target: { tabId: tab.id }, files: ["content.js"] },
      () => resolve()
    );
  });
  chrome.tabs.sendMessage(tab.id, { type: "START_SNIP" });
});
