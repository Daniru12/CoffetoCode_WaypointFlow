const { createClient } = require('@supabase/supabase-js');
const config = require('./env');

let supabase = null;

if (config.supabase.url && config.supabase.key) {
  try {
    supabase = createClient(config.supabase.url, config.supabase.key, {
      auth: { persistSession: false }
    });
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('Supabase URL or Key not configured; Supabase client is operating in fallback mode.');
}

module.exports = supabase;
