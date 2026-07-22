// api/submissions.js
//
// POST -> save one guest submission (no auth needed — guests use this)
// GET  -> list all submissions (requires ?code=... matching TEAM_ACCESS_CODE,
//         checked server-side, never shipped to the browser)
//
// Requires a Vercel KV database connected to this project:
// Vercel dashboard -> your project -> Storage tab -> Create Database -> KV
// -> Connect to Project. Vercel auto-injects the KV_* env vars once connected.

import { kv } from "@vercel/kv";

export default async function handler(req, res) {
  if (req.method === "POST") {
    const entry = req.body;
    if (!entry || !entry.id) {
      return res.status(400).json({ error: "Missing entry id" });
    }
    await kv.set(`submission:${entry.id}`, JSON.stringify(entry));
    return res.status(200).json({ ok: true });
  }

  if (req.method === "GET") {
    const code = req.query.code;
    if (!code || code !== process.env.TEAM_ACCESS_CODE) {
      return res.status(401).json({ error: "Incorrect access code" });
    }
    const keys = await kv.keys("submission:*");
    const entries = [];
    for (const key of keys) {
      const val = await kv.get(key);
      if (val) entries.push(typeof val === "string" ? JSON.parse(val) : val);
    }
    entries.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
    return res.status(200).json({ entries });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method not allowed" });
}
