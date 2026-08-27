// Controller for pages/admin-feedback.html — "Time Archive".
//
// Route: /pages/admin-feedback.html
//
// The gallery itself is public: anyone can view non-hidden drawings with
// no login. Clicking Setting opens a centered password prompt
// (js/services/adminAuth.js — currently a password stub, see its TODO for
// wiring up real auth). Once unlocked, hidden entries also become visible
// and each card gets delete/hide/reorder controls backed by
// js/services/feedbackService.js.

let isAdminMode = false;

/* 다른 페이지들의 fitViewport()와 완전히 동일한 공식 — 로고/Setting
   버튼을 담은 #archive-nav-canvas(다른 페이지의 .viewport-scale에
   대응)를 스케일한다. --ui-scale은 아래 갤러리의 좌우 여백을 로고
   위치와 맞추는 데도 재사용된다(admin-feedback.css 참고). */
function archiveFitViewport() {
  const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
  document.getElementById('archive-nav-canvas').style.transform = 'scale(' + scale + ')';
  document.documentElement.style.setProperty('--ui-scale', scale);
}
archiveFitViewport();
/* 매우 큰 해상도(4K 등)에서 페이지가 곧바로 로드되면 transform 계산은 정확해도
   브라우저 첫 페인트가 이를 놓쳐 콘텐츠가 좌상단에 눌린 채로 그려지는 경우가 있다
   — 다음 프레임에 한 번 더 재적용해서 그 스테일 페인트를 강제로 복구한다. */
requestAnimationFrame(archiveFitViewport);
window.addEventListener('resize', archiveFitViewport);

async function renderArchive() {
  const grid = document.getElementById('archive-grid');
  const empty = document.getElementById('archive-empty-state');
  const template = document.getElementById('archive-card-template');

  grid.innerHTML = '';

  const entries = await feedbackService.listFeedbackDrawings({ includeHidden: isAdminMode });
  if (entries.length === 0) {
    empty.hidden = false;
    grid.hidden = true;
    return;
  }

  empty.hidden = true;
  grid.hidden = false;
  entries.forEach((entry, index) => {
    grid.appendChild(buildArchiveCard(template, entry, index, entries.length));
  });
}

// toLocaleDateString()의 ko 로케일 출력("2026. 8. 27.")은 끝에 마침표가
// 붙는다 — Figma 디자인 표기("2026. 8. 27")에 맞춰 직접 포맷한다.
function formatArchiveDate(date) {
  return date.getFullYear() + '. ' + (date.getMonth() + 1) + '. ' + date.getDate();
}

function buildArchiveCard(template, entry, index, total) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.archive-card');
  const submitted = new Date(entry.submittedAt);

  card.querySelector('.archive-card-image').src = entry.image;
  card.querySelector('.archive-card-date').textContent = formatArchiveDate(submitted);
  card.classList.toggle('is-hidden', !!entry.hidden);

  if (isAdminMode) {
    const controls = card.querySelector('.archive-card-admin-controls');
    controls.hidden = false;

    const upBtn = card.querySelector('.archive-card-move-up');
    const downBtn = card.querySelector('.archive-card-move-down');
    const hideBtn = card.querySelector('.archive-card-hide-toggle');
    const deleteBtn = card.querySelector('.archive-card-delete');

    upBtn.disabled = index === 0;
    downBtn.disabled = index === total - 1;
    hideBtn.textContent = entry.hidden ? '표시' : '숨기기';

    upBtn.addEventListener('click', async () => {
      await feedbackService.moveFeedbackDrawing(entry.id, -1);
      renderArchive();
    });
    downBtn.addEventListener('click', async () => {
      await feedbackService.moveFeedbackDrawing(entry.id, 1);
      renderArchive();
    });
    hideBtn.addEventListener('click', async () => {
      await feedbackService.setFeedbackHidden(entry.id, !entry.hidden);
      renderArchive();
    });
    deleteBtn.addEventListener('click', async () => {
      if (!confirm('이 드로잉을 삭제할까요? 되돌릴 수 없습니다.')) return;
      await feedbackService.deleteFeedbackDrawing(entry.id);
      renderArchive();
    });
  }

  return node;
}

function openAdminLogin() {
  document.getElementById('admin-login-overlay').hidden = false;
  document.getElementById('admin-login-error').hidden = true;
  document.getElementById('admin-password-input').focus();
}

function closeAdminLogin() {
  document.getElementById('admin-login-overlay').hidden = true;
  document.getElementById('admin-password-input').value = '';
}

function setAdminButtonState() {
  // 라벨은 항상 "Setting" — 활성 상태는 텍스트가 아니라 .is-active의
  // 어두운 배경(Contact 버튼엔 없는 상태)으로만 구분한다.
  const btn = document.getElementById('admin-toggle-btn');
  btn.classList.toggle('is-active', isAdminMode);
}

document.getElementById('admin-toggle-btn').addEventListener('click', () => {
  if (isAdminMode) {
    adminAuth.adminLogout();
    isAdminMode = false;
    setAdminButtonState();
    renderArchive();
  } else {
    openAdminLogin();
  }
});

document.getElementById('admin-login-cancel').addEventListener('click', closeAdminLogin);

document.getElementById('admin-login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const input = document.getElementById('admin-password-input');
  const errorEl = document.getElementById('admin-login-error');

  const ok = await adminAuth.attemptAdminLogin(input.value);
  if (ok) {
    isAdminMode = true;
    setAdminButtonState();
    closeAdminLogin();
    renderArchive();
  } else {
    errorEl.hidden = false;
  }
});

(async function init() {
  isAdminMode = await adminAuth.isAdminAuthenticated();
  setAdminButtonState();
  renderArchive();
})();
