/* ── NAV (main.html과 공통) ── */
function updateTime() {
  const now = new Date();
  let h = now.getHours();
  const m = String(now.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  document.getElementById('nav-time').textContent = h + ':' + m + ' ' + ampm;
}
updateTime();
setInterval(updateTime, 1000);

let isOpen = false;

function toggleNav() {
  isOpen ? closeNav() : openNav();
}

function openNav() {
  isOpen = true;
  document.getElementById('nav-pill').classList.add('open');
  document.getElementById('nav-overlay').classList.add('open');
}

function closeNav() {
  isOpen = false;
  document.getElementById('nav-pill').classList.remove('open');
  document.getElementById('nav-overlay').classList.remove('open');
}

/* ── 1920x1080 고정 디자인 캔버스를 화면에 맞춰 스케일 (index.html의 .viewport-scale과 동일 방식) ── */
let washupScale = 1;
function washupFitViewport() {
  washupScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('washup-viewport-scale').style.transform = 'scale(' + washupScale + ')';

  /* nav-overlay는 washup-viewport-scale 안에 중첩되어 함께 스케일되므로, 스케일 후에도
     실제 창 전체를 덮도록 축소분을 상쇄하는 크기로 역산해서 채워준다. */
  const overlay = document.getElementById('nav-overlay');
  const overscan = 4 / washupScale;
  const w = window.innerWidth / washupScale + overscan;
  const h = window.innerHeight / washupScale + overscan;
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';
  overlay.style.left = ((1920 - w) / 2) + 'px';
  overlay.style.top = ((1080 - h) / 2) + 'px';
}
washupFitViewport();
window.addEventListener('resize', washupFitViewport);

/* 실제 화면 px 좌표(clientX/Y) → 1920x1080 디자인 좌표로 변환. 마우스든 손 추적이든
   전부 이 함수를 거쳐 scene container(.washup-stage) 기준 상대 좌표로 계산한다 —
   화면 크기가 달라져도 오브젝트 위치와 포인터 좌표가 항상 정확히 대응한다. */
function washupToStageCoords(clientX, clientY) {
  const rect = document.getElementById('washup-stage').getBoundingClientRect();
  return {
    x: (clientX - rect.left) / washupScale,
    y: (clientY - rect.top) / washupScale,
  };
}

/* ══════════════════════════ WASH UP ══════════════════════════ */

const washupVideoEl = document.getElementById('washup-video');
const washupCanvasEl = document.getElementById('washup-canvas');
const washupCtx = washupCanvasEl.getContext('2d');
const washupStageEl = document.getElementById('washup-stage');
const washupPermissionEl = document.getElementById('washup-permission');
const washupPermissionTextEl = document.getElementById('washup-permission-text');
const washupCameraStatusEl = document.getElementById('washup-camera-status');
const washupCameraStatusTextEl = document.getElementById('washup-camera-status-text');
const washupStatusEl = document.getElementById('washup-state-status');
const washupHandleWrapEl = document.getElementById('washup-handle-wrap');
const washupHandleLeverEl = document.getElementById('washup-handle-lever');
const washupShowerballEl = document.getElementById('washup-showerball');
const washupDuckEl = document.getElementById('washup-duck');

const washupReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let washupStream = null;

/* ── 카메라 ── */
function washupInit() {
  washupHandleWrapEl.addEventListener('pointerdown', washupOnHandlePointerDown);
  washupHandleWrapEl.addEventListener('pointermove', washupOnHandlePointerMove);
  washupHandleWrapEl.addEventListener('pointerup', washupOnHandlePointerUp);
  washupHandleWrapEl.addEventListener('pointercancel', washupOnHandlePointerUp);
  washupHandleWrapEl.addEventListener('keydown', washupOnHandleKeyDown);

  washupShowerballEl.addEventListener('pointerdown', washupOnBallPointerDown);
  window.addEventListener('pointermove', washupOnBallPointerMove);
  window.addEventListener('pointerup', washupOnBallPointerUp);

  washupDuckEl.addEventListener('pointerdown', washupOnDuckGrab);

  window.addEventListener('resize', washupResizeCanvas);

  washupSetHandleValue(0);
  washupSetBallPos(WASHUP_BALL_HOME.x, WASHUP_BALL_HOME.y);
  washupSetDuckPos(WASHUP_DUCK_HOME.x, WASHUP_DUCK_HOME.y, 0);
  washupResizeCanvas();
  requestWashUpCamera();
  washupInitMediaPipe();
  washupAnimate();
}

async function requestWashUpCamera() {
  washupPermissionEl.hidden = true;
  washupSetCameraStatus('connecting', '카메라 연결 중…');
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    washupSetCameraStatus('denied', '카메라 미지원');
    washupPermissionTextEl.textContent = '이 브라우저는 카메라를 지원하지 않습니다.';
    washupPermissionEl.hidden = false;
    return;
  }
  try {
    // 거울처럼 보이게 하는 좌우 반전은 .washup-video-bg { transform: scaleX(-1) }에서 처리.
    // 원본 프레임(카메라 raw)은 반전되지 않은 상태이므로, 손 추적 좌표를 화면과
    // 맞추려면 washupVideoNormToStage()에서 별도로 좌우를 뒤집어준다.
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    washupStream = stream;
    washupVideoEl.srcObject = stream;
    await washupVideoEl.play().catch(() => {});
    washupCameraActive = true;
    washupRefreshCameraStatusText();
  } catch (err) {
    washupSetCameraStatus('denied', '카메라 권한 필요');
    washupPermissionTextEl.textContent = '카메라 권한이 거부되었거나 사용할 수 없습니다. 권한을 허용한 뒤 다시 시도해 주세요.';
    washupPermissionEl.hidden = false;
  }
}

