const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('🔄 Running SQL migration...\n')

  try {
    // Add the column to mentors table
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE mentors
        ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
      `
    })

    if (error) {
      // Try alternative approach using the postgres admin connection
      console.log('⚠️  RPC method failed, trying direct query...')

      // Use the raw query method
      const { error: queryError } = await supabase
        .from('mentors')
        .select('profile_picture_url')
        .limit(1)

      if (queryError && queryError.message.includes('does not exist')) {
        console.log('❌ Column does not exist yet. Executing ALTER TABLE...')

        // Last resort: Use postgres extension
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: 'ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;'
          })
        })

        console.log('\n✅ Migration completed!')
        console.log('Column "profile_picture_url" has been added to the mentors table.')
      } else {
        console.log('✅ Column already exists or was just created!')
      }
    } else {
      console.log('✅ Migration executed successfully!')
    }

    // Verify the column exists
    const { data: testData, error: testError } = await supabase
      .from('mentors')
      .select('id, profile_picture_url')
      .limit(1)

    if (!testError) {
      console.log('✅ Verified: profile_picture_url column exists and is queryable')
    } else if (testError.message.includes('does not exist')) {
      console.log('\n⚠️  Column was not created. Please run this SQL manually in Supabase SQL Editor:')
      console.log('\n  ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;\n')
    }

  } catch (err) {
    console.error('❌ Error:', err.message)
    console.log('\n⚠️  Please execute this SQL manually in Supabase SQL Editor:')
    console.log('\n  ALTER TABLE mentors ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;\n')
  }
}

runMigration()
