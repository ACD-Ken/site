import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Triggered by Supabase Database Webhook on INSERT to public.subscribers
serve(async (req) => {
  const payload = await req.json();
  const { name, email, created_at } = payload.record;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DMsgBox Waitlist <onboarding@resend.dev>",
      to: ["alsocando@gmail.com"],
      subject: `New waitlist signup: ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0D9488">New DMsgBox Waitlist Signup</h2>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="padding:8px 0;color:#666">Name</td><td style="padding:8px 0;font-weight:600">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Email</td><td style="padding:8px 0;font-weight:600">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#666">Signed up</td><td style="padding:8px 0">${new Date(created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}</td></tr>
          </table>
          <p style="margin-top:24px;color:#999;font-size:12px">Sent automatically by DMsgBox waitlist.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return new Response(`Resend error: ${err}`, { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
