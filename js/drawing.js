/* ── GNB SCALE (index.html과 공통) ── */
let uiScale = 1;
function fitViewport() {
  uiScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('viewport-scale').style.transform = 'scale(' + uiScale + ')';

  /* nav-overlay는 .viewport-scale 안에 중첩되어 함께 스케일되므로, 스케일 후에도
     실제 창 전체를 덮도록 축소분을 상쇄하는 크기로 역산해서 채워준다. */
  const overlay = document.getElementById('nav-overlay');
  const overscan = 4 / uiScale; // 라운딩 오차로 양옆/위아래에 여백이 생기지 않도록 실제 화면 기준 여유분을 더해준다
  const w = window.innerWidth / uiScale + overscan;
  const h = window.innerHeight / uiScale + overscan;
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';
  overlay.style.left = ((1920 - w) / 2) + 'px';
  overlay.style.top = ((1080 - h) / 2) + 'px';
}
fitViewport();
/* 매우 큰 해상도(4K 등)에서 페이지가 곧바로 로드되면 transform 계산은 정확해도
   브라우저 첫 페인트가 이를 놓쳐 콘텐츠가 좌상단에 눌린 채로 그려지는 경우가 있다
   — 다음 프레임에 한 번 더 재적용해서 그 스테일 페인트를 강제로 복구한다. */
requestAnimationFrame(fitViewport);
window.addEventListener('resize', fitViewport);

/* ── NAV (공통) ── */
function drawingFormatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
function updateTime() {
  document.getElementById('nav-time').textContent = drawingFormatTime(new Date());
}
updateTime();
setInterval(updateTime, 1000);

let isOpen = false;
function toggleNav() { isOpen ? closeNav() : openNav(); }
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

