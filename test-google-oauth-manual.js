const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI || 'http://localhost:3000/api/auth/google/callback';

async function run() {
  const { data: users } = await supabase.from('profiles').select('id, full_name, email, google_connected, google_refresh_token, google_access_token').eq('google_connected', true);
  if (!users || users.length === 0) {
    console.log("No users with google_connected found.");
    return;
  }
  const user = users[0];
  console.log("Testing with user:", user.email);

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  oauth2Client.setCredentials({
    access_token: user.google_access_token,
    refresh_token: user.google_refresh_token
  });

  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  
  const requestId = 'test-meet-' + Date.now();
  const startTime = new Date();
  startTime.setHours(startTime.getHours() + 24);
  const endTime = new Date(startTime.getTime() + 60*60*1000);

  const event = {
    summary: 'Test Meeting for Meet Link',
    start: { dateTime: startTime.toISOString() },
    end: { dateTime: endTime.toISOString() },
    conferenceData: {
      createRequest: {
        requestId: requestId,
        // trying without conferenceSolutionKey first
      }
    }
  };

  try {
    let res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
      conferenceDataVersion: 1
    });
    
    console.log("Insert Response Conference Data:", JSON.stringify(res.data.conferenceData, null, 2));
    console.log("Hangout Link:", res.data.hangoutLink);
    
    // If no link, try patch
    const hasLink = res.data.hangoutLink || (res.data.conferenceData && res.data.conferenceData.entryPoints);
    if (!hasLink && res.data.id) {
        console.log("Patching with hangoutsMeet...");
        res = await calendar.events.patch({
            calendarId: 'primary',
            eventId: res.data.id,
            requestBody: {
                conferenceData: {
                    createRequest: {
                        requestId: requestId + '-patch',
                        conferenceSolutionKey: { type: 'hangoutsMeet' }
                    }
                }
            },
            conferenceDataVersion: 1
        });
        console.log("Patch Response Conference Data:", JSON.stringify(res.data.conferenceData, null, 2));
        console.log("Hangout Link after patch:", res.data.hangoutLink);
    }
    
    // Delete test event
    if(res.data.id) await calendar.events.delete({calendarId: 'primary', eventId: res.data.id});
    
  } catch (error) {
    console.error("API Error:", error.message);
  }
}
run();
