const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data: users, error } = await supabase.from('profiles').select('id, full_name, email, google_connected, google_refresh_token').eq('google_connected', true);
  console.log("Connected users:", users);
}
run();
