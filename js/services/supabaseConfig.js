// Supabase project connection info for the Time Archive feature
// (js/services/feedbackService.js). The anon key is meant to be public —
// it ships to every browser regardless — Row Level Security policies in
// supabase/schema.sql are what actually gate access, not secrecy of this
// key. Still project-specific, so fill in your own project's values below.
//
// Create a project at https://supabase.com, then Project Settings -> API
// for these two values, and run supabase/schema.sql in the SQL editor.
window.SUPABASE_CONFIG = {
  url: 'https://nwlygpemxdmprvwsvipk.supabase.co',
  anonKey: 'sb_publishable_xx_V3AnwEYa4BpFRMwc03w_B_MKuf2S',
};
