const https = require('https');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const projectRef = 'xospchwwcsstkppvernn';

async function setupStoragePolicies() {
  console.log('🔐 Setting up storage policies for profile-pictures bucket...\n');

  // First, let's try to enable RLS on the storage.objects table
  const enableRLSSQL = `
    -- Enable RLS on storage.objects if not already enabled
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  `;

  // Define policies
  const policies = [
    {
      name: 'Allow authenticated uploads',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can upload profile pictures"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'profile-pictures');
      `
    },
    {
      name: 'Allow public read',
      sql: `
        CREATE POLICY IF NOT EXISTS "Public read access"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'profile-pictures');
      `
    },
    {
      name: 'Allow authenticated updates',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can update profile pictures"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'profile-pictures')
        WITH CHECK (bucket_id = 'profile-pictures');
      `
    },
    {
      name: 'Allow authenticated deletes',
      sql: `
        CREATE POLICY IF NOT EXISTS "Users can delete profile pictures"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'profile-pictures');
      `
    }
  ];

  console.log('⚠️  Note: Supabase doesn\'t allow creating policies via API for security reasons.\n');
  console.log('📝 Please run these SQL commands in the Supabase SQL Editor:\n');
  console.log('🔗 https://supabase.com/dashboard/project/' + projectRef + '/editor/sql\n');
  console.log('═'.repeat(80));
  console.log('\n-- Enable RLS on storage.objects');
  console.log(enableRLSSQL);

  policies.forEach((policy, index) => {
    console.log(`\n-- Policy ${index + 1}: ${policy.name}`);
    console.log(policy.sql);
  });

  console.log('\n' + '═'.repeat(80));
  console.log('\n✨ After running these SQL commands, profile picture uploads will work!\n');
}

setupStoragePolicies().catch(console.error);
