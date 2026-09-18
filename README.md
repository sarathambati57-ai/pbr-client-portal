# PBR Client Portal

## What's already done for you
- Database schema (you already ran this in Supabase — schema.sql)
- Full login system (admin + client, with each client only seeing their own work)
- Admin: dashboard, client management (create client + auto-generated login), upload work
- Client: dashboard, review page (Approve / Request Changes with mandatory remarks)
- Version control: uploading a revised version replaces the old file automatically
- File deletion rules: approved files auto-delete 2 days after approval; rejected files
  delete the moment you upload the fix
- Email notifications: client gets emailed on new work, admin gets emailed on
  approval/rejection with full remarks

## One-time setup on your laptop

### 1. Open the project
Unzip this folder, open it in VS Code.

### 2. Install the packages
Open a terminal inside VS Code (Terminal -> New Terminal) and run:
```
npm install
```

### 3. Add your real keys
Find the file `.env.local.example`. Make a copy of it, rename the copy to `.env.local`,
and fill in the real values:
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — from Supabase
  -> Settings -> API -> "Publishable and secret API keys" tab
- `SUPABASE_SECRET_KEY` — same page, the secret key (starts with sb_secret_)
- `RESEND_API_KEY` — from resend.com -> API Keys (create one if you haven't)
- `ADMIN_EMAIL` — already set to pbrdigitalservices@gmail.com
- `CRON_SECRET` — make up any random long string, e.g. pbr-cron-8x92kd

Never share `.env.local` or paste its contents anywhere public — it's already
excluded from Git so it won't accidentally get uploaded to GitHub.

### 4. Run it locally to test
```
npm run dev
```
Open http://localhost:3000 in your browser.

### 5. Create your own admin login
Since there's no signup page (on purpose — only you control who gets in), create your
admin account directly in Supabase:
1. Supabase -> Authentication -> Users -> Add user -> enter your email + a password
   -> tick "Auto confirm user"
2. Supabase -> Table Editor -> profiles table -> Insert row:
   - id: copy the UUID of the user you just created (from the Authentication page)
   - role: admin
   - full_name: your name
   - email: same email
   - leave client_id empty
3. Now log in at /login with that email/password — you'll land on the admin dashboard.

### 6. Set up sending emails (Resend)
Resend's free tier requires a verified domain to send from a custom address. Until you
have a domain connected in Resend, open lib/email.ts and change:
```
const FROM = "PBR Client Portal <notifications@yourdomain.com>";
```
to:
```
const FROM = "PBR Client Portal <onboarding@resend.dev>";
```
This works immediately with no setup, but only for testing — before going live, connect
your real domain in Resend and switch this back.

## Deploying it live (Vercel)

1. Push this project to a GitHub repo (VS Code has a built-in "Publish to GitHub" button
   in the Source Control tab — no command line needed)
2. Go to vercel.com -> Add New Project -> import that GitHub repo
3. Before clicking Deploy, add all the same values from your .env.local under
   Environment Variables
4. Add one more: NEXT_PUBLIC_SITE_URL = your future Vercel URL
   (e.g. https://pbr-portal.vercel.app) — you'll know this after the first deploy,
   so deploy once, copy the URL, then edit this variable and redeploy
5. Click Deploy

The daily cleanup job (vercel.json) runs automatically once deployed — no extra setup.

## What's intentionally left for later (as agreed)
- WhatsApp notifications
- Admin notification settings page (toggle which emails you get)
- Calendar, billing, analytics
- File download permission toggle (the allow_download column already exists in the
  database for this — just not wired into the UI yet)

## If something breaks
Most errors will show in:
- The browser console (right-click page -> Inspect -> Console tab)
- The terminal where npm run dev is running
Paste either of those back to me and I'll help you fix it.
