# Vans Custom Order Form — Vercel deployment (the working path)

This is the exact same app you've been testing — same form, same design,
same confetti thank-you screen, same everything — with a backend on Vercel
instead of Azure. Vercel's deployment model doesn't share the failure we
kept hitting on Azure Static Web Apps, so this should just work.

## Setup — about 10 minutes

### 1. Push these items to a NEW GitHub repo (or a new folder in your existing one)
- `index.html`
- `api/submissions.js`
- `package.json`
- `fonts/` (the whole folder, both files inside — this is the Sharp Sans brand font, hosted from your own site so both the app and the confirmation email can reference it)

Simplest: create a fresh repo (e.g. `vans-order-form-vercel`) via GitHub
Desktop, same way you did before — Add local repository → point at a folder
containing these 3 items → create repository → commit → publish.

### 2. Import it into Vercel
1. Go to vercel.com, log in (or sign up — it's free for this use case).
2. **Add New → Project → Import** your GitHub repo.
3. Vercel auto-detects everything. Click **Deploy**. No settings to configure.

This alone gets you a live URL in under a minute — though submissions won't
save yet, since there's no database connected.

### 3. Add the database (Vercel KV)
1. In your new Vercel project, click the **Storage** tab.
2. **Create Database → KV**.
3. Once created, click **Connect to Project** and select this project.

Vercel automatically wires up the environment variables the code needs —
nothing to copy or type in yourself for this part.

### 4. Set your access code
1. **Project Settings → Environment Variables → Add New**.
2. Name: `TEAM_ACCESS_CODE`
3. Value: whatever code you want your team to use (e.g. `KicksVIP26`)
4. Save.

### 5. Turn on guest confirmation emails
Guests now have an email field on the form. To actually send them a
confirmation, set up SendGrid, no DNS access needed at all:

1. Go to sendgrid.com, sign up (free tier is plenty for this).
2. **Settings → Sender Authentication → Single Sender Verification →
   Verify a Single Sender**.
3. Fill in the form using a real inbox you can check, e.g.
   `jpicou@visitanaheim.org` or `zgore@visitanaheim.org`. Submit.
4. Check that inbox for an email titled "Please Verify Your Single Sender,"
   click the verification link inside it.
5. Back in SendGrid: **Settings → API Keys → Create API Key** (Restricted
   Access is fine, just needs Mail Send permission). Copy the key.
6. In Vercel: **Project Settings → Environment Variables → Add New**, twice:
   - Name: `SENDGRID_API_KEY` → Value: the key you just copied
   - Name: `CONFIRMATION_FROM_EMAIL` → Value: the exact address you just
     verified in step 3

That's it, no DNS records, no waiting on IT. You can now send to any real
guest email address immediately.

**Worth knowing:** Single Sender Verification is genuinely simpler than
full domain authentication, but it's also a slightly weaker signal to spam
filters (no SPF/DKIM tied to it). For a one-day event this is a completely
reasonable tradeoff. If this becomes a recurring, larger-scale program
later, SendGrid's full Domain Authentication (which does need DNS access)
is the more bulletproof long-term option, worth revisiting then, not now.

If you skip this section entirely, everything else still works exactly the
same, the app just won't send confirmation emails. A guest's order always
saves regardless of whether the email sends successfully.

### 5b. (Optional) Turn on internal team notifications
Separate from the guest confirmation: an email to your own team every time
a submission comes in, useful for one-off situations (not a big event like
CDX) where you want to make sure nobody misses an order. Off by default.

1. Uses the same SendGrid setup as above, no second account needed.
2. In Vercel: **Project Settings → Environment Variables → Add New**:
   - Name: `INTERNAL_NOTIFY_EMAIL`
   - Value: the address that should get notified

**For testing right now**, set this to `pqestl@gmail.com`. When you're
ready to actually use this for real one-off orders, change the value to
`zgore@visitanaheim.org` (Zelina) and redeploy. Just leave it unset, or
delete it, any time you don't want this email going out at all.

### 6. Redeploy
Vercel usually prompts you to redeploy after adding the database/env var.
If not: **Deployments tab → click the "..." on the latest one → Redeploy**.

### 7. Test it for real
1. Open your live `https://your-project.vercel.app` URL.
2. Submit a test entry all the way through, using a real email address you
   can check.
3. Confirm the email actually arrives (check spam the first time, sandbox
   sender addresses sometimes land there).
4. Scroll down, unlock the master sheet with your access code, confirm the
   test entry is there, with the email address showing correctly.
5. Open the same URL on a second device, confirm it shows up there too.

That's the whole thing — no workflow YAML to hand-edit, no Node runtime
pinning, no host.json, no separate storage account resource to link.
