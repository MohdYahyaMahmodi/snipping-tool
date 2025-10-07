// content.js
(() => {
  if (window.__snipInBrowserInjected) return;
  window.__snipInBrowserInjected = true;

  const COLORS = {
    mask: "rgba(0,0,0,0.45)",
    border: "#0078D4",
    handle: "#FFFFFF",
    toolbarBg: "#F3F3F3",
    toolbarText: "#1F1F1F",
    toolbarBorder: "#D0D0D0",
    tooltipBg: "#2B2B2B",
    tooltipText: "#FFFFFF",
  };

  let overlay, maskTop, maskLeft, maskRight, maskBottom, selection, toolbar;
  let startX = 0,
    startY = 0,
    endX = 0,
    endY = 0;
  let dragging = false,
    moving = false,
    resizing = false;
  let activeHandle = null;
  let copiedToastTimeout = null;
  let copyingInProgress = false;
  let autoCopyOnMouseup = true; // can be overridden by popup/command

  const MIN_SIZE = 3;

  function px(n) {
    return `${n}px`;
  }
  function clamp(v, min, max) {
    return Math.min(Math.max(v, min), max);
  }
  function makeDiv(cls, styles = {}) {
    const d = document.createElement("div");
    d.className = cls;
    Object.assign(d.style, styles);
    return d;
  }

  // ----- UI BUILD -----
  function ensureUI() {
    if (overlay) return;

    overlay = makeDiv("snip-overlay", {
      position: "fixed",
      inset: "0",
      zIndex: "2147483647",
      cursor: "crosshair",
      userSelect: "none",
    });

    const maskStyle = {
      position: "absolute",
      background: COLORS.mask,
      pointerEvents: "none",
    };
    maskTop = makeDiv("snip-mask-top", maskStyle);
    maskLeft = makeDiv("snip-mask-left", maskStyle);
    maskRight = makeDiv("snip-mask-right", maskStyle);
    maskBottom = makeDiv("snip-mask-bottom", maskStyle);

    selection = makeDiv("snip-selection", {
      position: "absolute",
      border: `2px solid ${COLORS.border}`,
      boxSizing: "border-box",
      display: "none",
      background: "transparent",
      cursor: "move",
      pointerEvents: "auto",
    });

    // 8 handles
    ["nw", "n", "ne", "e", "se", "s", "sw", "w"].forEach((pos) => {
      const h = makeDiv(`snip-handle snip-h-${pos}`, {
        position: "absolute",
        width: "10px",
        height: "10px",
        background: COLORS.handle,
        border: `2px solid ${COLORS.border}`,
        boxSizing: "border-box",
        borderRadius: "2px",
        cursor: cursorForHandle(pos),
      });
      h.dataset.pos = pos;
      selection.appendChild(h);
    });

    // Toolbar (top-left of selection)
    toolbar = makeDiv("snip-toolbar", {
      position: "absolute",
      display: "none",
      background: COLORS.toolbarBg,
      color: COLORS.toolbarText,
      border: `1px solid ${COLORS.toolbarBorder}`,
      borderRadius: "6px",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
      padding: "6px",
      gap: "6px",
      fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      alignItems: "center",
    });

    const button = (id, label, title) => {
      const b = makeDiv(id, {
        border: `1px solid ${COLORS.toolbarBorder}`,
        background: "#FFFFFF",
        color: COLORS.toolbarText,
        borderRadius: "4px",
        padding: "6px 10px",
        cursor: "pointer",
        userSelect: "none",
      });
      b.textContent = label;
      b.title = title;
      // prevent starting a new drag when clicking toolbar
      b.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      return b;
    };

    const copyBtn = button(
      "snip-btn-copy",
      "Copy",
      "Copy to clipboard (Enter or C)"
    );
    copyBtn.addEventListener("click", () => confirmSelection(false)); // keep overlay after copy

    const cancelBtn = button("snip-btn-cancel", "Cancel", "Cancel (Esc)");
    cancelBtn.addEventListener("click", () => removeUI());

    toolbar.append(copyBtn, cancelBtn);
    toolbar.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    overlay.append(
      maskTop,
      maskLeft,
      maskRight,
      maskBottom,
      selection,
      toolbar
    );
    document.documentElement.appendChild(overlay);

    overlay.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove, true);
    window.addEventListener("mouseup", onMouseUp, true);
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", onResizeOrScroll, true);
    window.addEventListener("scroll", onResizeOrScroll, true);
  }

  function cursorForHandle(pos) {
    return (
      {
        n: "ns-resize",
        s: "ns-resize",
        e: "ew-resize",
        w: "ew-resize",
        nw: "nwse-resize",
        se: "nwse-resize",
        ne: "nesw-resize",
        sw: "nesw-resize",
      }[pos] || "move"
    );
  }

  function positionHandles() {
    const s = selection.getBoundingClientRect();
    const coords = {
      n: [s.width / 2 - 5, -5],
      s: [s.width / 2 - 5, s.height - 5],
      e: [s.width - 5, s.height / 2 - 5],
      w: [-5, s.height / 2 - 5],
      nw: [-5, -5],
      ne: [s.width - 5, -5],
      sw: [-5, s.height - 5],
      se: [s.width - 5, s.height - 5],
    };
    selection.querySelectorAll(".snip-handle").forEach((h) => {
      const [x, y] = coords[h.dataset.pos] || [0, 0];
      h.style.left = px(x);
      h.style.top = px(y);
    });
  }

  function normalizeRect(aX, aY, bX, bY) {
    const left = Math.min(aX, bX);
    const top = Math.min(aY, bY);
    const right = Math.max(aX, bX);
    const bottom = Math.max(aY, bY);
    return { left, top, width: right - left, height: bottom - top };
  }

  function updateMasks(rect) {
    const vw = window.innerWidth,
      vh = window.innerHeight;
    Object.assign(maskTop.style, {
      left: "0px",
      top: "0px",
      width: px(vw),
      height: px(rect.top),
    });
    Object.assign(maskLeft.style, {
      left: "0px",
      top: px(rect.top),
      width: px(rect.left),
      height: px(rect.height),
    });
    Object.assign(maskRight.style, {
      left: px(rect.left + rect.width),
      top: px(rect.top),
      width: px(vw - (rect.left + rect.width)),
      height: px(rect.height),
    });
    Object.assign(maskBottom.style, {
      left: "0px",
      top: px(rect.top + rect.height),
      width: px(vw),
      height: px(vh - (rect.top + rect.height)),
    });
  }

  function placeToolbarTopLeft(rect) {
    const margin = 8;
    toolbar.style.display = "flex";
    const tLeft = clamp(
      rect.left,
      8,
      window.innerWidth - toolbar.offsetWidth - 8
    );
    const tTop = clamp(
      rect.top - toolbar.offsetHeight - margin,
      8,
      window.innerHeight - toolbar.offsetHeight - 8
    );
    toolbar.style.left = px(tLeft);
    toolbar.style.top = px(tTop);
  }

  function getSelectionRect() {
    return selection.getBoundingClientRect();
  }

  function onResizeOrScroll() {
    if (!selection || selection.style.display === "none") return;
    const r = getSelectionRect();
    updateMasks(r);
    placeToolbarTopLeft(r);
    positionHandles();
  }

  // ----- INPUT -----
  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (e.target.closest(".snip-toolbar")) return; // ignore toolbar
    // inside existing selection/handle?
    if (selection.style.display !== "none") {
      if (e.target.classList.contains("snip-handle")) {
        resizing = true;
        activeHandle = e.target.dataset.pos;
      } else if (e.target === selection) {
        moving = true;
      }
    }
    dragging = !moving && !resizing;
    startX = e.clientX;
    startY = e.clientY;

    if (dragging) {
      selection.style.display = "block";
      Object.assign(selection.style, {
        left: px(startX),
        top: px(startY),
        width: "0px",
        height: "0px",
      });
      toolbar.style.display = "none";
      overlay.style.cursor = "crosshair";
      updateMasks({ left: startX, top: startY, width: 0, height: 0 });
    }

    if (moving) {
      const rect = selection.getBoundingClientRect();
      selection.dataset.offsetX = (e.clientX - rect.left).toString();
      selection.dataset.offsetY = (e.clientY - rect.top).toString();
      overlay.style.cursor = "move";
    }

    if (resizing) overlay.style.cursor = cursorForHandle(activeHandle);

    e.preventDefault();
    e.stopPropagation();
  }

  function onMouseMove(e) {
    if (!overlay) return;

    if (dragging) {
      endX = e.clientX;
      endY = e.clientY;
      const r = normalizeRect(startX, startY, endX, endY);
      Object.assign(selection.style, {
        left: px(r.left),
        top: px(r.top),
        width: px(r.width),
        height: px(r.height),
      });
      updateMasks(r);
      positionHandles();
    } else if (moving) {
      const offX = parseFloat(selection.dataset.offsetX || "0");
      const offY = parseFloat(selection.dataset.offsetY || "0");
      const w = selection.offsetWidth,
        h = selection.offsetHeight;
      const newLeft = clamp(e.clientX - offX, 0, window.innerWidth - w);
      const newTop = clamp(e.clientY - offY, 0, window.innerHeight - h);
      Object.assign(selection.style, { left: px(newLeft), top: px(newTop) });
      updateMasks({ left: newLeft, top: newTop, width: w, height: h });
      placeToolbarTopLeft({ left: newLeft, top: newTop, width: w, height: h });
      positionHandles();
    } else if (resizing) {
      const rect = selection.getBoundingClientRect();
      let left = rect.left,
        top = rect.top,
        w = rect.width,
        h = rect.height;
      const dx = e.clientX - startX,
        dy = e.clientY - startY;
      const pos = activeHandle;
      if (pos.includes("e")) w = Math.max(1, w + dx);
      if (pos.includes("s")) h = Math.max(1, h + dy);
      if (pos.includes("w")) {
        w = Math.max(1, w - dx);
        left += dx;
      }
      if (pos.includes("n")) {
        h = Math.max(1, h - dy);
        top += dy;
      }

      left = clamp(left, 0, window.innerWidth - w);
      top = clamp(top, 0, window.innerHeight - h);
      w = clamp(w, 1, window.innerWidth - left);
      h = clamp(h, 1, window.innerHeight - top);

      startX = e.clientX;
      startY = e.clientY;
      Object.assign(selection.style, {
        left: px(left),
        top: px(top),
        width: px(w),
        height: px(h),
      });
      updateMasks({ left, top, width: w, height: h });
      placeToolbarTopLeft({ left, top, width: w, height: h });
      positionHandles();
    }
  }

  function onMouseUp() {
    if (!overlay) return;

    if (dragging) {
      dragging = false;
      const r = selection.getBoundingClientRect();
      if (r.width < MIN_SIZE || r.height < MIN_SIZE) {
        // ignore micro drags; keep overlay alive
        toolbar.style.display = "none";
        selection.style.display = "none";
        overlay.style.cursor = "crosshair";
        updateMasks({ left: 0, top: 0, width: 0, height: 0 });
        return;
      }
      updateMasks({
        left: r.left,
        top: r.top,
        width: r.width,
        height: r.height,
      });
      placeToolbarTopLeft(r);
      overlay.style.cursor = "default";

      if (autoCopyOnMouseup) {
        // slight delay to avoid racing with mouseup events
        setTimeout(() => confirmSelection(false), 30); // false => keep overlay after copy
      }
    }

    if (moving) moving = false;
    if (resizing) {
      resizing = false;
      activeHandle = null;
      overlay.style.cursor = "default";
    }
  }

  function onKeyDown(e) {
    if (!overlay) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      removeUI();
    }
    if (e.key === "Enter" || e.key.toLowerCase() === "c") {
      e.stopPropagation();
      e.preventDefault();
      confirmSelection(false);
    }
  }

  // ----- COPY WORKFLOW -----
  function toastCopied(text = "Copied to clipboard") {
    const t = makeDiv("snip-toast", {
      position: "fixed",
      left: "50%",
      bottom: "28px",
      transform: "translateX(-50%)",
      padding: "10px 14px",
      background: COLORS.tooltipBg,
      color: COLORS.tooltipText,
      fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
      fontSize: "13px",
      borderRadius: "6px",
      zIndex: "2147483647",
      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
    });
    t.textContent = text;
    document.documentElement.appendChild(t);
    if (copiedToastTimeout) clearTimeout(copiedToastTimeout);
    copiedToastTimeout = setTimeout(() => t.remove(), 1500);
  }

  async function confirmSelection(removeAfter = false) {
    if (!selection || copyingInProgress) return;
    const r = selection.getBoundingClientRect();
    if (r.width < MIN_SIZE || r.height < MIN_SIZE) return;

    copyingInProgress = true;

    const resp = await chrome.runtime.sendMessage({ type: "CAPTURE_VISIBLE" });
    if (!resp?.ok) {
      alert("Capture failed: " + (resp?.error || "unknown"));
      copyingInProgress = false;
      if (removeAfter) removeUI();
      return;
    }

    const dataUrl = resp.dataUrl;
    const dpr = window.devicePixelRatio || 1;
    const crop = {
      x: Math.round(r.left * dpr),
      y: Math.round(r.top * dpr),
      w: Math.round(r.width * dpr),
      h: Math.round(r.height * dpr),
    };

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = crop.w;
      canvas.height = crop.h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, crop.w, crop.h);

      canvas.toBlob(async (blob) => {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          toastCopied("Copied to clipboard");
        } catch {
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        } finally {
          copyingInProgress = false;
          if (removeAfter) removeUI(); // normally false; keep selection so user can tweak and re-copy
        }
      }, "image/png");
    };
    img.src = dataUrl;
  }

  function removeUI() {
    if (!overlay) return;
    try {
      overlay.remove();
    } catch {}
    overlay = null;
    selection = null;
    toolbar = null;
    maskTop = maskLeft = maskRight = maskBottom = null;
    dragging = moving = resizing = false;
    activeHandle = null;
    copyingInProgress = false;
  }

  // ----- Messaging -----
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "START_SNIP") {
      // prefer explicit flag from popup/command; otherwise read storage
      if (typeof msg.autoCopyOnMouseup === "boolean") {
        autoCopyOnMouseup = msg.autoCopyOnMouseup;
        ensureUI();
      } else {
        chrome.storage.sync.get({ autoCopyOnMouseup: true }, (cfg) => {
          autoCopyOnMouseup = !!cfg.autoCopyOnMouseup;
          ensureUI();
        });
      }
    }
  });
})();
