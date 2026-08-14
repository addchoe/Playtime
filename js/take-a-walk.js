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
window.addEventListener('resize', fitViewport);

/* ── NAV (공통) ── */
function walkFormatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
function updateTime() {
  document.getElementById('nav-time').textContent = walkFormatTime(new Date());
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

/* ── 화면 전환 (준비중 ↔ 게임) ── */
function walkShowScreen(id) {
  document.querySelectorAll('.walk-screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ── 마무리 오버레이 (게임 화면 위에 블러로 표시) ── */
function walkShowEndOverlay(id) {
  document.querySelectorAll('.walk-end-overlay').forEach(el => el.classList.remove('show'));
  document.getElementById(id).classList.add('show');
}
function walkHideEndOverlays() {
  document.querySelectorAll('.walk-end-overlay').forEach(el => el.classList.remove('show'));
}

/* ── 로딩 점 애니메이션: 1개 → 3개 순차 반복 ── */
const WALK_LOADING_DOT_INTERVAL = 450;
let walkLoadingDotsTimer = null;
function startLoadingDots() {
  const el = document.getElementById('walk-loading-dots');
  let n = 1;
  el.textContent = '.'.repeat(n);
  walkLoadingDotsTimer = setInterval(() => {
    n = (n % 3) + 1;
    el.textContent = '.'.repeat(n);
  }, WALK_LOADING_DOT_INTERVAL);
}
function stopLoadingDots() {
  if (walkLoadingDotsTimer) clearInterval(walkLoadingDotsTimer);
  walkLoadingDotsTimer = null;
}

/* ── 준비중 → 게임 진입 ── */
const WALK_LOADING_DURATION = 2600;
let walkLoadingTimeout = null;

function walkBeginLoading() {
  clearTimeout(walkLoadingTimeout);
  stopLoadingDots();
  walkShowScreen('walk-screen-loading');
  startLoadingDots();
  walkLoadingTimeout = setTimeout(() => {
    stopLoadingDots();
    resetWalkGame();
    walkShowScreen('walk-screen-game');
  }, WALK_LOADING_DURATION);
}

/* ── TAKE A WALK — MAZE GAME ── */
const WALK = { cols: 16, rows: 7, cellSize: 95, entranceRow: 1, exitRow: 5, threshold: 15 };
const walkState = { segments: [], active: false, over: false, lastPaw: null, pawSide: 1 };

function generateMazeGrid(cols, rows) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) row.push({ top: true, right: true, bottom: true, left: true, visited: false });
    cells.push(row);
  }
  const dirs = [
    { dc: 0, dr: -1, self: 'top', opp: 'bottom' },
    { dc: 1, dr: 0, self: 'right', opp: 'left' },
    { dc: 0, dr: 1, self: 'bottom', opp: 'top' },
    { dc: -1, dr: 0, self: 'left', opp: 'right' },
  ];
  const stack = [{ c: 0, r: 0 }];
  cells[0][0].visited = true;
  while (stack.length) {
    const { c, r } = stack[stack.length - 1];
    const neighbors = [];
    for (const d of dirs) {
      const nc = c + d.dc, nr = r + d.dr;
      if (nc >= 0 && nc < cols && nr >= 0 && nr < rows && !cells[nr][nc].visited) neighbors.push({ nc, nr, d });
    }
    if (!neighbors.length) { stack.pop(); continue; }
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    cells[r][c][pick.d.self] = false;
    cells[pick.nr][pick.nc][pick.d.opp] = false;
    cells[pick.nr][pick.nc].visited = true;
    stack.push({ c: pick.nc, r: pick.nr });
  }
  return cells;
}

function buildMaze() {
  const { cols, rows, cellSize, entranceRow, exitRow } = WALK;
  const grid = generateMazeGrid(cols, rows);
  const segments = [];
  const canvas = document.getElementById('maze-canvas');
  const width = cols * cellSize, height = rows * cellSize;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;
  ctx.lineCap = 'square';

  function line(x1, y1, x2, y2) {
    segments.push({ x1, y1, x2, y2 });
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = grid[r][c];
      const x = c * cellSize, y = r * cellSize;
      if (cell.top) line(x, y, x + cellSize, y);
      if (cell.left && !(c === 0 && r === entranceRow)) line(x, y, x, y + cellSize);
      if (c === cols - 1 && cell.right && r !== exitRow) line(x + cellSize, y, x + cellSize, y + cellSize);
      if (r === rows - 1 && cell.bottom) line(x, y + cellSize, x + cellSize, y + cellSize);
    }
  }

  /* invisible guard rails so players can't sneak around the top/bottom of the whole stage */
  segments.push({ x1: -300, y1: 0, x2: width + 300, y2: 0 });
  segments.push({ x1: -300, y1: height, x2: width + 300, y2: height });

  document.getElementById('walk-start').style.top = (entranceRow * cellSize + cellSize / 2) + 'px';
  document.getElementById('walk-end-marker').style.top = (exitRow * cellSize + cellSize / 2) + 'px';

  return segments;
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  let t = lenSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function isColliding(mx, my) {
  for (const s of walkState.segments) {
    if (distToSegment(mx, my, s.x1, s.y1, s.x2, s.y2) < WALK.threshold) return true;
  }
  return false;
}

