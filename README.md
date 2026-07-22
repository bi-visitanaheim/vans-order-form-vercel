# Vans Custom Order Form — Vercel deployment (the working path)

This is the exact same app you've been testing — same form, same design,
same confetti thank-you screen, same everything — with a backend on Vercel
instead of Azure. Vercel's deployment model doesn't share the failure we
kept hitting on Azure Static Web Apps, so this should just work.

## Setup — about 10 minutes

### 1. Push these 3 items to a NEW GitHub repo (or a new folder in your existing one)
- `index.html`
- `api/submissions.js`
- `package.json`

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

### 5. Redeploy
Vercel usually prompts you to redeploy after adding the database/env var.
If not: **Deployments tab → click the "..." on the latest one → Redeploy**.

### 6. Test it for real
1. Open your live `https://your-project.vercel.app` URL.
2. Submit a test entry all the way through.
3. Scroll down, unlock the master sheet with your access code, confirm the
   test entry is there.
4. Open the same URL on a second device, confirm it shows up there too.

That's the whole thing — no workflow YAML to hand-edit, no Node runtime
pinning, no host.json, no separate storage account resource to link.
