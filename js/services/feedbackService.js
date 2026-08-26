// Feedback drawing persistence service.
//
//   Contact Drawing -> Submit API -> Database / Storage -> Archive Page
//
// This file is the "Submit API" + "Database/Storage" link in that chain.
// Nothing outside this file should know how/where drawings are actually
// stored — the Contact page and the Archive page both only ever call the
// functions below. Entry shape: { id, image, submittedAt, hidden?, order }.
// Array order in storage IS display order — reordering just rewrites it.
//
// TODO: there is no real backend yet, so this is a mock persistence layer
// backed by localStorage (works fully offline, resets per-browser). Once a
// backend exists (Supabase / Firebase / a custom API), replace the bodies
// below with real network calls — callers do not need to change.

const FEEDBACK_STORAGE_KEY = 'playtime.feedbackDrawings';

function readAllFeedback() {
  try {
    const raw = localStorage.getItem(FEEDBACK_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('[feedbackService] failed to read stored feedback', err);
    return [];
  }
}

function writeAllFeedback(entries) {
  localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(entries));
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function makeFeedbackId() {
  return 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// TODO: swap this mock body for a real Submit API call once a backend exists, e.g.:
//   const formData = new FormData();
//   formData.append('drawing', blob, 'feedback.png');
//   const res = await fetch('/api/feedback', { method: 'POST', body: formData });
//   return res.json();
async function submitFeedbackDrawing(blob) {
  const image = await blobToDataUrl(blob);
  const entry = {
    id: makeFeedbackId(),
    image,
    submittedAt: new Date().toISOString(),
  };
  const entries = readAllFeedback();
  entries.unshift(entry);
  writeAllFeedback(entries);
  return entry;
}

// TODO: swap this mock body for a real API/database read once a backend exists.
// Public callers (the Archive page's default view) get includeHidden:false
// so admin-hidden entries never reach visitors; the admin view passes true.
async function listFeedbackDrawings({ includeHidden = false } = {}) {
  const entries = readAllFeedback();
  return includeHidden ? entries : entries.filter(e => !e.hidden);
}

// TODO: swap this mock body for a real API/database delete once a backend exists.
async function deleteFeedbackDrawing(id) {
  writeAllFeedback(readAllFeedback().filter(e => e.id !== id));
}

// TODO: swap this mock body for a real API/database update once a backend exists.
async function setFeedbackHidden(id, hidden) {
  const entries = readAllFeedback();
  const entry = entries.find(e => e.id === id);
  if (!entry) return;
  entry.hidden = hidden;
  writeAllFeedback(entries);
}

// direction: -1 to move earlier in the display order, +1 to move later.
// TODO: swap this mock body for a real API/database reorder once a backend exists.
async function moveFeedbackDrawing(id, direction) {
  const entries = readAllFeedback();
  const from = entries.findIndex(e => e.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= entries.length) return;
  [entries[from], entries[to]] = [entries[to], entries[from]];
  writeAllFeedback(entries);
}

window.feedbackService = {
  submitFeedbackDrawing,
  listFeedbackDrawings,
  deleteFeedbackDrawing,
  setFeedbackHidden,
  moveFeedbackDrawing,
};