function washupSetCameraStatus(kind, text) {
  washupCameraStatusEl.classList.remove('active', 'denied');
  if (kind === 'active') washupCameraStatusEl.classList.add('active');
  if (kind === 'denied') washupCameraStatusEl.classList.add('denied');
  washupCameraStatusTextEl.textContent = text;
}

/* 손 추적이 콘솔 경고로만 남으면 사용자가 "손이 왜 안 되는지" 알 방법이 없어서,
   카메라 상태 배지에 손 추적 성공/실패 여부를 눈에 보이게 같이 표시한다. */
let washupCameraActive = false;
let washupHandInitDone = false;
function washupRefreshCameraStatusText() {
  if (!washupCameraActive) return;
  if (!washupHandInitDone) {
    washupSetCameraStatus('active', '카메라 연결됨 · 손 추적 확인 중…');
  } else if (washupHandLandmarker) {
    washupSetCameraStatus('active', '카메라 연결됨 · 손 추적 켜짐');
  } else {
    washupSetCameraStatus('active', '카메라 연결됨 · 손 추적 꺼짐(마우스만 가능)');
  }
}

function washupStopCamera() {
  if (washupStream) {
    washupStream.getTracks().forEach((t) => t.stop());
    washupStream = null;
  }
  if (washupVideoEl) washupVideoEl.srcObject = null;
}

/* 캔버스는 washup-viewport-scale(1920x1080) 안에서 position:fixed로 그 조상을
   컨테이닝 블록 삼아 채워지므로, 자기 CSS 박스는 화면 크기와 무관하게 항상
   1920x1080 논리 좌표다. getBoundingClientRect()는 조상의 scale() 변환이 적용된
   "실제 화면 px" 크기를 돌려주므로, 그 값으로 캔버스 버퍼를 잡으면 1920 기준으로
   그려지는 물 파티클 좌표(WASHUP_NOZZLE_X 등)가 washupScale 배율만큼 늘어나 보여서
   샤워헤드와 어긋난다 — 항상 1920x1080 고정값을 써야 한다. */
