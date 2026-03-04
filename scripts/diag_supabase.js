const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) env[key.trim()] = value.join('=').trim().replace(/^"(.*)"$/, '$1');
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConnection() {
    console.log('Testing connection to:', supabaseUrl);

    // Test raw fetch first
    try {
        console.log('--- Testing Raw Fetch ---');
        const fetchStart = Date.now();
        const resp = await fetch(supabaseUrl + '/auth/v1/health');
        console.log('Raw fetch status:', resp.status);
        console.log('Raw fetch text:', await resp.text());
        console.log('Raw fetch duration:', Date.now() - fetchStart, 'ms');
    } catch (err) {
        console.error('Raw Fetch Error:', err.message);
    }

    console.log('\n--- Testing Supabase SDK ---');
    const start = Date.now();
    try {
        const { data, error } = await supabase.from('profiles').select('email, role').limit(5);
        const duration = Date.now() - start;
        if (error) {
            console.error('Database Error:', error.message);
            console.error('Details:', error.details);
        } else {
            console.log('Connection Successful!');
            console.log('Duration:', duration, 'ms');
            console.log('Sample Profiles:', data);
        }
    } catch (err) {
        console.error('Unexpected Error:', err.message);
    }
}

checkConnection();
