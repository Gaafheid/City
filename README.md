# City Highlights

A progressive web app (PWA) that generates city highlights powered by Claude AI and displays them on an interactive walking map. Works on iPhone 15 via Safari — add it to your Home Screen for an app-like experience.

## Features

- **AI-generated highlights** — type any city and get 12 curated spots (monuments, museums, parks, viewpoints, etc.) with rich background info
- **Interactive map** — MapLibre GL + OpenFreeMap tiles, colour-coded pins by category
- **Real-time GPS** — your blue dot moves as you walk
- **Proximity alerts** — get notified when you're within 100m of a highlight
- **Background info on arrival** — bottom sheet with history, tips, opening hours, and entry fees
- **Apple Maps directions** — one tap to get walking directions
- **30-day local cache** — generated highlights are cached per city, no repeated API calls
- **Installable PWA** — add to iPhone Home Screen, works in standalone mode

## Setup

1. Copy the env template:
   ```bash
   cp .env.local.example .env.local
   ```

2. Add your Anthropic API key to `.env.local`:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

3. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

4. Open `http://localhost:3000`

## Deployment (Cloudflare Pages)

Uses [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) — the officially recommended adapter.

### Via Cloudflare Pages dashboard (recommended)

1. Push this repo to GitHub
2. In [Cloudflare Pages](https://pages.cloudflare.com), create a new project linked to the repo
3. Set build settings:
   - **Build command**: `npm run cf:build`
   - **Build output directory**: `.open-next/assets`
   - **Compatibility flags**: `nodejs_compat`
4. Add `ANTHROPIC_API_KEY` as an environment variable under Settings → Environment variables
5. Deploy

### Via CLI

```bash
npm run cf:build          # builds for Cloudflare Workers
npx wrangler pages deploy # deploys to your Cloudflare account
```

Add `ANTHROPIC_API_KEY` in the Cloudflare dashboard under Workers & Pages → your project → Settings → Environment Variables.

### Local preview

```bash
npm run cf:preview        # builds + runs locally via wrangler
```

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **MapLibre GL JS** + OpenFreeMap tiles (free, no API key)
- **Claude API** (Anthropic) via tool_use for structured highlight generation
- **Tailwind CSS v4**
- **Zod** for server-side validation

## iPhone Usage

1. Open the deployed URL in Safari
2. Tap the Share button → "Add to Home Screen"
3. Open the app from your Home Screen
4. Type a city and tap "Find Highlights"
5. Tap the location button (🔍) to start GPS tracking
6. Walk around — tap any pin for info, or wait for the proximity banner to appear