function washupResizeCanvas() {
  if (!washupCanvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  washupCanvasEl.width = 1920 * dpr;
  washupCanvasEl.height = 1080 * dpr;
  washupCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

/* ── object-fit: cover 매핑 헬퍼 — 비디오 미리보기, 손 좌표, 세그멘테이션 마스크
   전부 이걸로 계산해서 화면에 보이는 것과 정확히 같은 좌표계를 쓰게 한다. ── */
function washupCoverFit(srcW, srcH, dstW, dstH) {
  const scale = Math.max(dstW / srcW, dstH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  return { scale, drawW, drawH, offX: (dstW - drawW) / 2, offY: (dstH - drawH) / 2 };
}

/* ══════════════════ 공통 interactionPointer 개념 ══════════════════
   마우스와 손 추적 둘 다 아래 3개 "grab 대상"(handle/showerball/duck)에 대해
   동일한 begin/update/end 함수만 호출한다 — 소스가 무엇이든 대상 오브젝트
   입장에서는 구분할 필요가 없다. */

/* ── 1) 손잡이 / temperture / 물 세기 ── */
const WASHUP_HANDLE_CENTER = { x: 960, y: 933 }; // 원 중심 상단 — temperture 회전 피벗
const WASHUP_HANDLE_RANGE = 60; // 좌우 최대 드래그 범위(px) → value -1~1
const WASHUP_HANDLE_MAX_ANGLE = 40; // 최대 기울기(deg) — Figma 레퍼런스(214:1607/1869) 레버 기울기 기준
const WASHUP_DEADZONE = 0.08;

let washupHandleDragging = false;
let washupHandleValue = 0; // -1(HOT 끝) ~ 0(OFF) ~ 1(COLD 끝)
let washupState = 'off';
let washupIntensity = 0;

function washupComputeState(value) {
  if (value < -WASHUP_DEADZONE) return 'hot';
  if (value > WASHUP_DEADZONE) return 'cold';
  return 'off';
}
function washupComputeIntensity(value) {
  const abs = Math.min(1, Math.abs(value));
  if (abs <= WASHUP_DEADZONE) return 0;
  return (abs - WASHUP_DEADZONE) / (1 - WASHUP_DEADZONE);
}

function washupSetHandleValue(value) {
  washupHandleValue = Math.max(-1, Math.min(1, value));
  washupHandleLeverEl.style.transform = 'rotate(' + (washupHandleValue * WASHUP_HANDLE_MAX_ANGLE) + 'deg)';
  washupState = washupComputeState(washupHandleValue);
  washupIntensity = washupComputeIntensity(washupHandleValue);
  washupHandleWrapEl.setAttribute('aria-valuenow', washupHandleValue.toFixed(2));
  const stateText = washupState === 'hot' ? 'Hot' : washupState === 'cold' ? 'Cold' : 'Off';
  washupHandleWrapEl.setAttribute('aria-valuetext', stateText);
  washupStatusEl.textContent = stateText;
}

function washupHandleValueFromStageX(stageX) {
  const dx = stageX - WASHUP_HANDLE_CENTER.x;
  return Math.max(-1, Math.min(1, dx / WASHUP_HANDLE_RANGE));
}

function washupOnHandlePointerDown(e) {
  washupHandleDragging = true;
  try { washupHandleWrapEl.setPointerCapture(e.pointerId); } catch (err) {}
  const p = washupToStageCoords(e.clientX, e.clientY);
  washupSetHandleValue(washupHandleValueFromStageX(p.x));
}
function washupOnHandlePointerMove(e) {
  if (!washupHandleDragging) return;
  const p = washupToStageCoords(e.clientX, e.clientY);
  washupSetHandleValue(washupHandleValueFromStageX(p.x));
}
function washupOnHandlePointerUp(e) {
  washupHandleDragging = false;
  if (washupHandleWrapEl.hasPointerCapture && washupHandleWrapEl.hasPointerCapture(e.pointerId)) {
    washupHandleWrapEl.releasePointerCapture(e.pointerId);
  }
}
function washupOnHandleKeyDown(e) {
  const step = 0.05;
  let next = washupHandleValue;
  if (e.key === 'ArrowLeft') next -= step;
  else if (e.key === 'ArrowRight') next += step;
  else if (e.key === 'Home') next = -1;
  else if (e.key === 'End') next = 1;
  else return;
  e.preventDefault();
  washupSetHandleValue(next);
}

/* ── 2) Water particle (샤워헤드에서 낙하) ── */
// shower.svg(588x237) 내부 9개 노즐 중심 x좌표(스테이지 절대좌표로 환산) + 공통 y
const WASHUP_NOZZLE_Y = 236;
const WASHUP_NOZZLE_X = [717, 779, 841, 902, 964, 1025, 1087, 1148, 1210];
const WASHUP_MAX_PARTICLES = 260;
let washupParticles = [];

function washupSpawnParticle() {
  if (washupState === 'off' || washupParticles.length >= WASHUP_MAX_PARTICLES) return;
  const spot = WASHUP_NOZZLE_X[Math.floor(Math.random() * WASHUP_NOZZLE_X.length)];
  const color = washupState === 'cold' ? [63, 169, 232] : [242, 87, 63];
  const speed = 2 + washupIntensity * 7 + Math.random() * 2;
  washupParticles.push({
    x: spot + (Math.random() * 10 - 5),
    y: WASHUP_NOZZLE_Y,
    vx: Math.random() * 0.6 - 0.3 + washupIntensity * (Math.random() * 0.4 - 0.2),
    vy: speed,
    radius: 2.5 + Math.random() * 3 + washupIntensity * 1.5,
    alpha: 0.55 + Math.random() * 0.35,
    color,
  });
}

/* ── 3) Splash particle (물이 몸에 부딪혀 튀는 물방울) ── */
const WASHUP_MAX_SPLASH = 160;
let washupSplashes = [];

function washupSpawnSplash(x, y, color, dirX) {
  if (washupSplashes.length >= WASHUP_MAX_SPLASH) return;
  const count = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 1.2;
    washupSplashes.push({
      x, y,
      vx: dirX * (1 + Math.random() * 2) + spread,
      vy: -(1 + Math.random() * 2),
      radius: 1.2 + Math.random() * 1.8,
      alpha: 0.5 + Math.random() * 0.3,
      color,
    });
  }
}

/* ── Body segmentation collision (MediaPipe ImageSegmenter) ──
   자세한 초기화는 washupInitMediaPipe()에서. 여기서는 마스크가 준비되면
   물 파티클과의 충돌만 처리한다. */
const WASHUP_MASK_SCALE = 0.1; // 1920x1080 대비 1/10 해상도로 충돌 판정 (성능)
let washupMaskCanvas = document.createElement('canvas');
washupMaskCanvas.width = Math.round(1920 * WASHUP_MASK_SCALE);
washupMaskCanvas.height = Math.round(1080 * WASHUP_MASK_SCALE);
let washupMaskCtx = washupMaskCanvas.getContext('2d', { willReadFrequently: true });
let washupMaskData = null; // Uint8ClampedArray, alpha 채널만 사용 (>0 이면 몸)
let washupMaskReady = false;

function washupMaskAt(stageX, stageY) {
  if (!washupMaskReady || !washupMaskData) return false;
  const mx = Math.floor(stageX * WASHUP_MASK_SCALE);
  const my = Math.floor(stageY * WASHUP_MASK_SCALE);
  if (mx < 0 || my < 0 || mx >= washupMaskCanvas.width || my >= washupMaskCanvas.height) return false;
  const idx = (my * washupMaskCanvas.width + mx) * 4 + 3; // alpha channel
  return washupMaskData[idx] > 40;
}

function washupUpdateWaterAndCollisions() {
  const bodyCenterXNorm = 0.5; // 화면 중앙을 몸 중심 기준으로 사용 (스켈레톤 없이 근사)
  for (let i = washupParticles.length - 1; i >= 0; i--) {
    const p = washupParticles[i];
    p.y += washupReducedMotion ? p.vy * 0.3 : p.vy;
    p.x += p.vx;
    p.vy += 0.05;

    if (washupMaskAt(p.x, p.y)) {
      const dirX = p.x < 1920 * bodyCenterXNorm ? -1 : 1;
      washupSpawnSplash(p.x, p.y, p.color, p.y < 500 ? (Math.random() < 0.5 ? -1 : 1) : dirX);
      washupParticles.splice(i, 1);
      continue;
    }
    if (p.y - p.radius > 1080) {
      washupParticles.splice(i, 1);
      continue;
    }
  }

  for (let i = washupSplashes.length - 1; i >= 0; i--) {
    const s = washupSplashes[i];
    s.x += s.vx;
    s.y += s.vy;
    s.vy += 0.15;
    s.vx *= 0.98;
    s.alpha -= 0.012;
    if (s.alpha <= 0 || s.y > 1080) washupSplashes.splice(i, 1);
  }
}

function washupDrawParticles() {
  for (const p of washupParticles) {
    washupCtx.beginPath();
    washupCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    washupCtx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
    washupCtx.fill();
  }
  for (const s of washupSplashes) {
    washupCtx.beginPath();
    washupCtx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    washupCtx.fillStyle = `rgba(${s.color[0]}, ${s.color[1]}, ${s.color[2]}, ${Math.max(0, s.alpha)})`;
    washupCtx.fill();
  }
}

/* ── 4) 샤워볼 — 드래그, 거품 생성, 홈 자석 스냅 ── */
const WASHUP_BALL_HOME = { x: 1624, y: 372 };
const WASHUP_BALL_SNAP_DISTANCE = 90;
let washupBallPos = { ...WASHUP_BALL_HOME };
let washupBallDragging = false;
let washupBallDragOffset = { x: 0, y: 0 };
let washupBallSnapping = false;
let washupBallActive = false;

function washupSetBallPos(x, y) {
  washupBallPos.x = x;
  washupBallPos.y = y;
  washupShowerballEl.style.left = x + 'px';
  washupShowerballEl.style.top = y + 'px';
}

function washupOnBallPointerDown(e) {
  washupBallSnapping = false;
  washupBallDragging = true;
  washupBallActive = true;
  try { washupShowerballEl.setPointerCapture(e.pointerId); } catch (err) {}
  const p = washupToStageCoords(e.clientX, e.clientY);
  washupBallDragOffset.x = washupBallPos.x - p.x;
  washupBallDragOffset.y = washupBallPos.y - p.y;
}
function washupOnBallPointerMove(e) {
  if (!washupBallDragging) return;
  const p = washupToStageCoords(e.clientX, e.clientY);
  washupDragBallTo(p.x + washupBallDragOffset.x, p.y + washupBallDragOffset.y);
}
function washupOnBallPointerUp(e) {
  if (!washupBallDragging) return;
  washupBallDragging = false;
  washupBallActive = false;
  if (washupShowerballEl.hasPointerCapture && e.pointerId != null && washupShowerballEl.hasPointerCapture(e.pointerId)) {
    washupShowerballEl.releasePointerCapture(e.pointerId);
  }
  washupReleaseBall();
}

function washupDragBallTo(x, y) {
  washupSetBallPos(x, y);
  washupSpawnBubble(x + 115, y + 200); // 볼 아랫부분 근처에서 거품이 나오도록
}

function washupReleaseBall() {
  const dx = washupBallPos.x - WASHUP_BALL_HOME.x;
  const dy = washupBallPos.y - WASHUP_BALL_HOME.y;
  if (Math.hypot(dx, dy) < WASHUP_BALL_SNAP_DISTANCE) washupSnapBallHome();
}

function washupEaseOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

/* release → magnetic attraction → slight overshoot → settle */
function washupSnapBallHome() {
  washupBallSnapping = true;
  const start = { ...washupBallPos };
  const overshoot = {
    x: WASHUP_BALL_HOME.x - (start.x - WASHUP_BALL_HOME.x) * 0.08,
    y: WASHUP_BALL_HOME.y - (start.y - WASHUP_BALL_HOME.y) * 0.08,
  };
  const duration = 320;
  const t0 = performance.now();
  function step(now) {
    if (!washupBallSnapping) return;
    const t = Math.min(1, (now - t0) / duration);
    let x, y;
    if (t < 0.65) {
      const k = washupEaseOutCubic(t / 0.65);
      x = start.x + (overshoot.x - start.x) * k;
      y = start.y + (overshoot.y - start.y) * k;
    } else {
      const k = washupEaseOutCubic((t - 0.65) / 0.35);
      x = overshoot.x + (WASHUP_BALL_HOME.x - overshoot.x) * k;
      y = overshoot.y + (WASHUP_BALL_HOME.y - overshoot.y) * k;
    }
    washupSetBallPos(x, y);
    if (t < 1) requestAnimationFrame(step);
    else { washupSetBallPos(WASHUP_BALL_HOME.x, WASHUP_BALL_HOME.y); washupBallSnapping = false; }
  }
  requestAnimationFrame(step);
}

/* ── 5) 거품 — 샤워볼이 지나간 자리에 남고, 물에 닿으면 씻겨 내려감 ── */
const WASHUP_MAX_BUBBLES = 90;
let washupBubbles = [];
const washupBubbleImg = new Image();
washupBubbleImg.src = '../img/bubble.png';

function washupSpawnBubble(x, y) {
  if (washupBubbles.length >= WASHUP_MAX_BUBBLES) return;
  const size = 8 + Math.random() * 22; // small/medium/large가 자연스럽게 섞이도록 연속 랜덤
  washupBubbles.push({
    x: x + (Math.random() * 30 - 15),
    y: y + (Math.random() * 30 - 15),
    radius: size,
    opacity: 0.5 + Math.random() * 0.35,
    rotation: Math.random() * 360,
    vx: Math.random() * 0.4 - 0.2,
    vy: -(Math.random() * 0.3) - 0.05, // 살짝 떠오르는 느낌
    settleDrag: 0.94 + Math.random() * 0.03, // 금방 감속되어 문지른 자리에 남는다
  });
}

function washupUpdateBubbles() {
  for (let i = washupBubbles.length - 1; i >= 0; i--) {
    const b = washupBubbles[i];
    b.x += b.vx;
    b.y += b.vy;
    b.vx *= b.settleDrag;
    b.vy *= b.settleDrag;
    if (b.radius <= 0.5 || b.opacity <= 0.02) washupBubbles.splice(i, 1);
  }
}

/* 물 파티클/스플래시가 근처를 지나가면 거품이 밀리며 작아지다 사라진다 */
function washupWashBubbles() {
  if (washupBubbles.length === 0) return;
  const wetters = washupState === 'off' ? washupSplashes : washupParticles.concat(washupSplashes);
  if (wetters.length === 0) return;
  for (const w of wetters) {
    for (const b of washupBubbles) {
      const dx = b.x - w.x;
      const dy = b.y - w.y;
      if (Math.hypot(dx, dy) < b.radius + (w.radius || 2) + 14) {
        b.radius *= 0.93;
        b.opacity *= 0.9;
        b.y += 0.5;
        b.x += dx * 0.02;
      }
    }
  }
}

function washupDrawBubbles() {
  for (const b of washupBubbles) {
    washupCtx.save();
    washupCtx.globalAlpha = Math.max(0, b.opacity);
    washupCtx.translate(b.x, b.y);
    washupCtx.rotate((b.rotation * Math.PI) / 180);
    if (washupBubbleImg.complete && washupBubbleImg.naturalWidth) {
      washupCtx.drawImage(washupBubbleImg, -b.radius, -b.radius, b.radius * 2, b.radius * 2);
    } else {
      washupCtx.beginPath();
      washupCtx.arc(0, 0, b.radius, 0, Math.PI * 2);
      washupCtx.fillStyle = 'rgba(255,255,255,0.5)';
      washupCtx.fill();
    }
    washupCtx.restore();
  }
}

/* ── 6) 오리 — 한 번 잡으면 floating mode(DVD 스크린세이버) 진입, 계속 떠다님 ── */
const WASHUP_DUCK_HOME = { x: 1631, y: 653 };
const WASHUP_DUCK_SIZE = { w: 215, h: 206 };
let washupDuckPos = { ...WASHUP_DUCK_HOME };
let washupDuckVel = { x: 0, y: 0 };
let washupDuckFloating = false;
let washupDuckBobT = 0;

function washupSetDuckPos(x, y, rotate) {
  washupDuckPos.x = x;
  washupDuckPos.y = y;
  washupDuckEl.style.left = x + 'px';
  washupDuckEl.style.top = y + 'px';
  washupDuckEl.style.transform = 'rotate(' + rotate + 'deg)';
}

function washupOnDuckGrab() {
  if (washupDuckFloating) {
    // 떠다니는 중에 다시 누르면 floating 종료하고 제자리(홈 포지션)로 복귀
    washupDuckFloating = false;
    washupDuckEl.classList.remove('is-floating');
    washupDuckVel.x = 0;
    washupDuckVel.y = 0;
    washupSetDuckPos(WASHUP_DUCK_HOME.x, WASHUP_DUCK_HOME.y, 0);
    return;
  }
  washupDuckFloating = true;
  washupDuckEl.classList.add('is-floating');
  const speed = 2.2;
  const angle = Math.random() * Math.PI * 2;
  washupDuckVel.x = Math.cos(angle) * speed;
  washupDuckVel.y = Math.sin(angle) * speed;
}

function washupUpdateDuck() {
  if (!washupDuckFloating) return;
  const maxX = 1920 - WASHUP_DUCK_SIZE.w;
  const maxY = 1080 - WASHUP_DUCK_SIZE.h;
  let x = washupDuckPos.x + washupDuckVel.x;
  let y = washupDuckPos.y + washupDuckVel.y;
  if (x <= 0 || x >= maxX) { washupDuckVel.x *= -1; x = Math.max(0, Math.min(maxX, x)); }
  if (y <= 0 || y >= maxY) { washupDuckVel.y *= -1; y = Math.max(0, Math.min(maxY, y)); }
  washupDuckBobT += 0.05;
  const wobble = Math.sin(washupDuckBobT) * 3;
  washupSetDuckPos(x, y + wobble, Math.sin(washupDuckBobT * 0.6) * 6);
}

/* ══════════════════ MediaPipe: 손 추적 + 몸 세그멘테이션 ══════════════════
   빌드 도구가 없는 프로젝트라 npm 설치 대신 CDN에서 ESM으로 동적 import한다.
   실패해도(오프라인, 구형 브라우저 등) 마우스 조작과 물/거품/오리는 정상 동작 —
   이 블록 전체를 try/catch로 감싸서 손 추적/충돌만 조용히 비활성화된다. */

let washupHandLandmarker = null;
let washupImageSegmenter = null;
let washupMediaPipeReady = false;

// 손끝 좌표 떨림 완화용 지수이동평균(EMA)
let washupHandSmoothed = null;
const WASHUP_HAND_SMOOTHING = 0.35;

// pinch on/off에 서로 다른 임계값을 둬서(hysteresis) 경계에서 반복 전환되지 않게 함
const WASHUP_PINCH_ON = 0.055;  // 이 값보다 가까워지면 grab 시작
const WASHUP_PINCH_OFF = 0.09;  // 이 값보다 멀어져야 release
let washupPinching = false;
let washupHandDragTarget = null; // 'handle' | 'ball' | 'duck' | null

async function washupInitMediaPipe() {
  let vision;
  try {
    const visionModule = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs'
    );
    vision = await visionModule.FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
    );

    // 손 추적과 세그멘테이션은 서로 독립적으로 초기화한다 — 한쪽 모델을 못 받아와도
    // 다른 쪽(그리고 마우스 조작)은 정상 동작해야 하므로 try/catch를 각각 따로 둔다.
    // GPU 위임(delegate)은 브라우저/그래픽 드라이버에 따라 실패하는 경우가 흔해서,
    // 실패하면 조용히 사라지는 대신 CPU 위임으로 한 번 더 시도한다 — "손 추적이 아예
    // 안 됨"의 가장 흔한 원인이 바로 이 GPU 위임 실패였다.
    try {
      washupHandLandmarker = await visionModule.HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
    } catch (gpuErr) {
      console.warn('[wash-up] 손 추적 GPU 위임 실패 — CPU 위임으로 재시도합니다.', gpuErr);
      try {
        washupHandLandmarker = await visionModule.HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } catch (cpuErr) {
        console.warn('[wash-up] 손 추적 모델 초기화 실패(GPU/CPU 모두) — 마우스 조작만 사용합니다.', cpuErr);
        washupHandLandmarker = null;
      }
    }

    try {
      washupImageSegmenter = await visionModule.ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        outputCategoryMask: false,
        outputConfidenceMasks: true,
      });
    } catch (gpuErr) {
      console.warn('[wash-up] 세그멘테이션 GPU 위임 실패 — CPU 위임으로 재시도합니다.', gpuErr);
      try {
        washupImageSegmenter = await visionModule.ImageSegmenter.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.tflite',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          // confidence mask(사람일 확률, 0~1)를 쓴다 — category mask는 모델/버전에 따라
          // "사람=0"인지 "배경=0"인지가 갈려서, 반대로 해석하면 충돌이 사람이 아니라
          // 배경에서만 일어나는 버그가 생긴다. confidence는 그 모호함이 없다.
          outputCategoryMask: false,
          outputConfidenceMasks: true,
        });
      } catch (cpuErr) {
        console.warn('[wash-up] 몸 세그멘테이션 모델 초기화 실패(GPU/CPU 모두) — 물-몸 충돌 없이 진행합니다.', cpuErr);
        washupImageSegmenter = null;
      }
    }

    washupMediaPipeReady = !!(washupHandLandmarker || washupImageSegmenter);
  } catch (err) {
    console.warn('[wash-up] MediaPipe 로드 실패 — 마우스 조작만 사용합니다.', err);
    washupMediaPipeReady = false;
  }
  washupHandInitDone = true;
  washupRefreshCameraStatusText();
}