function spawnPaw(x, y, angleDeg) {
  const el = document.createElement('div');
  el.className = 'paw';
  walkState.pawSide *= -1;
  const rad = angleDeg * Math.PI / 180;
  const perpRad = (angleDeg + 90) * Math.PI / 180;
  const forward = 10; // lead the footprint slightly ahead of the cursor, in the direction of travel
  const side = 6 * walkState.pawSide;
  const ox = x + Math.cos(rad) * forward + Math.cos(perpRad) * side;
  const oy = y + Math.sin(rad) * forward + Math.sin(perpRad) * side;
  el.style.left = ox + 'px';
  el.style.top = oy + 'px';
  /* the paw artwork's toes naturally point ~20deg above the pad-to-toe
     axis at rest, so add that offset to align the toes with travel direction */
  el.style.transform = 'rotate(' + (angleDeg + 20) + 'deg)';
  el.innerHTML = '<img src="../img/paw-icon.svg" alt="" />';
  document.getElementById('walk-footprints').appendChild(el);
  setTimeout(() => el.remove(), 5000);
}

function handleWalkMove(e) {
  if (!walkState.active || walkState.over) return;
  const canvas = document.getElementById('maze-canvas');
  const rect = canvas.getBoundingClientRect();
  /* rect is in post-transform screen space, but the canvas' own pixel
     buffer (and everything else in .viewport-scale) is laid out in the
     untransformed 1920×1080 design space — divide by uiScale to match */
  const mx = (e.clientX - rect.left) / uiScale;
  const my = (e.clientY - rect.top) / uiScale;

  const exitTop = WALK.exitRow * WALK.cellSize;
  const exitBottom = exitTop + WALK.cellSize;
  if (mx > canvas.width && my > exitTop && my < exitBottom) {
    winWalkGame();
    return;
  }

  /* interpolate between the last sampled point and this one so fast
     mouse movement can't skip through a wall between two mousemove events */
  const prev = walkState.lastPos || { x: mx, y: my };
  const dist = Math.hypot(mx - prev.x, my - prev.y);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i <= steps; i++) {
    const px = prev.x + ((mx - prev.x) * i) / steps;
    const py = prev.y + ((my - prev.y) * i) / steps;
    if (isColliding(px, py)) {
      gameOverWalk();
      return;
    }
  }
  walkState.lastPos = { x: mx, y: my };

  if (!walkState.lastPaw || Math.hypot(mx - walkState.lastPaw.x, my - walkState.lastPaw.y) > 22) {
    let angle = 0;
    if (walkState.lastPaw) angle = Math.atan2(my - walkState.lastPaw.y, mx - walkState.lastPaw.x) * 180 / Math.PI;
    spawnPaw(mx, my, angle);
    walkState.lastPaw = { x: mx, y: my };
  }
}

function startWalkGame() {
  walkState.active = true;
  walkState.over = false;
  walkState.lastPaw = null;
  walkState.lastPos = null;
  document.getElementById('walk-start').classList.add('hidden');
  document.querySelector('.walk-hint').classList.add('hidden');
}

function gameOverWalk() {
  walkState.active = false;
  walkState.over = true;
  walkShowEndOverlay('walk-overlay-gameover');
}

function winWalkGame() {
  walkState.active = false;
  walkState.over = true;
  walkShowEndOverlay('walk-overlay-success');
}

function resetWalkGame() {
  walkState.segments = buildMaze();
  walkState.active = false;
  walkState.over = false;
  walkState.lastPaw = null;
  walkState.lastPos = null;
  document.getElementById('walk-start').classList.remove('hidden');
  document.getElementById('walk-footprints').innerHTML = '';
  document.querySelector('.walk-hint').classList.remove('hidden');
}

/* ── END 컴포넌트 (마무리 화면 버튼) — 재시작은 로딩 없이 바로 게임으로 ── */
function walkPlayAgain() {
  walkHideEndOverlays();
  resetWalkGame();
}

document.getElementById('walk-start-btn').addEventListener('click', startWalkGame);
document.getElementById('maze-wrap').addEventListener('mousemove', handleWalkMove);
document.querySelectorAll('[data-walk-play-again]').forEach(btn => btn.addEventListener('click', walkPlayAgain));

walkBeginLoading();