/* ── 화면 전환 ── */
function drawingShowScreen(id) {
  document.querySelectorAll('.drawing-screen').forEach((s) => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function drawingShowEndOverlay() {
  document.getElementById('drawing-end-overlay').classList.add('show');
}
function drawingHideEndOverlay() {
  document.getElementById('drawing-end-overlay').classList.remove('show');
}

/* ── 로딩 점 애니메이션: 1개 → 4개 순차 반복 ── */
const LOADING_DOT_INTERVAL = 420;
let loadingDotsTimer = null;
function startLoadingDots() {
  const el = document.getElementById('drawing-loading-dots');
  let n = 1;
  el.textContent = '.'.repeat(n);
  loadingDotsTimer = setInterval(() => {
    n = (n % 4) + 1;
    el.textContent = '.'.repeat(n);
  }, LOADING_DOT_INTERVAL);
}
function stopLoadingDots() {
  if (loadingDotsTimer) clearInterval(loadingDotsTimer);
  loadingDotsTimer = null;
}

/* ── 실행 대기화면 → 게임 진입 (총 5초 고정) ── */
const LOADING_DURATION = 5000;
function drawingBeginLoading() {
  drawingShowScreen('drawing-screen-loading');
  startLoadingDots();
  setTimeout(() => {
    stopLoadingDots();
    startNewRound();
    drawingShowScreen('drawing-screen-game');
  }, LOADING_DURATION);
}

/* ── 게임 상태 ── */
const HIT_RADIUS = 46;
const CURSOR_EASE = 0.35;

const drawState = {
  stage: null,
  targets: [],      // 연결해야 할 지점 순서 (닫힌 도형이면 마지막에 시작점이 다시 포함됨)
  dotEls: [],
  nextIndex: 0,      // 다음에 연결해야 하는 targets 인덱스
  started: false,
  finished: false,
  cursorTarget: null,  // 트래킹이 보고하는 원시 좌표 {x,y}
  cursorSmooth: null,  // 관성 보간된 좌표 {x,y}
  cursorPresent: false,
};

const dotsLayer = () => document.getElementById('drawing-dots');
const guidePathEl = () => document.getElementById('drawing-guide-path');
const drawnPathEl = () => document.getElementById('drawing-drawn-path');
const liveLineEl = () => document.getElementById('drawing-live-line');
const cursorEl = () => document.getElementById('drawing-cursor');
const hintEl = () => document.getElementById('drawing-hint');

function dotIndexForTarget(targetIndex) {
  const len = drawState.stage.points.length;
  if (targetIndex >= len) return drawState.stage.closeToIndex;
  return targetIndex;
}

function buildGuidePathD(points, closeToIndex) {
  if (!points.length) return '';
  let d = 'M ' + points[0].x + ' ' + points[0].y;
  for (let i = 1; i < points.length; i++) d += ' L ' + points[i].x + ' ' + points[i].y;
  if (closeToIndex != null) d += ' L ' + points[closeToIndex].x + ' ' + points[closeToIndex].y;
  return d;
}

function startNewRound() {
  const stage = pickRandomStage();
  drawState.stage = stage;
  drawState.targets = stage.closeToIndex != null
    ? [...stage.points, stage.points[stage.closeToIndex]]
    : stage.points;
  drawState.nextIndex = 0;
  drawState.started = false;
  drawState.finished = false;

  guidePathEl().setAttribute('d', buildGuidePathD(stage.points, stage.closeToIndex));
  drawnPathEl().setAttribute('d', '');
  drawnPathEl().classList.remove('flash');
  liveLineEl().classList.remove('visible');

  const layer = dotsLayer();
  layer.innerHTML = '';
  drawState.dotEls = stage.points.map((p, i) => {
    const el = document.createElement('div');
    el.className = 'drawing-dot' + (i === 0 ? ' is-first' : '');
    el.style.left = p.x + 'px';
    el.style.top = p.y + 'px';
    layer.appendChild(el);
    return el;
  });

  hintEl().textContent = '첫 번째 점에 손가락을 가져다 대보세요';
  hintEl().classList.remove('hidden');
}

function advanceToNextTarget() {
  const target = drawState.targets[drawState.nextIndex];
  const dotEl = drawState.dotEls[dotIndexForTarget(drawState.nextIndex)];

  if (!drawState.started) {
    drawState.started = true;
    hintEl().classList.add('hidden');
    dotEl.classList.remove('is-first');
    dotEl.classList.add('is-active');
    drawnPathEl().setAttribute('d', 'M ' + target.x + ' ' + target.y);
  } else {
    const prevDotEl = drawState.dotEls[dotIndexForTarget(drawState.nextIndex - 1)];
    prevDotEl.classList.remove('is-active');
    prevDotEl.classList.add('is-done');
    const d = drawnPathEl().getAttribute('d') || '';
    drawnPathEl().setAttribute('d', d + ' L ' + target.x + ' ' + target.y);

    const isFinalTarget = drawState.nextIndex === drawState.targets.length - 1;
    if (isFinalTarget) {
      dotEl.classList.add('is-done');
    } else {
      dotEl.classList.add('is-active');
    }
  }

  drawState.nextIndex++;

  if (drawState.nextIndex >= drawState.targets.length) {
    finishRound();
  }
}

function finishRound() {
  drawState.finished = true;
  liveLineEl().classList.remove('visible');
  drawnPathEl().classList.add('flash');
  drawState.dotEls.forEach((el) => el.classList.add('is-success'));

  setTimeout(() => {
    drawingShowEndOverlay();
  }, 1000);
}

function drawingPlayAgain() {
  drawingHideEndOverlay();
  startNewRound();
}

/* ── 커서(손끝) 트래킹 루프 ── */
function setCursorTarget(x, y, present) {
  drawState.cursorTarget = present ? { x, y } : drawState.cursorTarget;
  drawState.cursorPresent = present;
}

function cursorLoop() {
  const cEl = cursorEl();

  if (drawState.cursorTarget) {
    if (!drawState.cursorSmooth) drawState.cursorSmooth = { ...drawState.cursorTarget };
    drawState.cursorSmooth.x += (drawState.cursorTarget.x - drawState.cursorSmooth.x) * CURSOR_EASE;
    drawState.cursorSmooth.y += (drawState.cursorTarget.y - drawState.cursorSmooth.y) * CURSOR_EASE;

    cEl.style.transform = 'translate(' + drawState.cursorSmooth.x + 'px, ' + drawState.cursorSmooth.y + 'px)';
    cEl.classList.toggle('visible', drawState.cursorPresent);

    const gameActive = document.getElementById('drawing-screen-game').classList.contains('active')
      && !document.getElementById('drawing-end-overlay').classList.contains('show');

    if (gameActive && !drawState.finished && drawState.stage) {
      const target = drawState.targets[drawState.nextIndex];
      if (target) {
        const dist = Math.hypot(drawState.cursorSmooth.x - target.x, drawState.cursorSmooth.y - target.y);
        const touching = dist < HIT_RADIUS;
        cEl.classList.toggle('is-touching', touching);
        if (touching) advanceToNextTarget();
      }

      if (drawState.started && !drawState.finished) {
        const from = drawState.targets[drawState.nextIndex - 1];
        liveLineEl().setAttribute('x1', from.x);
        liveLineEl().setAttribute('y1', from.y);
        liveLineEl().setAttribute('x2', drawState.cursorSmooth.x);
        liveLineEl().setAttribute('y2', drawState.cursorSmooth.y);
        liveLineEl().classList.add('visible');
      }
    }
  }

  requestAnimationFrame(cursorLoop);
}
requestAnimationFrame(cursorLoop);

/* ── 마우스 폴백 (카메라 미허용 시에도 플레이 가능하도록) ── */
document.getElementById('viewport-scale').addEventListener('mousemove', (e) => {
  const rect = document.getElementById('viewport-scale').getBoundingClientRect();
  const mx = (e.clientX - rect.left) / uiScale;
  const my = (e.clientY - rect.top) / uiScale;
  setCursorTarget(mx, my, true);
});

/* ── 웹캠 손가락 추적 연결 ── */
function drawingSetCameraStatus(text) {
  const el = document.getElementById('drawing-camera-status');
  if (el) el.textContent = text;
}

function initHandTracking() {
  const bg = document.getElementById('drawing-camera-bg');
  const video = document.getElementById('drawing-video');

  DrawingHandTracking.init({
    videoEl: video,
    onFrame: (nx, ny, present) => {
      if (present) setCursorTarget(nx * 1920, ny * 1080, true);
      else drawState.cursorPresent = false;
    },
    onStatusChange: (status) => {
      if (status === 'requesting') {
        bg.classList.add('visible');
        drawingSetCameraStatus('카메라 연결 중…');
      } else if (status === 'loading-model') {
        drawingSetCameraStatus('손 인식 준비 중…');
      } else if (status === 'active') {
        bg.classList.add('streaming');
        drawingSetCameraStatus('손가락 인식됨');
      } else if (status === 'no-hand') {
        drawingSetCameraStatus('손이 보이지 않아요');
      } else if (status === 'error') {
        bg.classList.remove('visible', 'streaming');
        drawingSetCameraStatus('마우스로 플레이해보세요');
      }
    },
  });
}

/* ── 이벤트 연결 ── */
document.querySelectorAll('[data-drawing-play-again]').forEach((btn) => btn.addEventListener('click', drawingPlayAgain));

drawingBeginLoading();
initHandTracking();