// 비디오 정규화 좌표(카메라 원본, 미러 전) → 스테이지(1920x1080) 좌표.
// 화면에 보이는 비디오는 object-fit:cover + scaleX(-1)로 거울 처리되므로,
// 여기서도 좌우를 뒤집어야 실제 손 위치와 화면 오브젝트 위치가 정확히 대응한다.
function washupVideoNormToStage(nx, ny) {
  const vw = washupVideoEl.videoWidth || 1280;
  const vh = washupVideoEl.videoHeight || 720;
  const fit = washupCoverFit(vw, vh, 1920, 1080);
  const mx = 1 - nx; // mirror
  return { x: mx * vw * fit.scale + fit.offX, y: ny * vh * fit.scale + fit.offY };
}

function washupHitTest(stageX, stageY) {
  const ballR = washupBallPos, ballCx = ballR.x + 229 / 2, ballCy = ballR.y + 229 / 2;
  if (Math.hypot(stageX - ballCx, stageY - ballCy) < 140) return 'ball';
  const duckCx = washupDuckPos.x + WASHUP_DUCK_SIZE.w / 2, duckCy = washupDuckPos.y + WASHUP_DUCK_SIZE.h / 2;
  if (!washupDuckFloating && Math.hypot(stageX - duckCx, stageY - duckCy) < 130) return 'duck';
  // 레버가 피벗(WASHUP_HANDLE_CENTER)에서 위로 100px 뻗어 있으므로, 레버 몸통 전체가
  // 손 추적으로도 잡히도록 반경을 원판 중심이 아니라 피벗 기준 150px로 넉넉히 잡는다.
  if (Math.hypot(stageX - WASHUP_HANDLE_CENTER.x, stageY - WASHUP_HANDLE_CENTER.y) < 150) return 'handle';
  return null;
}

