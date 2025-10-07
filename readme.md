# Snip In Browser — a Windows-style snipping tool for Chrome (MV3)

A fast, no-frills snipping overlay **inside the browser**, inspired by the Windows Snipping Tool. Click the toolbar icon or press a global shortcut, drag a region, and the cropped PNG is copied to your clipboard automatically.

- **Design:** flat Windows aesthetic (no gradients)
- **Usage flow:** click/shortcut → drag → auto-copy → paste
- **Precision UI:** resize handles, move selection, toolbar at top-left
- **Shortcuts:** global start, in-overlay copy/cancel
- **Clipboard-first:** PNG goes straight to clipboard, with fallback

> Maintained by [mohd mahmodi](https://github.com/MohdYahyaMahmodi) — repo:  
> https://github.com/MohdYahyaMahmodi/snipping-tool

---

## Features

- 🖼️ **Region capture of the visible page** (hi-DPI aware; uses `devicePixelRatio`)
- ⚡ **Auto-copy on mouseup** (configurable in code)
- ⌨️ **Keyboard control**:
  - **Copy:** `Enter` or `C`
  - **Cancel:** `Esc`
- 🧭 **Toolbar** anchored to selection’s top-left; **Copy** and **Cancel** buttons
- 🎯 **Move** and **resize** the selection before copying
- 🧩 **Manifest V3**: background service worker + content script

---
