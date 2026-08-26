// Controller for pages/admin-feedback.html — "Time Archive".
//
// Route: /pages/admin-feedback.html
//
// The gallery itself is public: anyone can view non-hidden drawings with
// no login. Clicking 관리자 (Admin) opens a centered password prompt
// (js/services/adminAuth.js — currently a password stub, see its TODO for
// wiring up real auth). Once unlocked, hidden entries also become visible
// and each card gets delete/hide/reorder controls backed by
// js/services/feedbackService.js.

let isAdminMode = false;

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

function buildArchiveCard(template, entry, index, total) {
  const node = template.content.cloneNode(true);
  const card = node.querySelector('.archive-card');
  const submitted = new Date(entry.submittedAt);

  card.querySelector('.archive-card-image').src = entry.image;
  card.querySelector('.archive-card-date').textContent = submitted.toLocaleDateString();
  card.querySelector('.archive-card-time').textContent = submitted.toLocaleTimeString();
  card.querySelector('.archive-card-id').textContent = entry.id;
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
  const btn = document.getElementById('admin-toggle-btn');
  btn.textContent = isAdminMode ? '관리자 종료' : '관리자';
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