let washupLastHandTime = 0;
let washupLastSegTime = 0;
const WASHUP_HAND_INTERVAL = 1000 / 20; // 20fps
const WASHUP_SEG_INTERVAL = 1000 / 12; // 12fps

function washupProcessMediaPipe(now) {
  if (!washupMediaPipeReady || washupVideoEl.readyState < 2) return;

  if (washupHandLandmarker && now - washupLastHandTime >= WASHUP_HAND_INTERVAL) {
    washupLastHandTime = now;
    try {
      const result = washupHandLandmarker.detectForVideo(washupVideoEl, now);
      washupProcessHandResult(result);
    } catch (err) { /* 프레임 하나 실패해도 무시하고 계속 진행 */ }
  }

  if (washupImageSegmenter && now - washupLastSegTime >= WASHUP_SEG_INTERVAL) {
    washupLastSegTime = now;
    try {
      const segResult = washupImageSegmenter.segmentForVideo(washupVideoEl, now);
      washupProcessSegmentationResult(segResult);
    } catch (err) { /* 세그멘테이션 실패 시 이번 프레임은 충돌 판정 없이 진행 */ }
  }
}

function washupProcessHandResult(result) {
  const landmarks = result && result.landmarks && result.landmarks[0];
  if (!landmarks) {
    if (washupPinching) washupEndHandDrag();
    washupHandSmoothed = null;
    return;
  }

  const tip = landmarks[8]; // 검지 끝
  const thumb = landmarks[4]; // 엄지 끝
  const pinchDist = Math.hypot(tip.x - thumb.x, tip.y - thumb.y, (tip.z || 0) - (thumb.z || 0));

  const raw = washupVideoNormToStage(tip.x, tip.y);
  if (!washupHandSmoothed) washupHandSmoothed = { ...raw };
  else {
    washupHandSmoothed.x += (raw.x - washupHandSmoothed.x) * WASHUP_HAND_SMOOTHING;
    washupHandSmoothed.y += (raw.y - washupHandSmoothed.y) * WASHUP_HAND_SMOOTHING;
  }
  const p = washupHandSmoothed;

  if (!washupPinching && pinchDist < WASHUP_PINCH_ON) {
    washupPinching = true;
    washupHandDragTarget = washupHitTest(p.x, p.y);
    washupBeginHandDrag(p.x, p.y);
  } else if (washupPinching && pinchDist > WASHUP_PINCH_OFF) {
    washupEndHandDrag();
  } else if (washupPinching) {
    washupUpdateHandDrag(p.x, p.y);
  }
}

