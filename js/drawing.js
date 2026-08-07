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
