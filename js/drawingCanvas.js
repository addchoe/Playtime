// Reusable pointer-driven drawing canvas hook. Kept decoupled from any one
// page's markup/IDs so it can be reused anywhere a "draw with your mouse"
// canvas is needed — currently the Contact page's feedback drawing.
//
// createDrawingCanvas(canvasEl, options) -> {
//   hasDrawing(): boolean,
//   onChange(fn): subscribe to hasDrawing() changes,
//   clear(): erase everything,
//   toBlob(callback, type?, quality?): export the current drawing as a PNG Blob,
// }
function createDrawingCanvas(canvas, options) {
  const opts = Object.assign({ color: '#111111', lineWidth: 3 }, options);
  const ctx = canvas.getContext('2d');

  // Points are stored as fractions (0..1) of the canvas's own box, not raw
  // pixels — that makes redrawing after a resize (window resize, DPR change)
  // a matter of re-multiplying by the new box size instead of guessing how
  // to rescale a pixel-space stroke.
  const strokes = [];
  let currentStroke = null;
  let drawing = false;
  const changeListeners = [];

  function hasDrawing() {
    return strokes.some(s => s.points.length >= 2);
  }

  function notifyChange() {
    const has = hasDrawing();
    changeListeners.forEach(fn => fn(has));
  }

  function applyBrush() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = opts.color;
    ctx.lineWidth = opts.lineWidth;
  }

  function redraw(rect) {
    rect = rect || canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    applyBrush();
    strokes.forEach(stroke => paintStroke(stroke, rect));
  }

  function paintStroke(stroke, rect) {
    if (stroke.points.length === 0) return;
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      const x = p.x * rect.width;
      const y = p.y * rect.height;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Backing-store resolution tracks the canvas's own on-screen box × devicePixelRatio,
  // so strokes stay crisp regardless of window resizes or high-DPI displays.
  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw(rect);
  }

  function pointFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }

  function handlePointerDown(e) {
    if (e.button !== undefined && e.button !== 0) return;
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    currentStroke = { points: [pointFromEvent(e)] };
    strokes.push(currentStroke);

    const rect = canvas.getBoundingClientRect();
    applyBrush();
    ctx.beginPath();
    const p = currentStroke.points[0];
    ctx.moveTo(p.x * rect.width, p.y * rect.height);
    e.preventDefault();
  }

  function handlePointerMove(e) {
    if (!drawing || !currentStroke) return;
    const point = pointFromEvent(e);
    currentStroke.points.push(point);

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(point.x * rect.width, point.y * rect.height);
    ctx.stroke();

    // Only a real stroke (2+ points, i.e. actual movement) counts as "drawn" —
    // a bare pointerdown/up click must not flip the Send button active.
    if (currentStroke.points.length === 2) notifyChange();
    e.preventDefault();
  }

  // Pointer capture (set on pointerdown above) keeps delivering move/up events
  // to this canvas even while the pointer is outside its bounds, so a fast
  // stroke that leaves and re-enters the canvas draws one continuous line
  // instead of jumping/reconnecting with a stray straight segment.
  function endStroke(e) {
    if (!drawing) return;
    drawing = false;
    if (currentStroke && currentStroke.points.length < 2) {
      const idx = strokes.indexOf(currentStroke);
      if (idx !== -1) strokes.splice(idx, 1);
    }
    currentStroke = null;
    if (e && canvas.hasPointerCapture && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  }

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerup', endStroke);
  canvas.addEventListener('pointercancel', endStroke);

  const resizeObserver = new ResizeObserver(() => resize());
  resizeObserver.observe(canvas);
  resize();

  return {
    hasDrawing,
    onChange(fn) { changeListeners.push(fn); },
    clear() {
      strokes.length = 0;
      currentStroke = null;
      drawing = false;
      redraw();
      notifyChange();
    },
    toBlob(callback, type, quality) {
      canvas.toBlob(callback, type || 'image/png', quality);
    },
  };
}
