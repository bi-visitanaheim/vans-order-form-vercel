// api/submissions.js
//
// POST -> save one guest submission (no auth needed — guests use this),
//         then best-effort email a confirmation to the guest. The save
//         always succeeds or fails independently of the email — a guest's
//         order is never lost just because an email hiccups.
// GET  -> list all submissions (requires ?code=... matching TEAM_ACCESS_CODE,
//         checked server-side, never shipped to the browser)
//
// Requires a Vercel KV database connected to this project:
// Vercel dashboard -> your project -> Storage tab -> Create Database -> KV
// -> Connect to Project. Vercel auto-injects the KV_* env vars once connected.
//
// Confirmation email requires a SendGrid account (sendgrid.com, free tier
// is plenty for this): add SENDGRID_API_KEY as an environment variable, and
// CONFIRMATION_FROM_EMAIL set to a "Single Sender" you've verified in
// SendGrid (Settings -> Sender Authentication -> Single Sender
// Verification). This does NOT require DNS access, just clicking a
// verification link sent to that address — much simpler than full domain
// authentication, at a small cost to spam-filter deliverability.
//
// Internal team notification (separate from the guest confirmation) is
// OFF by default — only sends if INTERNAL_NOTIFY_EMAIL is set. Not needed
// for a big event like CDX, but useful for one-off submissions so nobody
// misses an order. Set it to a real address when you want it on.

import { kv } from "@vercel/kv";

// This should match wherever this app actually ends up living — update it
// if the live URL ever changes, since the email's font reference depends on it.
const SITE_URL = "https://vans-order-form-vercel.vercel.app";

