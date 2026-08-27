// Feedback drawing persistence service.
//
//   Contact Drawing -> Submit API -> Database / Storage -> Archive Page
//
// This file is the "Submit API" + "Database/Storage" link in that chain.
// Nothing outside this file should know how/where drawings are actually
// stored — the Contact page and the Archive page both only ever call the
// functions below. Entry shape: { id, image, submittedAt, hidden?, position }.
//
// Backed by Supabase (see supabase/schema.sql for the table/bucket setup,
// js/services/supabaseConfig.js for the project url/key): drawing PNGs go
// to the `feedback-drawings` storage bucket, everything else to the
// `feedback_drawings` table. This is what makes the Archive shared — a
// Save from any visitor's browser lands in the same table everyone else
// reads, unlike the old localStorage version which only that visitor could
// ever see. `position` (not array order) determines display order, so
// reordering rewrites two rows instead of splicing an array.

const FEEDBACK_BUCKET = 'feedback-drawings';
const FEEDBACK_TABLE = 'feedback_drawings';

const supabaseClient = window.supabase.createClient(
  window.SUPABASE_CONFIG.url,
  window.SUPABASE_CONFIG.anonKey
);

function makeFeedbackId() {
  return 'fb_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function rowToEntry(row) {
  return {
    id: row.id,
    image: row.image_url,
    submittedAt: row.submitted_at,
    hidden: row.hidden,
    position: row.position,
  };
}

async function submitFeedbackDrawing(blob) {
  const id = makeFeedbackId();
  const path = id + '.png';

  const { error: uploadError } = await supabaseClient.storage
    .from(FEEDBACK_BUCKET)
    .upload(path, blob, { contentType: 'image/png' });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabaseClient.storage.from(FEEDBACK_BUCKET).getPublicUrl(path);

  // New drawings lead the archive (like the old unshift() did) — one below
  // whatever currently has the lowest position.
  const { data: earliest } = await supabaseClient
    .from(FEEDBACK_TABLE)
    .select('position')
    .order('position', { ascending: true })
    .limit(1)
    .maybeSingle();
  const position = earliest ? earliest.position - 1 : 0;

  const { data: row, error: insertError } = await supabaseClient
    .from(FEEDBACK_TABLE)
    .insert({ id, image_url: urlData.publicUrl, hidden: false, position })
    .select()
    .single();
  if (insertError) throw insertError;

  return rowToEntry(row);
}

// Public callers (the Archive page's default view) get includeHidden:false
// so admin-hidden entries never reach visitors; the admin view passes true.
async function listFeedbackDrawings({ includeHidden = false } = {}) {
  let query = supabaseClient.from(FEEDBACK_TABLE).select('*').order('position', { ascending: true });
  if (!includeHidden) query = query.eq('hidden', false);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(rowToEntry);
}

async function deleteFeedbackDrawing(id) {
  await supabaseClient.storage.from(FEEDBACK_BUCKET).remove([id + '.png']);
  const { error } = await supabaseClient.from(FEEDBACK_TABLE).delete().eq('id', id);
  if (error) throw error;
}

async function setFeedbackHidden(id, hidden) {
  const { error } = await supabaseClient.from(FEEDBACK_TABLE).update({ hidden }).eq('id', id);
  if (error) throw error;
}

// direction: -1 to move earlier in the display order, +1 to move later.
async function moveFeedbackDrawing(id, direction) {
  const { data: entries, error } = await supabaseClient
    .from(FEEDBACK_TABLE)
    .select('id, position')
    .order('position', { ascending: true });
  if (error) throw error;

  const from = entries.findIndex(e => e.id === id);
  const to = from + direction;
  if (from === -1 || to < 0 || to >= entries.length) return;

  const a = entries[from];
  const b = entries[to];
  const [aResult, bResult] = await Promise.all([
    supabaseClient.from(FEEDBACK_TABLE).update({ position: b.position }).eq('id', a.id),
    supabaseClient.from(FEEDBACK_TABLE).update({ position: a.position }).eq('id', b.id),
  ]);
  if (aResult.error) throw aResult.error;
  if (bResult.error) throw bResult.error;
}

window.feedbackService = {
  submitFeedbackDrawing,
  listFeedbackDrawings,
  deleteFeedbackDrawing,
  setFeedbackHidden,
  moveFeedbackDrawing,
};
