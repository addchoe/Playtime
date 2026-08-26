/* ── DRAWING — 웹캠 손가락 추적 (MediaPipe Hands) ──
   검지 손가락 끝(landmark 8)의 좌표를 정규화된 [0,1] 범위로 콜백에 전달한다.
   x축은 거울처럼 보이도록 미리 반전(1 - x)해서 넘겨준다.
   카메라 권한이 거부되거나 MediaPipe 로드에 실패하면 onStatusChange('error')를 호출하고,
   호출부(drawing.js)가 마우스 폴백으로 전환할 수 있게 한다. */

const DrawingHandTracking = (function () {
  const MODEL_LOAD_TIMEOUT = 8000;
  let hands = null;
  let stream = null;
  let videoEl = null;
  let running = false;
  let sending = false;
  let onFrame = null;
  let onStatusChange = null;
  let noHandTimer = null;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-drawing-cdn="' + src + '"]');
      if (existing) { existing.addEventListener('load', resolve); if (existing.dataset.loaded) resolve(); return; }
      const s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.dataset.drawingCdn = src;
      s.onload = () => { s.dataset.loaded = '1'; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
    ]);
  }

  async function ensureMediaPipeLoaded() {
    if (window.Hands) return;
    await withTimeout(
      loadScript('https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js'),
      MODEL_LOAD_TIMEOUT
    );
    if (!window.Hands) throw new Error('Hands not available after script load');
  }

  function onResults(results) {
    if (!running) return;
    const list = results.multiHandLandmarks;
    if (list && list.length > 0) {
      const tip = list[0][8]; // index fingertip
      clearTimeout(noHandTimer);
      onStatusChange && onStatusChange('active');
      onFrame && onFrame(1 - tip.x, tip.y, true);
    } else {
      onFrame && onFrame(null, null, false);
      clearTimeout(noHandTimer);
      noHandTimer = setTimeout(() => onStatusChange && onStatusChange('no-hand'), 400);
    }
  }

  async function frameLoop() {
    if (!running) return;
    if (videoEl.readyState >= 2 && !sending) {
      sending = true;
      try {
        await hands.send({ image: videoEl });
      } catch (e) { /* transient decode errors are safe to ignore */ }
      sending = false;
    }
    requestAnimationFrame(frameLoop);
  }

  async function init(opts) {
    videoEl = opts.videoEl;
    onFrame = opts.onFrame;
    onStatusChange = opts.onStatusChange;

    try {
      onStatusChange && onStatusChange('requesting');
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      videoEl.srcObject = stream;
      await videoEl.play();

      onStatusChange && onStatusChange('loading-model');
      await ensureMediaPipeLoaded();

      hands = new window.Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
      });
      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 0,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });
      hands.onResults(onResults);

      running = true;
      frameLoop();
      return true;
    } catch (err) {
      onStatusChange && onStatusChange('error');
      stop();
      return false;
    }
  }

  function stop() {
    running = false;
    clearTimeout(noHandTimer);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
      stream = null;
    }
  }

  return { init, stop };
})();
