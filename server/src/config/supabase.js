const { createClient } = require("@supabase/supabase-js");

let supabase;

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function getSupabase() {
  if (!isSupabaseConfigured()) {
    const error = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
    error.status = 503;
    throw error;
  }

  if (!supabase) {
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );
  }

  return supabase;
}

module.exports = {
  getSupabase,
  isSupabaseConfigured
};
