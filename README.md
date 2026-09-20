# Road to nationals

A training app for a 1500m runner: daily routine, running plan, strength, stretching,
backflip progressions, skincare and progress records.

It's a web app you add to your iPhone home screen. It works offline, and once you sign in
your data saves to Supabase so it follows you to any device.

- **Frontend:** plain HTML, CSS and JavaScript. No build step, no framework.
- **Backend:** Supabase (email + password auth, one Postgres row per user, live sync).
- **Hosting:** Vercel, deployed straight from GitHub.

## Setup

### 1. Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste everything in [`supabase/schema.sql`](supabase/schema.sql), and run it.
3. Go to **Authentication → Sign In / Providers → Email** and turn **Confirm email** off
   while you're testing, so you can sign in straight away.
4. Go to **Project Settings → API keys** and copy the **Project URL** and the **anon public** key.
5. Paste both into `public/config.js`:

   ```js
   window.APP_CONFIG = {
     SUPABASE_URL: "https://xxxxxxxx.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi..."
   };
   ```

The anon key is meant to be public — it's safe in GitHub. Row Level Security is what keeps
your data private: the policies in `schema.sql` mean a signed-in user can only read and write
their own row. Never put the **service role** key in this project.

### 2. GitHub

```bash
cd road-to-nationals
git init
git add .
git commit -m "Road to nationals training app"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/road-to-nationals.git
git push -u origin main
```

### 3. Vercel

1. Sign in to [vercel.com](https://vercel.com) with GitHub.
2. **Add New → Project**, import the repo, and deploy. No settings to change — `vercel.json`
   already points at the `public` folder.
3. Copy your live URL, something like `https://road-to-nationals.vercel.app`.

Every `git push` to `main` redeploys automatically.

### 4. Add it to your iPhone

1. Open the Vercel URL in **Safari** (this doesn't work from Chrome on iOS).
2. Tap the **Share** button, then **Add to Home Screen**.
3. Open it from the home screen. It runs full screen with no browser chrome, and keeps you
   signed in.

## How syncing works

Every change is written to `localStorage` first, so the app never waits on the network and
works fully offline. When you're signed in, changes push to Supabase about a second later.

Each device also keeps a timestamp per section. When two devices have both been used offline,
`sync.js` merges them:

- **Checklists** (daily ticks, skincare, stretching, backflip levels) — the most recent change wins.
- **Logs** (1500m times, push-up records, lifted sets) — entries are merged by id, so nothing
  is ever lost.

Supabase Realtime pushes changes between devices live, and the app also re-syncs whenever you
bring it back to the foreground.

## Files

```
public/
  index.html      markup and the tab bar
  styles.css      the glass look, light and dark
  app.js          the training plan, all tabs, rendering
  sync.js         storage, merging, Supabase auth and sync
  config.js       your Supabase URL and anon key
  sw.js           service worker, caches the app for offline use
  manifest.webmanifest
  icons/
supabase/
  schema.sql      table, RLS policies, realtime
vercel.json
```

## Changing the plan

The training content is data at the top of `public/app.js`:

- `PLAN` — the seven-day running week
- `STRENGTH` — Strength X and Strength Y
- `STRETCH` — warm-up and cool-down
- `FLIP` — backflip progression levels
- `SKIN` / `WEEKLY` — skincare routines

Edit those arrays, push, and Vercel redeploys. If you change any file in `public/`, bump
`CACHE` in `sw.js` (for example `rtn-v2`) so phones pick up the new version instead of the
cached one.
