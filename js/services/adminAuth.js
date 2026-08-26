// Auth guard for admin mode on the Time Archive page (pages/admin-feedback.html).
//
// The Archive gallery itself is public (no login needed to view it) — this
// only gates the "관리자" (Admin) mode toggle that reveals delete/hide/
// reorder controls. This is a simple client-side password gate, not real
// authentication — ADMIN_PASSWORD ships in plain text inside this file, so
// anyone who opens devtools/view-source can read it. It only keeps casual
// visitors out.
//
// TODO: replace with real admin authentication (Supabase Auth / Firebase
// Auth / a custom login) before this page is ever exposed with real user
// data. isAdminAuthenticated()/attemptAdminLogin() are the only two choke
// points admin-feedback.js calls — swap their bodies (e.g. to check a
// Supabase session, or POST to a /api/admin/login endpoint) and nothing
// else needs to change.

const ADMIN_PASSWORD = 'new';
const ADMIN_SESSION_KEY = 'playtime.adminUnlocked';

// Unlock state is per-tab-session (sessionStorage) so a refresh doesn't
// force re-entering the password, but a closed tab/browser does.
async function isAdminAuthenticated() {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === '1';
}

async function attemptAdminLogin(password) {
  const ok = password === ADMIN_PASSWORD;
  if (ok) sessionStorage.setItem(ADMIN_SESSION_KEY, '1');
  return ok;
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
}

window.adminAuth = { isAdminAuthenticated, attemptAdminLogin, adminLogout };
