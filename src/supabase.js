import { createClient } from "@supabase/supabase-js";

// ─── REPLACE THESE WITH YOUR ACTUAL VALUES FROM SUPABASE DASHBOARD ───────────
// Go to: supabase.com → your project → Settings → API
const SUPABASE_URL = "https://zjdanzcxtvwngefxkjrq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqZGFuemN4dHZ3bmdlZnhranJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjMwMTUsImV4cCI6MjA5NTA5OTAxNX0.DW1HI202OjvxtoGamIc0xf2Ye34-lryBdguoSlxVdT4";
// ─────────────────────────────────────────────────────────────────────────────

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── BOOKINGS API ─────────────────────────────────────────────────────────────

/** Fetch all bookings (optionally filter by date) */
export async function fetchBookings(date = null) {
  let query = supabase
    .from("bookings")
    .select("*")
    .order("date", { ascending: true })
    .order("start_hour", { ascending: true });

  if (date) query = query.eq("date", date);

  const { data, error } = await query;
  if (error) throw error;
  return data.map(dbToApp);
}

/** Insert a new booking */
export async function createBooking(booking) {
  const { data, error } = await supabase
    .from("bookings")
    .insert([appToDb(booking)])
    .select()
    .single();
  if (error) throw error;
  return dbToApp(data);
}

/** Update booking status */
export async function updateBookingStatus(id, status) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return dbToApp(data);
}

/** Delete a booking */
export async function deleteBooking(id) {
  const { error } = await supabase.from("bookings").delete().eq("id", id);
  if (error) throw error;
}

/** Subscribe to real-time booking changes */
export function subscribeToBookings(callback) {
  return supabase
    .channel("bookings-channel")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "bookings" },
      callback
    )
    .subscribe();
}

// ─── SHAPE CONVERTERS ─────────────────────────────────────────────────────────
// DB uses snake_case; app uses camelCase

function dbToApp(row) {
  return {
    id: row.id,
    court: row.court,
    date: row.date,
    startHour: row.start_hour,
    endHour: row.end_hour,
    name: row.name,
    phone: row.phone,
    status: row.status,
    createdAt: row.created_at,
  };
}

function appToDb(booking) {
  return {
    court: booking.court,
    date: booking.date,
    start_hour: booking.startHour,
    end_hour: booking.endHour,
    name: booking.name,
    phone: booking.phone,
    status: booking.status || "reserved",
  };
}
