// supabase/functions/notify-booking/index.ts
// Supabase Edge Function — sends email + SMS on new booking
// Deploy with: supabase functions deploy notify-booking

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SEMAPHORE_API_KEY = Deno.env.get("SEMAPHORE_API_KEY")!;
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL")!;
const ADMIN_PHONE = Deno.env.get("ADMIN_PHONE")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { booking } = await req.json();
    const { court, date, startHour, endHour, name, phone } = booking;

    const fmt = (h: number) =>
      h < 12 ? `${h}:00 AM` : h === 12 ? `12:00 PM` : `${h - 12}:00 PM`;

    const dateFormatted = new Date(date + "T00:00:00").toLocaleDateString("en-PH", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const timeFormatted = `${fmt(startHour)} – ${fmt(endHour)}`;
    const hours = endHour - startHour;
    const total = hours * 150;

    // ── EMAIL TO CUSTOMER ──────────────────────────────────────────────────
    const customerEmailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'DM Sans',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#0a0a0a,#1a2e1a);padding:2rem;text-align:center">
      <div style="font-size:2.5rem;margin-bottom:.5rem">🏓</div>
      <div style="font-family:Arial,sans-serif;font-weight:800;font-size:1.5rem;color:white">BNJ Pickle Yard</div>
      <div style="color:#22c55e;font-size:.9rem;margin-top:.25rem">Zamboanga City's #1 Pickle Yard</div>
    </div>
    <div style="padding:2rem">
      <div style="background:#f0fdf4;border:1.5px solid #dcfce7;border-radius:12px;padding:1.25rem;text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2rem;margin-bottom:.5rem">✅</div>
        <div style="font-weight:800;font-size:1.2rem;color:#15803d">Booking Confirmed!</div>
        <div style="color:#64748b;font-size:.875rem;margin-top:.25rem">Your court is reserved, ${name.split(" ")[0]}!</div>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:.9rem">
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:.6rem 0;color:#94a3b8;width:40%">Court</td>
          <td style="padding:.6rem 0;font-weight:600;color:#1e293b">${court}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:.6rem 0;color:#94a3b8">Date</td>
          <td style="padding:.6rem 0;font-weight:600;color:#1e293b">${dateFormatted}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:.6rem 0;color:#94a3b8">Time</td>
          <td style="padding:.6rem 0;font-weight:600;color:#1e293b">${timeFormatted}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:.6rem 0;color:#94a3b8">Duration</td>
          <td style="padding:.6rem 0;font-weight:600;color:#1e293b">${hours} hour${hours > 1 ? "s" : ""}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:.6rem 0;color:#94a3b8">Name</td>
          <td style="padding:.6rem 0;font-weight:600;color:#1e293b">${name}</td>
        </tr>
        <tr>
          <td style="padding:.6rem 0;color:#94a3b8">Total</td>
          <td style="padding:.6rem 0;font-weight:800;color:#16a34a;font-size:1.1rem">₱${total.toLocaleString()}</td>
        </tr>
      </table>

      <div style="background:#eff6ff;border:1.5px solid #bfdbfe;border-radius:12px;padding:1.25rem;margin-top:1.5rem">
        <div style="font-weight:700;color:#1d4ed8;margin-bottom:.75rem;font-size:.9rem">💳 GCash Payment</div>
        <div style="font-size:.875rem;color:#334155;line-height:1.6">
          Please send <strong>₱${total.toLocaleString()}</strong> to:<br>
          📱 <strong>09152953365</strong><br>
          👤 <strong>Niel Jacob D. Banquirigo</strong><br><br>
          Send your GCash screenshot to our Facebook Messenger as proof of payment.
        </div>
      </div>

      <div style="background:#f8fafc;border-radius:12px;padding:1.25rem;margin-top:1rem;font-size:.85rem;color:#64748b;line-height:1.6">
        ⏰ Please arrive on time. 15-minute grace period applies.<br>
        ❌ Cancel at least 2 hours before for a full refund.<br>
        👟 Non-marking shoes required inside courts.
      </div>
    </div>
    <div style="background:#f8fafc;padding:1.25rem;text-align:center;font-size:.8rem;color:#94a3b8;border-top:1px solid #f1f5f9">
      BNJ Pickle Yard · Zamboanga City · Open 6AM–9PM Daily<br>
      <a href="https://m.me/BNJPickleYard" style="color:#22c55e;text-decoration:none">Message us on Facebook</a>
    </div>
  </div>
</body>
</html>`;

    // ── EMAIL TO ADMIN ─────────────────────────────────────────────────────
    const adminEmailHtml = `
<!DOCTYPE html>
<html>
<body style="font-family:Arial,sans-serif;background:#f8fafc;padding:2rem">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:12px;padding:1.5rem;box-shadow:0 2px 12px rgba(0,0,0,.08)">
    <div style="background:#0a0a0a;border-radius:8px;padding:1rem;text-align:center;margin-bottom:1.25rem">
      <div style="color:#22c55e;font-weight:800;font-size:1.1rem">🏓 New Booking Alert!</div>
    </div>
    <table style="width:100%;font-size:.9rem;border-collapse:collapse">
      <tr><td style="padding:.5rem 0;color:#64748b;width:35%">Court</td><td style="font-weight:700">${court}</td></tr>
      <tr><td style="padding:.5rem 0;color:#64748b">Date</td><td style="font-weight:700">${dateFormatted}</td></tr>
      <tr><td style="padding:.5rem 0;color:#64748b">Time</td><td style="font-weight:700">${timeFormatted}</td></tr>
      <tr><td style="padding:.5rem 0;color:#64748b">Customer</td><td style="font-weight:700">${name}</td></tr>
      <tr><td style="padding:.5rem 0;color:#64748b">Phone</td><td style="font-weight:700">${phone}</td></tr>
      <tr><td style="padding:.5rem 0;color:#64748b">Amount Due</td><td style="font-weight:800;color:#16a34a;font-size:1.1rem">₱${total.toLocaleString()}</td></tr>
    </table>
    <div style="margin-top:1rem;padding:.75rem;background:#f0fdf4;border-radius:8px;font-size:.85rem;color:#15803d">
      ✅ Booking saved to database. Check your Admin Dashboard for details.
    </div>
  </div>
</body>
</html>`;

    // ── SEND CUSTOMER EMAIL ────────────────────────────────────────────────
    const customerEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BNJ Pickle Yard <bookings@bnjpickleyard.com>",
        to: [booking.email || ADMIN_EMAIL], // fallback to admin if no customer email
        subject: `✅ Booking Confirmed — ${court} on ${dateFormatted}`,
        html: customerEmailHtml,
      }),
    });

    // ── SEND ADMIN EMAIL ───────────────────────────────────────────────────
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BNJ Pickle Yard <bookings@bnjpickleyard.com>",
        to: [ADMIN_EMAIL],
        subject: `🏓 New Booking: ${name} — ${court} ${timeFormatted}`,
        html: adminEmailHtml,
      }),
    });

    // ── SEND CUSTOMER SMS ──────────────────────────────────────────────────
    const customerSms = `BNJ Pickle Yard: Hi ${name.split(" ")[0]}! Your booking is confirmed. ${court} on ${dateFormatted} from ${timeFormatted}. Total: P${total}. Pay via GCash: 09152953365 (Niel Jacob D. Banquirigo). Questions? Call/text 09152953365.`;

    await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: phone,
        message: customerSms,
        sendername: "BNJPICKLE",
      }),
    });

    // ── SEND ADMIN SMS ─────────────────────────────────────────────────────
    const adminSms = `BNJ NEW BOOKING: ${name} booked ${court} on ${dateFormatted} ${timeFormatted}. Phone: ${phone}. Amount: P${total}. Check dashboard.`;

    await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apikey: SEMAPHORE_API_KEY,
        number: ADMIN_PHONE,
        message: adminSms,
        sendername: "BNJPICKLE",
      }),
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
