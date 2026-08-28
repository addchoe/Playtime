/* ── NAV (공통) ── */
function ltFormatTime(date) {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return h + ':' + m + ' ' + ampm;
}
function updateTime() {
  document.getElementById('nav-time').textContent = ltFormatTime(new Date());
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

/* ── 1920x1080 고정 디자인 캔버스를 화면에 맞춰 스케일 (index.html의 .viewport-scale과 동일 방식) ── */
function ltFitViewport() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('lt-viewport-scale').style.transform = 'scale(' + scale + ')';

  /* nav-overlay는 lt-viewport-scale 안에 중첩되어 함께 스케일되므로, 스케일 후에도
     실제 창 전체를 덮도록 축소분을 상쇄하는 크기로 역산해서 채워준다. */
  const overlay = document.getElementById('nav-overlay');
  const overscan = 4 / scale;
  const w = window.innerWidth / scale + overscan;
  const h = window.innerHeight / scale + overscan;
  overlay.style.width = w + 'px';
  overlay.style.height = h + 'px';
  overlay.style.left = ((1920 - w) / 2) + 'px';
  overlay.style.top = ((1080 - h) / 2) + 'px';
}
ltFitViewport();
/* 매우 큰 해상도(4K 등)에서 페이지가 곧바로 로드되면 transform 계산은 정확해도
   브라우저 첫 페인트가 이를 놓쳐 콘텐츠가 좌상단에 눌린 채로 그려지는 경우가 있다
   — 다음 프레임에 한 번 더 재적용해서 그 스테일 페인트를 강제로 복구한다. */
requestAnimationFrame(ltFitViewport);
window.addEventListener('resize', ltFitViewport);