function washupBeginHandDrag(x, y) {
  if (washupHandDragTarget === 'handle') {
    washupHandleDragging = true;
    washupSetHandleValue(washupHandleValueFromStageX(x));
  } else if (washupHandDragTarget === 'ball') {
    washupBallDragging = true;
    washupBallActive = true;
    washupBallSnapping = false;
    washupBallDragOffset.x = washupBallPos.x - x;
    washupBallDragOffset.y = washupBallPos.y - y;
  } else if (washupHandDragTarget === 'duck') {
    washupOnDuckGrab();
    washupHandDragTarget = null; // 오리는 잡는 순간 바로 floating으로 넘어가므로 더 드래그하지 않음
  }
}
function washupUpdateHandDrag(x, y) {
  if (washupHandDragTarget === 'handle') {
    washupSetHandleValue(washupHandleValueFromStageX(x));
  } else if (washupHandDragTarget === 'ball') {
    washupDragBallTo(x + washupBallDragOffset.x, y + washupBallDragOffset.y);
  }
}
function washupEndHandDrag() {
  washupPinching = false;
  if (washupHandDragTarget === 'handle') {
    washupHandleDragging = false;
  } else if (washupHandDragTarget === 'ball') {
    washupBallDragging = false;
    washupBallActive = false;
    washupReleaseBall();
  }
  washupHandDragTarget = null;
}

