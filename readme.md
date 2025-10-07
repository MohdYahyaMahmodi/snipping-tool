<p align="center">
  <img src="icons/snipper.svg" width="96" height="96" alt="Snip In Browser Logo" />
</p>

<h1 align="center">Snip In Browser</h1>

<p align="center">
  A lightweight, Windows-style snipping overlay for Chrome — drag, refine, copy to clipboard.
</p>

<p align="center">
  <a href="https://github.com/MohdYahyaMahmodi/snipping-tool/releases"><img src="https://img.shields.io/badge/Version-1.2.0-blue?style=flat-square"></a>
  <a href="https://developer.chrome.com/docs/extensions/mv3/intro/"><img src="https://img.shields.io/badge/Manifest%20V3-✓-green?style=flat-square"></a>
  <a href="https://github.com/MohdYahyaMahmodi/snipping-tool/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-gray?style=flat-square"></a>
</p>

---

## Overview

**Snip In Browser** is a Chrome extension that brings the familiar Windows _Snipping Tool_ workflow directly into the browser.
It allows users to draw a region over the visible page, refine or move it, and copy the cropped image straight to the clipboard — all without leaving the tab or installing heavy screenshot utilities.

This project was designed with **UX consistency**, **low overhead**, and **direct API-level efficiency** in mind. It uses only standard Chrome Extension APIs and the native Clipboard API, with no external libraries or dependencies.

---

## Key Features

- **Region-based capture:** select and refine the visible area of a web page.
- **Auto-copy workflow:** automatically copies the selection to the clipboard after drag (toggleable).
- **Persistent selection:** refine or move your region before or after copying.
- **Flat Windows-style UI:** no gradients; uses `#0078D4` and neutral grays for a consistent desktop aesthetic.
- **Cross-platform shortcuts:**

  - macOS: `⌘ + ⇧ + S`
  - Windows/Linux: `Ctrl + ⇧ + S`

- **Lightweight footprint:** ~70 KB unpacked, pure JavaScript, no frameworks.

---

## Installation (Developer Mode)

1. Clone the repository:

   ```bash
   git clone https://github.com/MohdYahyaMahmodi/snipping-tool.git
   cd snipping-tool
   ```

2. In Chrome, open:

   ```
   chrome://extensions
   ```

   - Enable **Developer mode**
   - Click **Load unpacked**
   - Select the project folder

3. (Optional) Pin the extension to your toolbar.

---

## How It Works

### Capture Pipeline

1. **Overlay Injection**

   - When triggered (via popup or keyboard shortcut), a content script creates a fullscreen overlay (`div`) that captures pointer input.
   - This overlay draws an opaque mask and a visible selection rectangle with resizable handles.

2. **User Interaction**

   - The overlay listens for mouse events (`mousedown`, `mousemove`, `mouseup`) and keyboard events.
   - Coordinates are normalized and stored relative to the viewport for precise cropping on high-DPI screens.

3. **Image Capture**

   - Once a region is defined, a message is sent to the background service worker.
   - The worker calls `chrome.tabs.captureVisibleTab()` to get the current tab as a base64 PNG.

4. **Cropping and Copying**

   - The content script draws the captured PNG onto a `<canvas>`, crops it using `devicePixelRatio` to maintain fidelity, and converts the result into a Blob.
   - The cropped image is written to the clipboard using:

     ```js
     navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
     ```

5. **Feedback and Cleanup**

   - A temporary toast (“Copied to clipboard”) is shown.
   - The overlay remains active, allowing re-copying or refinement, until manually canceled (`Esc` or “Cancel”).

---

## Design Choices

### Manifest V3

The extension is built on **Manifest V3** for long-term support and modern security requirements. The background logic runs as a **service worker**, ensuring minimal idle memory usage.

### No External Dependencies

Everything is written in vanilla JavaScript, CSS, and SVG. This keeps startup fast, reduces permission surface, and ensures offline compatibility.

### UX Parity with Windows Snipping Tool

Colors, layout, and interaction design follow Microsoft’s Fluent color scheme:

- Accent blue `#0078D4`
- Neutral background `#F3F3F3`
- Dark text `#1F1F1F`

The goal is to feel _native_ inside Windows while still neutral and modern on macOS/Linux.

### Auto-Copy Preference

Users can toggle “Auto-copy on mouse release” via the popup. The state is stored in `chrome.storage.sync` and persists between sessions.
This mirrors common UX patterns where professionals prefer either auto-action or manual confirmation.

---

## Permissions

| Permission       | Purpose                                       |
| ---------------- | --------------------------------------------- |
| `activeTab`      | Capture the visible area of the active tab    |
| `tabs`           | Access tab metadata for `captureVisibleTab`   |
| `scripting`      | Inject the overlay content script dynamically |
| `clipboardWrite` | Write the cropped PNG to clipboard            |
| `storage`        | Persist user preferences (auto-copy toggle)   |
| `<all_urls>`     | Allow snipping on any user-visible website    |

All permissions are scoped to explicit user actions — no background data capture or tracking.

---

## Folder Structure

```
snipping-tool/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
└── icons/
    └── snipper.svg
```

---

## Development Notes

- **HiDPI handling:** All crop coordinates are multiplied by `window.devicePixelRatio` before canvas draw to ensure sharp captures on Retina and 4K displays.
- **Event isolation:** All listeners are removed when the overlay is dismissed to avoid memory leaks.
- **Keyboard accessibility:** `Enter`, `C`, and `Esc` mimic standard screenshot tool behaviors.
- **Resilience:** If `navigator.clipboard.write()` fails (due to site restrictions), the extension falls back to opening the cropped image in a new tab.

---

## Roadmap

- Add annotation layer (pen, rectangle, text)
- Add “Save to file” mode
- Optional keyboard navigation for resizing and moving selection
- Configurable color themes and snapping grid

---

## License

Licensed under the [MIT License](LICENSE).
© 2025 Mohd Mahmodi — All rights reserved.

---

<p align="center">
  <sub>Developed by <a href="https://github.com/MohdYahyaMahmodi">Mohd Mahmodi</a></sub>
</p>
