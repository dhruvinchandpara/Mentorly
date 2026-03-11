# Slot-Based Booking System Implementation

## Overview
Converted the booking system from full time-block bookings to 15-minute slot-based bookings. Mentors still define availability windows, but students now book 15-minute slots within those windows, with the option to book multiple consecutive slots.

## Changes Made

### 1. Database Migration
**File:** `supabase/slot_based_bookings.sql`

- Added `slot_count` column to `bookings` table (tracks number of 15-min slots)
- Added constraint to ensure `duration_minutes` is in 15-minute increments
- Added database index for faster overlap queries
- Added check constraint for valid slot counts

**To apply:** Run this SQL in your Supabase SQL editor.

### 2. Booking Action Updates
**File:** `src/app/actions/booking.ts`

- Updated `BookingInput` type to include `slotCount` parameter
- Added validation for 15-minute increments
- Enhanced overlap detection for slot-based bookings
- Now inserts `slot_count` when creating bookings

### 3. Booking UI (Student Side)
**File:** `src/app/mentor/[id]/page.tsx`

Key changes:
- `generateTimeSlots()` now generates 15-minute intervals (instead of 60-minute)
- Added `slotCount` state (1 = 15min, 2 = 30min)
- Added `bookedSlots` state to track already-booked slots
- Added `fetchBookedSlotsForDate()` to fetch existing bookings
- Added `isSlotAvailable()` helper to check consecutive slot availability
- Added duration selector UI (15 min or 30 min buttons)
- Time slot buttons now show availability status (available/booked/insufficient consecutive slots)
- Disabled slots that are already booked or don't have enough consecutive slots
- Updated booking handler to calculate duration based on slot count
- Updated pricing calculation: `₹{Math.round((hourly_rate * slotCount * 15) / 60)}`
- Confirmation screen shows correct duration

### 4. Mentor Dashboard
**File:** `src/app/dashboard/mentor/page.tsx`

- Updated `Booking` interface to include `duration_minutes` and `slot_count`
- Updated booking query to fetch these new fields
- Updated booking cards to display duration (e.g., "2:00 PM – 2:15 PM (15 min)")

### 5. Student Dashboard
**File:** `src/app/dashboard/student/page.tsx`

- Updated `Booking` interface to include `duration_minutes` and `slot_count`
- Updated booking query to fetch these new fields
- Updated booking cards to display duration

## How It Works

### For Mentors:
1. Mentors continue to set availability windows (e.g., 2:00 PM - 4:00 PM)
2. These windows remain unchanged in the UI
3. Dashboard now shows individual slot bookings with durations

### For Students:
1. Select a mentor and date
2. Choose session duration (15 min or 30 min)
3. See all available 15-minute time slots within the mentor's availability window
4. Slots are automatically disabled if:
   - Already booked
   - Not enough consecutive slots available (e.g., if selecting 30 min but only 15 min left)
5. Book the session with accurate pricing based on duration

### Pricing Calculation:
```javascript
price = (hourly_rate * duration_minutes) / 60

// Examples:
// 15 min @ ₹100/hr = ₹25
// 30 min @ ₹100/hr = ₹50
```

### Overlap Detection:
The system prevents double-booking by checking if any 15-minute slot within the requested time range is already booked.

## Testing Checklist

- [ ] Apply database migration in Supabase
- [ ] Test 15-minute booking flow
- [ ] Test 30-minute booking flow
- [ ] Verify slots are marked as booked after booking
- [ ] Verify consecutive slot logic (can't book 30min if only 15min available)
- [ ] Check pricing calculations for both durations
- [ ] Verify mentor dashboard shows correct durations
- [ ] Verify student dashboard shows correct durations
- [ ] Test overlap prevention (try booking same slot twice)
- [ ] Verify Google Calendar integration still works with new durations

## Migration Steps

1. **Apply Database Migration:**
   ```sql
   -- Run supabase/slot_based_bookings.sql in Supabase SQL editor
   ```

2. **Deploy Code:**
   - All code changes are already in place
   - No environment variable changes needed

3. **Existing Bookings:**
   - Old bookings without `slot_count` will default to 1
   - They will display with their original `duration_minutes`
   - System is backward compatible

## Future Enhancements (Optional)

- [ ] Add 45-minute and 60-minute options (3 and 4 slots)
- [ ] Add calendar view showing booked vs available slots
- [ ] Add notification when consecutive slots not available
- [ ] Add "book multiple sessions" feature
- [ ] Add mentor statistics showing slot utilization
