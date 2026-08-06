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
// Confirmation email requires a Resend account (resend.com, free tier is
// plenty for this): add RESEND_API_KEY as an environment variable. Optional:
// CONFIRMATION_FROM_EMAIL (defaults to Resend's built-in sandbox sender,
// which works immediately with no domain setup, but reads as "onboarding@
// resend.dev" — verify your own domain in Resend later for a branded sender).

import { kv } from "@vercel/kv";

async function sendConfirmationEmail(entry) {
  if (!process.env.RESEND_API_KEY || !entry.guestEmail) return;

  const fromAddress = process.env.CONFIRMATION_FROM_EMAIL || "onboarding@resend.dev";
  const html = `
    <div style="font-family:Arial,sans-serif; color:#125C60; max-width:480px; margin:0 auto;">
      <p style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#43A3A3; font-weight:bold;">Visit Anaheim &times; Vans</p>
      <h1 style="font-size:22px; margin:0 0 12px;">You're in! Your design is on the list.</h1>
      <p>Hi ${entry.shipFirst || "there"},</p>
      <p>Your custom Vans design has been received. We're collecting everyone's designs and placing one consolidated order with Vans, so there's nothing more for you to do right now.</p>
      <div style="background:#F9F9F2; border:1px solid #B4D9E3; border-radius:4px; padding:16px 20px; margin:20px 0;">
        <p style="margin:0 0 8px; font-size:12px; text-transform:uppercase; letter-spacing:0.5px; color:#43A3A3;">Your Order</p>
        <p style="margin:4px 0;"><strong>Shoe:</strong> ${entry.shoeStyle || "Not recorded"}</p>
        <p style="margin:4px 0;"><strong>Size:</strong> ${entry.shoeSize || "Not recorded"}</p>
        <p style="margin:4px 0;"><strong>Ship to:</strong> ${entry.shipFirst} ${entry.shipLast}</p>
        <p style="margin:4px 0;"><strong>Reference code:</strong> ${entry.id}</p>
      </div>
      <p>We'll follow up separately with tracking information once your order has shipped.</p>
      <p style="color:#639393; font-size:13px;">Noticed a mistake in your order? Reach out to your program coordinator directly.</p>
    </div>
  `;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromAddress,
        to: entry.guestEmail,
        subject: "Your custom Vans design is on the list!",
        html
      })
    });
  } catch (err) {
    // Swallow the error — a failed email should never affect the guest's
    // saved order or the response they see.
    console.error("Confirmation email failed:", err);
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