async function sendConfirmationEmail(entry) {
  if (!process.env.SENDGRID_API_KEY || !entry.guestEmail) return;

  const fromAddress = process.env.CONFIRMATION_FROM_EMAIL;
  if (!fromAddress) return;
  const html = `
    <!--[if mso]>
    <style>h1, .brand-font { font-family: Arial, sans-serif !important; }</style>
    <![endif]-->
    <style>
      @font-face{
        font-family:'Sharp Sans Display No2';
        src:url('${SITE_URL}/fonts/SharpSansDispNo2.woff2') format('woff2'),
            url('${SITE_URL}/fonts/SharpSansDispNo2.woff') format('woff');
        font-weight:normal; font-style:normal;
      }
    </style>
    <div style="font-family:Arial,sans-serif; color:#125C60; max-width:480px; margin:0 auto;">
      <div style="text-align:center; margin-bottom:8px;">
        <img src="data:image/png;base64,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" width="52" height="52" alt="Visit Anaheim" style="display:inline-block;">
      </div>
      <p style="text-align:center; font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#43A3A3; font-weight:bold;">Visit Anaheim &times; Vans</p>
      <h1 class="brand-font" style="font-family:'Sharp Sans Display No2',Arial,sans-serif; font-size:24px; margin:0 0 12px; text-align:center;">You're in! Your design is on the list.</h1>
      <p>Hi ${entry.shipFirst || "there"},</p>
      <p>Thank you for taking the time to design your custom pair of Vans with us. Your design has been received and added to our master order list.</p>
      <p>We really appreciate you being part of this program. Here's a quick summary of what you submitted:</p>
      <div style="background:#F9F9F2; border:1px solid #B4D9E3; border-radius:4px; padding:16px 20px; margin:20px 0;">
        <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#43A3A3;">Your Order</p>
        <p style="margin:4px 0;"><strong>Shoe:</strong> ${entry.shoeStyle || "Not recorded"}</p>
        <p style="margin:4px 0;"><strong>Size:</strong> ${entry.shoeSize || "Not recorded"}</p>
        <p style="margin:4px 0;"><strong>Ship to:</strong> ${entry.shipFirst} ${entry.shipLast}</p>
        <p style="margin:4px 0;"><strong>Address:</strong> ${entry.address.line1}${entry.address.line2 ? ", " + entry.address.line2 : ""}, ${entry.address.city}, ${entry.address.state} ${entry.address.zip}</p>
        <p style="margin:4px 0;"><strong>Reference code:</strong> ${entry.id}</p>
      </div>
      <p>We're collecting everyone's designs and placing one consolidated order with Vans, so there's nothing more for you to do right now. Zelina and her team will be in touch directly once your order has shipped, with tracking information so you know exactly when to expect your kicks.</p>
      <p>Thanks again for being part of this. We can't wait for you to see the finished pair.</p>
      <p style="margin-top:24px;">Sincerely,<br>Visit Anaheim</p>
      <p style="color:#639393; font-size:13px; border-top:1px solid #B4D9E3; padding-top:12px; margin-top:24px;">Questions about your order? Reach out to Zelina Gore at <a href="mailto:zgore@visitanaheim.org" style="color:#43A3A3;">zgore@visitanaheim.org</a>.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: entry.guestEmail }] }],
        from: { email: fromAddress },
        reply_to: { email: "zgore@visitanaheim.org" },
        subject: "Your custom Vans design is on the list!",
        content: [{ type: "text/html", value: html }]
      })
    });
    if (!res.ok) {
      console.error("Confirmation email failed:", res.status, await res.text());
    }
  } catch (err) {
    // Swallow the error — a failed email should never affect the guest's
    // saved order or the response they see.
    console.error("Confirmation email failed:", err);
  }
}

async function sendInternalNotification(entry) {
  console.log("Internal notification check:", {
    hasApiKey: !!process.env.SENDGRID_API_KEY,
    hasNotifyEmail: !!process.env.INTERNAL_NOTIFY_EMAIL,
    hasFromEmail: !!process.env.CONFIRMATION_FROM_EMAIL
  });
  if (!process.env.SENDGRID_API_KEY || !process.env.INTERNAL_NOTIFY_EMAIL || !process.env.CONFIRMATION_FROM_EMAIL) {
    console.log("Internal notification skipped — one of the three above is false.");
    return;
  }

  const fromAddress = process.env.CONFIRMATION_FROM_EMAIL;
  const html = `
    <div style="font-family:Arial,sans-serif; color:#125C60; max-width:480px; margin:0 auto;">
      <p style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#43A3A3; font-weight:bold;">New Vans Custom Order Submission</p>
      <p style="margin:4px 0;"><strong>Client:</strong> ${entry.clientName} &middot; ${entry.clientCompany} &middot; ${entry.clientTitle}</p>
      <p style="margin:4px 0;"><strong>Ship to:</strong> ${entry.shipFirst} ${entry.shipLast}</p>
      <p style="margin:4px 0;"><strong>Address:</strong> ${entry.address.line1}${entry.address.line2 ? ", " + entry.address.line2 : ""}, ${entry.address.city}, ${entry.address.state} ${entry.address.zip}</p>
      <p style="margin:4px 0;"><strong>Email:</strong> ${entry.guestEmail || "Not provided"}</p>
      <p style="margin:4px 0;"><strong>Shoe:</strong> ${entry.shoeStyle || "Not recorded"}</p>
      <p style="margin:4px 0;"><strong>Size:</strong> ${entry.shoeSize || "Not recorded"}</p>
      <p style="margin:4px 0;"><strong>Reference code:</strong> ${entry.id}</p>
      <p style="margin:12px 0 4px;"><a href="${entry.designUrl}" style="color:#43A3A3;">View exact design &rarr;</a></p>
      <p style="color:#639393; font-size:13px; margin-top:16px;">This order still needs to be included in a bulk order to Vans. Don't let it get missed.</p>
    </div>
  `;

  try {
    const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.SENDGRID_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: process.env.INTERNAL_NOTIFY_EMAIL }] }],
        from: { email: fromAddress },
        subject: `New order: ${entry.shipFirst} ${entry.shipLast} (${entry.shoeStyle || "style not recorded"})`,
        content: [{ type: "text/html", value: html }]
      })
    });
    if (!res.ok) {
      console.error("Internal notification email failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Internal notification email failed:", err);
  }
}

export default async function handler(req, res) {
  if (req.method === "POST") {
    const entry = req.body;
    if (!entry || !entry.id) {
      return res.status(400).json({ error: "Missing entry id" });
    }
    await kv.set(`submission:${entry.id}`, JSON.stringify(entry));
    await sendConfirmationEmail(entry);
    await sendInternalNotification(entry);
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    const code = req.query.code;
    if (!code || code !== process.env.TEAM_ACCESS_CODE) {
      return res.status(401).json({ error: "Incorrect access code" });
    }
    const keys = await kv.keys("submission:*");
    if (keys.length === 0) {
      return res.status(200).json({ entries: [] });
    }
    // One batched round trip instead of one request per submission — matters
    // once you're at ~180 entries and the master sheet auto-refreshes.
    const values = await kv.mget(...keys);
    const entries = values
      .filter(Boolean)
      .map((v) => (typeof v === "string" ? JSON.parse(v) : v));
    entries.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    return res.status(200).json({ entries });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
