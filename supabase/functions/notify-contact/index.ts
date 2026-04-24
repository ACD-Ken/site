import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Triggered by Supabase Database Webhook on INSERT to public.contact_submissions
serve(async (req) => {
  const payload = await req.json();
  const { name, email, message, created_at } = payload.record;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "DMsgBox Contact <onboarding@resend.dev>",
      to: ["alsocando@gmail.com"],
      reply_to: email,
      subject: `New enquiry from ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto">
          <h2 style="color:#0D9488;margin-bottom:4px">New Contact Enquiry</h2>
          <p style="color:#999;font-size:13px;margin-bottom:24px">
            ${new Date(created_at).toLocaleString("en-SG", { timeZone: "Asia/Singapore" })}
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 0;color:#666;width:100px;font-size:14px">Name</td>
              <td style="padding:10px 0;font-weight:600;font-size:14px">${name}</td>
            </tr>
            <tr style="border-bottom:1px solid #eee">
              <td style="padding:10px 0;color:#666;font-size:14px">Email</td>
              <td style="padding:10px 0;font-size:14px">
                <a href="mailto:${email}" style="color:#0D9488">${email}</a>
              </td>
            </tr>
          </table>
          <div style="background:#f9f9f9;border-left:3px solid #0D9488;padding:16px 20px;border-radius:0 4px 4px 0">
            <p style="color:#444;font-size:14px;line-height:1.7;margin:0">${message.replace(/\n/g, '<br/>')}</p>
          </div>
          <p style="margin-top:24px;font-size:13px;color:#aaa">
            Reply directly to this email to respond to ${name}.
          </p>
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
