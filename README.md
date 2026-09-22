# City Highlights

A progressive web app (PWA) that generates city highlights powered by Claude AI and displays them on an interactive walking map. Works on iPhone 15 via Safari — add it to your Home Screen for an app-like experience.

## Features

- **AI-generated highlights** — type a city and get up to 8 curated spots with names and coordinates grounded in nearby geotagged Wikipedia places when available
- **Interactive map** — MapLibre GL + OpenFreeMap tiles, colour-coded pins by category
- **Real-time GPS** — your blue dot moves as you walk
- **Proximity alerts** — get notified when you're within 100m of a highlight
- **Background info on arrival** — bottom sheet with history, tips, opening hours, and entry fees
- **Apple Maps directions** — one tap to get walking directions
- **Cached highlights** — results are cached in the browser for 30 days and at the Cloudflare edge for 7 days; uncached generation is limited to 8 requests per minute per IP and edge location
- **Installable PWA** — add to iPhone Home Screen, works in standalone mode

## Setup

1. Create `.env.local`:
   ```bash
   printf 'ANTHROPIC_API_KEY=your-key-here\n' > .env.local
   ```

2. Install dependencies and start:
   ```bash
   npm install
   npm run dev
   ```

3. Open `http://localhost:3000`

## Deployment (Cloudflare Workers)

The `main` branch deploys through the Cloudflare Workers Builds integration connected to this GitHub repository. The repository also has a separate Cloudflare Pages integration; both report checks on pull requests.

1. Set the Anthropic key on the `city-highlights` Worker in the Cloudflare dashboard, or with an authenticated Wrangler session:
   ```bash
   npx wrangler secret put ANTHROPIC_API_KEY
   ```
2. Push to `main` or merge a pull request. Cloudflare builds and deploys the Worker.

### Manual deployment

```bash
npm run cf:deploy
```

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
