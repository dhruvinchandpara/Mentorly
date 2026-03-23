/**
 * Test script to verify Google Meet link generation
 * Run with: npx tsx test-google-meet.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'

// Load .env.local file
config({ path: resolve(__dirname, '.env.local') })

import { createGoogleMeeting } from './src/lib/google-calendar'

async function testGoogleMeet() {
  console.log('🧪 Testing Google Meet Link Generation...\n')

  // Test parameters
  const testParams = {
    title: 'Test Mentorship Session',
    description: 'This is a test session to verify Google Meet integration',
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    attendees: ['test@example.com'],
  }

  console.log('📋 Test Parameters:')
  console.log('   Title:', testParams.title)
  console.log('   Start Time:', new Date(testParams.startTime).toLocaleString())
  console.log('   End Time:', new Date(testParams.endTime).toLocaleString())
  console.log('   Attendees:', testParams.attendees.join(', '))
  console.log('\n')

  try {
    console.log('🔄 Attempting to create Google Meet link...\n')

    const result = await createGoogleMeeting(testParams)

    console.log('✅ SUCCESS! Google Meet link generated\n')
    console.log('📊 Results:')
    console.log('   Event ID:', result.eventId)
    console.log('   Meet Link:', result.meetLink)
    console.log('   Calendar Link:', result.calendarLink)
    console.log('\n')

    if (result.meetLink) {
      console.log('✅ Google Meet link is valid:', result.meetLink)
      console.log('\n🎉 Test PASSED - Google Meet integration is working!')
    } else {
      console.log('⚠️  WARNING: Event created but no Meet link was generated')
      console.log('   This means the booking would FAIL in production')
      console.log('\n❌ Test FAILED - Google Meet link not generated')
      process.exit(1)
    }

  } catch (error) {
    console.error('❌ FAILED to create Google Meet link\n')
    console.error('Error:', error instanceof Error ? error.message : error)
    console.log('\n💡 Possible issues:')
    console.log('   1. Check GOOGLE_CLIENT_EMAIL in .env.local')
    console.log('   2. Check GOOGLE_PRIVATE_KEY in .env.local')
    console.log('   3. Verify Google Calendar API is enabled')
    console.log('   4. Verify service account has Calendar access')
    console.log('   5. Check if domain-wide delegation is configured')
    console.log('\n❌ Test FAILED - Unable to create Google Meet link')
    process.exit(1)
  }
}

testGoogleMeet()
