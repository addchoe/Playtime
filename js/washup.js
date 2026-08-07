/* ── GNB SCALE (main.html과 공통) ── */
let uiScale = 1;
function fitViewport() {
  uiScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('viewport-scale').style.transform = 'scale(' + uiScale + ')';
}
fitViewport();
window.addEventListener('resize', fitViewport);

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

/* ── WASH UP ── */
const washupVideoEl = document.getElementById('washup-video');
const washupCanvasEl = document.getElementById('washup-canvas');
const washupCtx = washupCanvasEl.getContext('2d');
const washupHandleEl = document.getElementById('washup-handle');
const washupPermissionEl = document.getElementById('washup-permission');
const washupPermissionTextEl = document.getElementById('washup-permission-text');
const washupCameraStatusEl = document.getElementById('washup-camera-status');
const washupCameraStatusTextEl = document.getElementById('washup-camera-status-text');
const washupStatusEl = document.getElementById('washup-state-status');
const washupLabelCold = document.getElementById('washup-label-cold');
const washupLabelHot = document.getElementById('washup-label-hot');

let washupStream = null;
let washupAngle = 0;
let washupState = 'off';
let washupIntensity = 0;
let washupDragging = false;
let washupRafId = null;
let washupParticles = [];
let washupNozzlePositions = [];
const WASHUP_MAX_PARTICLES = 260;
const washupReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function washupInit() {
  washupHandleEl.addEventListener('pointerdown', washupOnPointerDown);
  washupHandleEl.addEventListener('pointermove', washupOnPointerMove);
  washupHandleEl.addEventListener('pointerup', washupOnPointerUp);
  washupHandleEl.addEventListener('pointercancel', washupOnPointerUp);
  washupHandleEl.addEventListener('keydown', washupOnKeyDown);
  window.addEventListener('resize', washupResizeCanvas);

  washupSetAngle(0);
  washupResizeCanvas();
  requestWashUpCamera();
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
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    washupStream = stream;
    washupVideoEl.srcObject = stream;
    await washupVideoEl.play().catch(() => {});
    washupSetCameraStatus('active', '카메라 연결됨');
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

function washupStopCamera() {
  if (washupStream) {
    washupStream.getTracks().forEach(t => t.stop());
    washupStream = null;
  }
  if (washupVideoEl) washupVideoEl.srcObject = null;
}

function washupComputeState(angle) {
  if (angle < -8) return 'cold';
  if (angle > 8) return 'hot';
  return 'off';
}

function washupComputeIntensity(angle) {
  const abs = Math.min(60, Math.abs(angle));
  if (abs <= 8) return 0;
  return (abs - 8) / (60 - 8);
}

function washupSetAngle(angle) {
  washupAngle = Math.max(-60, Math.min(60, angle));
  washupHandleEl.style.transform = `rotate(${washupAngle}deg)`;
  washupState = washupComputeState(washupAngle);
  washupIntensity = washupComputeIntensity(washupAngle);
  washupHandleEl.dataset.state = washupState;
  washupHandleEl.setAttribute('aria-valuenow', Math.round(washupAngle));
  const stateText = washupState === 'cold' ? 'Cold' : washupState === 'hot' ? 'Hot' : 'Off';
  washupHandleEl.setAttribute('aria-valuetext', stateText);
  washupStatusEl.textContent = stateText;
  washupLabelCold.classList.toggle('is-active', washupState === 'cold');
  washupLabelHot.classList.toggle('is-active', washupState === 'hot');
}

function washupAngleFromPointer(clientX, clientY) {
  const rect = washupHandleEl.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const deg = Math.atan2(dx, -dy) * 180 / Math.PI;
  return Math.max(-60, Math.min(60, deg));
}

function washupOnPointerDown(e) {
  washupDragging = true;
  washupHandleEl.setPointerCapture(e.pointerId);
  washupSetAngle(washupAngleFromPointer(e.clientX, e.clientY));
}

function washupOnPointerMove(e) {
  if (!washupDragging) return;
  washupSetAngle(washupAngleFromPointer(e.clientX, e.clientY));
}

function washupOnPointerUp(e) {
  washupDragging = false;
  if (washupHandleEl.hasPointerCapture(e.pointerId)) {
    washupHandleEl.releasePointerCapture(e.pointerId);
  }
}

function washupOnKeyDown(e) {
  const step = 5;
  let next = washupAngle;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next -= step;
  else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next += step;
  else if (e.key === 'Home') next = -60;
  else if (e.key === 'End') next = 60;
  else return;
  e.preventDefault();
  washupSetAngle(next);
}

function washupResizeCanvas() {
  if (!washupCanvasEl) return;
  const dpr = window.devicePixelRatio || 1;
  const rect = washupCanvasEl.getBoundingClientRect();
  washupCanvasEl.width = rect.width * dpr;
  washupCanvasEl.height = rect.height * dpr;
  washupCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  washupUpdateNozzlePositions();
}

function washupUpdateNozzlePositions() {
  const stageRect = washupCanvasEl.getBoundingClientRect();
  washupNozzlePositions = Array.from(document.querySelectorAll('.washup-nozzle')).map((el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2 - stageRect.left, y: r.bottom - stageRect.top };
  });
}

function washupSpawnParticle() {
  if (washupNozzlePositions.length === 0 || washupParticles.length >= WASHUP_MAX_PARTICLES) return;
  const spot = washupNozzlePositions[Math.floor(Math.random() * washupNozzlePositions.length)];
  const color = washupState === 'cold' ? [63, 169, 232] : [242, 87, 63];
  const speed = 2 + washupIntensity * 6 + Math.random() * 2;
  washupParticles.push({
    x: spot.x + (Math.random() * 10 - 5),
    y: spot.y,
    vx: Math.random() * 0.6 - 0.3,
    vy: speed,
    radius: 2.5 + Math.random() * 3 + washupIntensity * 1.5,
    alpha: 0.55 + Math.random() * 0.35,
    color,
  });
}

function washupAnimate() {
  washupRafId = requestAnimationFrame(washupAnimate);
  if (!washupCtx) return;
  const rect = washupCanvasEl.getBoundingClientRect();
  washupCtx.clearRect(0, 0, rect.width, rect.height);

  if (washupState !== 'off' && !document.hidden) {
    const spawnCount = washupReducedMotion
      ? (washupIntensity > 0 ? 1 : 0)
      : Math.round(1 + washupIntensity * 4);
    for (let i = 0; i < spawnCount; i++) washupSpawnParticle();
  }

  for (let i = washupParticles.length - 1; i >= 0; i--) {
    const p = washupParticles[i];
    p.y += washupReducedMotion ? p.vy * 0.3 : p.vy;
    p.x += p.vx;
    p.vy += 0.04;
    if (p.y - p.radius > rect.height) {
      washupParticles.splice(i, 1);
      continue;
    }
    washupCtx.beginPath();
    washupCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    washupCtx.fillStyle = `rgba(${p.color[0]}, ${p.color[1]}, ${p.color[2]}, ${p.alpha})`;
    washupCtx.fill();
  }
}

washupInit();
window.addEventListener('pagehide', washupStopCamera);