function washupProcessSegmentationResult(segResult) {
  const mask = segResult && segResult.confidenceMasks && segResult.confidenceMasks[0];
  if (!mask) return;
  try {
    const maskData = mask.getAsFloat32Array ? mask.getAsFloat32Array() : null;
    const mw = mask.width, mh = mask.height;
    if (!maskData || !mw || !mh) return;

    // 마스크(카메라 원본 좌표, 사람일 확률 0~1)를 미러+cover-fit으로 다운스케일
    // 캔버스에 그린다. 화면에 보이는 비디오와 동일한 변환을 거쳐야 충돌 좌표가
    // 어긋나지 않는다.
    const tmp = document.createElement('canvas');
    tmp.width = mw;
    tmp.height = mh;
    const tmpCtx = tmp.getContext('2d');
    const imgData = tmpCtx.createImageData(mw, mh);
    for (let i = 0; i < mw * mh; i++) {
      const isPerson = maskData[i] > 0.5;
      imgData.data[i * 4 + 3] = isPerson ? 255 : 0;
    }
    tmpCtx.putImageData(imgData, 0, 0);

    const fit = washupCoverFit(mw, mh, washupMaskCanvas.width, washupMaskCanvas.height);
    washupMaskCtx.save();
    washupMaskCtx.clearRect(0, 0, washupMaskCanvas.width, washupMaskCanvas.height);
    washupMaskCtx.translate(washupMaskCanvas.width, 0);
    washupMaskCtx.scale(-1, 1); // mirror
    washupMaskCtx.drawImage(tmp, fit.offX, fit.offY, fit.drawW, fit.drawH);
    washupMaskCtx.restore();

    washupMaskData = washupMaskCtx.getImageData(0, 0, washupMaskCanvas.width, washupMaskCanvas.height).data;
    washupMaskReady = true;
    if (mask.close) mask.close();
  } catch (err) {
    // 마스크 처리 실패 시 이번 프레임은 충돌 판정 없이 넘어감
  }
}

