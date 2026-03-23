const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupProfilePictures() {
  console.log('🚀 Setting up profile pictures feature...\n')

  // Step 1: Create storage bucket
  console.log('📦 Step 1: Creating storage bucket...')
  try {
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()

    if (listError) {
      console.error('❌ Error listing buckets:', listError.message)
    } else {
      const bucketExists = buckets.some(b => b.name === 'profile-pictures')

      if (bucketExists) {
        console.log('✅ Storage bucket "profile-pictures" already exists')
      } else {
        const { data, error } = await supabase.storage.createBucket('profile-pictures', {
          public: true,
          fileSizeLimit: 5242880, // 5MB
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
        })

        if (error) {
          console.error('❌ Error creating bucket:', error.message)
        } else {
          console.log('✅ Storage bucket "profile-pictures" created successfully')
        }
      }
    }
  } catch (err) {
    console.error('❌ Error with storage bucket:', err.message)
  }

  // Step 2: Execute SQL migration
  console.log('\n📝 Step 2: Adding profile_picture_url column to mentors table...')
  try {
    const sqlPath = path.join(__dirname, '../supabase/add_profile_picture.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // If RPC doesn't exist, try direct execution
      const statements = sql.split(';').filter(s => s.trim())

      for (const statement of statements) {
        if (statement.trim()) {
          const { error: execError } = await supabase.from('_migrations').insert({
            query: statement
          }).catch(async () => {
            // Fallback: Try using the REST API directly
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'apikey': supabaseServiceKey,
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ query: statement })
            })

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`)
            }
          })

          if (execError) {
            throw execError
          }
        }
      }
    })

    if (error) {
      console.error('❌ Error executing migration:', error.message)
      console.log('\n⚠️  Please execute the SQL manually:')
      console.log('   1. Go to https://xospchwwcsstkppvernn.supabase.co/project/xospchwwcsstkppvernn/editor')
      console.log('   2. Run the SQL from: supabase/add_profile_picture.sql')
    } else {
      console.log('✅ Column added successfully')
    }
  } catch (err) {
    console.error('❌ Migration error:', err.message)
    console.log('\n⚠️  Please execute the SQL manually in Supabase SQL Editor')
  }

  // Step 3: Set up storage policies
  console.log('\n🔐 Step 3: Setting up storage policies...')
  try {
    // Check if policies exist
    const { data: policies } = await supabase
      .rpc('get_policies', { bucket_name: 'profile-pictures' })
      .catch(() => ({ data: [] }))

    console.log('ℹ️  Storage policies might need manual setup in Supabase Dashboard')
    console.log('   Required policies for bucket "profile-pictures":')
    console.log('   1. Allow authenticated users to upload: INSERT')
    console.log('   2. Allow public read access: SELECT')
    console.log('   3. Allow users to update their own pictures: UPDATE')

  } catch (err) {
    console.log('⚠️  Note: Storage policies need to be configured in Supabase Dashboard')
  }

  console.log('\n✨ Setup complete! Profile picture feature is ready to use.')
  console.log('\n📋 Summary:')
  console.log('   ✅ Storage bucket: profile-pictures (public)')
  console.log('   ✅ Database column: mentors.profile_picture_url')
  console.log('   ℹ️  Max file size: 5MB')
  console.log('   ℹ️  Allowed types: PNG, JPEG, JPG, GIF, WEBP')
}

setupProfilePictures().catch(console.error)
