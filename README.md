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

## Deployment (Vercel)

1. Push to GitHub
2. Import into Vercel
3. Add `ANTHROPIC_API_KEY` as an environment variable
4. Deploy — HTTPS is required for GPS and PWA installation

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