/* 검지 끝에 흰색 스트로크 원을 그려서 손 추적이 실제로 잡히고 있는지 눈으로 바로
   확인할 수 있게 한다 — washupHandSmoothed는 손이 안 보이면 null이 되므로 그때는
   그리지 않는다. 핀치(grab) 중에는 안쪽에 작은 채움 원을 더해 grab 상태도 표시. */
function washupDrawHandCursor() {
  if (!washupHandSmoothed) return;
  const { x, y } = washupHandSmoothed;
  washupCtx.save();
  washupCtx.beginPath();
  washupCtx.arc(x, y, 16, 0, Math.PI * 2);
  washupCtx.lineWidth = 2.5;
  washupCtx.strokeStyle = 'rgba(255,255,255,0.95)';
  washupCtx.shadowColor = 'rgba(0,0,0,0.5)';
  washupCtx.shadowBlur = 4;
  washupCtx.stroke();
  if (washupPinching) {
    washupCtx.shadowBlur = 0;
    washupCtx.beginPath();
    washupCtx.arc(x, y, 6, 0, Math.PI * 2);
    washupCtx.fillStyle = 'rgba(255,255,255,0.95)';
    washupCtx.fill();
  }
  washupCtx.restore();
}

/* ══════════════════ 메인 루프 ══════════════════ */
function washupAnimate() {
  requestAnimationFrame(washupAnimate);
  const now = performance.now();

  washupProcessMediaPipe(now);

  if (!washupCtx) return;
  washupCtx.clearRect(0, 0, 1920, 1080);

  if (washupState !== 'off' && !document.hidden) {
    const spawnCount = washupReducedMotion ? (washupIntensity > 0 ? 1 : 0) : Math.round(1 + washupIntensity * 4);
    for (let i = 0; i < spawnCount; i++) washupSpawnParticle();
  }

  washupUpdateWaterAndCollisions();
  washupUpdateBubbles();
  washupWashBubbles();
  washupDrawParticles();
  washupDrawBubbles();
  washupDrawHandCursor();
  washupUpdateDuck();
}

washupInit();
window.addEventListener('pagehide', () => {
  washupStopCamera();
  if (washupHandLandmarker && washupHandLandmarker.close) washupHandLandmarker.close();
  if (washupImageSegmenter && washupImageSegmenter.close) washupImageSegmenter.close();
});
