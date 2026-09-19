const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verify() {
  console.log('🔍 Running Post-Migration Verification Checks...\n');

  let allPassed = true;

  // 1. Check Row Counts
  console.log('--- 1. ROW COUNT VERIFICATION ---');
  const tableChecks = [
    { name: 'profiles', expectedMin: 9 },
    { name: 'sessions', expectedExact: 44 },
    { name: 'mentors', expectedMin: 4 },
    { name: 'students', expectedMin: 2 },
    { name: 'authorized_students', expectedMin: 99 },
  ];

  for (const t of tableChecks) {
    const { count, error } = await supabase.from(t.name).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table ${t.name}: Error (${error.message})`);
      allPassed = false;
    } else {
      const match = t.expectedExact ? count === t.expectedExact : count >= t.expectedMin;
      console.log(`${match ? '✅' : '❌'} Table ${t.name}: ${count} rows (Expected: ${t.expectedExact || `>= ${t.expectedMin}`})`);
      if (!match) allPassed = false;
    }
  }

  // 2. Backward-Compatible 'bookings' View
  console.log('\n--- 2. BOOKINGS VIEW VERIFICATION ---');
  const { count: bookingsCount, error: bookingsErr } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
  if (bookingsErr) {
    console.log('❌ View bookings error:', bookingsErr.message);
    allPassed = false;
  } else {
    console.log(`✅ View bookings accessible: ${bookingsCount} rows`);
  }

  // 3. Status Distribution
  console.log('\n--- 3. STATUS ENUM VERIFICATION ---');
  const { data: statusData, error: statusErr } = await supabase.from('sessions').select('status');
  if (statusErr) {
    console.log('❌ Sessions status query failed:', statusErr.message);
    allPassed = false;
  } else {
    const counts = {};
    for (const r of statusData) {
      counts[r.status] = (counts[r.status] || 0) + 1;
    }
    console.log('Sessions status distribution:', counts);
    if (counts['scheduled'] === 10 && counts['completed'] === 34) {
      console.log('✅ Exactly 10 scheduled and 34 completed sessions mapped perfectly');
    } else {
      console.log('⚠️ Status count deviation detected');
    }
  }

  // 4. Spot Check 3 Sessions
  console.log('\n--- 4. SPOT CHECK 3 SESSIONS ---');
  const testIds = [
    '3872f2bb-973e-4967-9ce5-a9afe4bb1675',
    '3b031443-3816-4b8a-937c-cf104ac3957f',
    '637ef587-5a16-47f6-bb64-1dc9316fa185'
  ];

  const { data: spotSessions, error: spotErr } = await supabase
    .from('sessions')
    .select('id, mentor_id, student_id, requested_date, requested_start_time, pre_work_reason, duration_minutes, actual_duration_minutes, status, meet_link')
    .in('id', testIds);

  if (spotErr) {
    console.log('❌ Spot check query failed:', spotErr.message);
    allPassed = false;
  } else {
    for (const s of spotSessions) {
      console.log(`\nSession ${s.id}:`);
      console.log(`  - Status: ${s.status}`);
      console.log(`  - Date: ${s.requested_date}, Start Time: ${s.requested_start_time}`);
      console.log(`  - Pre-work Reason: "${s.pre_work_reason}"`);
      console.log(`  - Duration: ${s.duration_minutes}m, Actual: ${s.actual_duration_minutes}m`);
      if (!s.requested_date || !s.requested_start_time || !s.pre_work_reason) {
        console.log('  ❌ Missing required fields!');
        allPassed = false;
      } else {
        console.log('  ✅ Fields properly populated');
      }
    }
  }

  // 5. Admin Payments View
  console.log('\n--- 5. ADMIN PAYMENTS VIEW VERIFICATION ---');
  const { data: paymentsData, error: paymentsErr } = await supabase
    .from('admin_payments_view')
    .select('*')
    .limit(5);

  if (paymentsErr) {
    console.log('❌ admin_payments_view error:', paymentsErr.message);
    allPassed = false;
  } else {
    console.log(`✅ admin_payments_view returned ${paymentsData.length} mentor payment records:`);
    for (const p of paymentsData) {
      console.log(`  - ${p.mentor_name}: ${p.completed_sessions} sessions, ${p.total_hours} hrs, ₹${p.total_earnings} earnings`);
    }
  }

  // 6. Profiles Consolidated Fields Check
  console.log('\n--- 6. PROFILES CONSOLIDATED FIELDS VERIFICATION ---');
  const { data: profData, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_authorized, hourly_rate, expertise_tags, is_active')
    .limit(4);

  if (profErr) {
    console.log('❌ Profiles query error:', profErr.message);
    allPassed = false;
  } else {
    console.log(`✅ Profiles sample:`);
    for (const p of profData) {
      console.log(`  - ${p.full_name} (${p.role}): is_authorized=${p.is_authorized}, rate=${p.hourly_rate}, tags=[${p.expertise_tags || ''}]`);
    }
  }

  console.log('\n========================================');
  if (allPassed) {
    console.log('🎉 ALL VERIFICATION CRITERIA PASSED SUCCESSFULLY!');
  } else {
    console.log('⚠️ SOME VERIFICATION CHECKS FAILED OR PENDING EXECUTION.');
  }
  console.log('========================================\n');
}

verify();
