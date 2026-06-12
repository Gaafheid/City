# Native Betting App — Architectuurplan

## Context

Een volledig nieuwe native mobile betting/prediction-market app — vergelijkbaar met Polymarket qua openheid maar met de souplesse van Betcity/Unibet. Gebruikers kunnen echte wedden aangaan (gestort geld, geen leningen/crypto), open markten aanmaken, en ook bragging-rights wedden doen zonder monetair component. KYC-verificatie blokkeert geldstortingen totdat identiteit + leeftijd (18+) automatisch is geverifieerd.

**Volledig nieuwe repo — de huidige City PWA wordt niet hergebruikt.**

---

## Tech Stack

| Laag | Keuze | Reden |
|---|---|---|
| Mobile | **Expo 52 (React Native)** + Expo Router | Cross-platform iOS + Android; goede ecosystem voor Stripe/Persona/Supabase |
| Backend | **Next.js 15** (nieuw, op Cloudflare Workers) | Serverless, edge-ready, TypeScript native |
| Database | **Supabase** (PostgreSQL + RLS + Realtime) | ACID-transacties, Row-Level Security ingebakken, Realtime voor live odds, SOC 2 gecertificeerd |
| Auth | **Supabase Auth** (username + wachtwoord voor Tier 1; email toegevoegd bij KYC-upgrade) | Supabase vereist intern een email; gebruiken we `<username>@internal.betting-app` als placeholder tot user echte email opgeeft bij KYC |
| KYC | **iDIN** (primair, NL) + **Persona** (fallback) | iDIN = geautomatiseerde identiteitscheck via de eigen bank van de gebruiker (zelfde infra als iDEAL); Persona voor niet-NL gebruikers of als fallback |
| Payments | **Mollie** (primair voor NL) | Nederlands bedrijf, native iDEAL + Wero support, developer-friendly; Adyen als alternatief bij schaal |
| Real-time | **Supabase Realtime** | Live odds-updates via PostgreSQL replication, geen aparte socket server |
| AI (marktvoorstellen) | **Claude API** (claude-haiku-4-5) | Goedkoop, snel, goed in gestructureerde output voor markt-templates |

### Noot over Mollie vs. Stripe vs. Adyen

**Alle drie vereisen expliciete goedkeuring voor gambling/betting.** De betaallaag is in de code geabstraheerd achter een `PaymentProvider`-interface zodat wisselen van provider geen API-wijzigingen veroorzaakt.

| Provider | Pro | Con |
|---|---|---|
| **Mollie** (primair) | NL bedrijf, native iDEAL + Wero, lage drempel, goede DX | Kleinere global footprint |
| **Stripe** | Uitstekende DX, wereldwijd, iDEAL via Stripe Elements, goede docs | Gambling op restricted list — goedkeuring vereist; US-bedrijf |
| **Adyen** | NL (Amsterdam), enterprise-grade, KSA-vertrouwd | Hoge minimumvolumes, complexere onboarding |

- **iDEAL → Wero**: iDEAL wordt eind 2027 uitgefaseerd. Wero rolt in 2026 uit in NL. Mollie is al Wero Principal Member.
- **MVP**: Start met Mollie + iDEAL. Stripe is een gelijkwaardige fallback als Mollie gambling niet goedkeurt. Voeg Wero toe zodra beschikbaar in NL (2026).

### Noot over Immuto (Brevis Studios)
Immuto van Brevis Studios is een **admin panel / data management tool** — geen database of ledger systeem. Dit is niet relevant als database-laag. Wel interessant als intern beheerinterface voor markten/resoluties mocht dat gewenst zijn later.

Voor een immutable audit-trail (nuttig voor KSA-compliance) is **immudb** (open-source, andere maker) een optie als aanvulling op Supabase. Niet als vervanging.

---

## Repo Structuur (volledig nieuw)

```
betting-app/
├── apps/
│   ├── mobile/                 # Expo React Native app
│   │   ├── app/                # Expo Router (file-based)
│   │   │   ├── (auth)/         # Onboarding, login, register, KYC flow
│   │   │   ├── (tabs)/         # Discover, My Bets, Wallet, Groups
│   │   │   └── market/[id]/    # Market detail + bet placement
│   │   ├── components/
│   │   ├── hooks/
│   │   └── lib/
│   │       └── supabase.ts     # Supabase browser client + Realtime
│   └── api/                    # Next.js 15 backend (Cloudflare Workers)
│       ├── src/app/api/
│       │   ├── kyc/
│       │   │   ├── start/route.ts       # POST: Persona inquiry aanmaken
│       │   │   └── webhook/route.ts     # POST: Persona webhook handler
│       │   ├── payments/
│       │   │   ├── deposit/route.ts     # POST: Mollie payment session
│       │   │   ├── withdraw/route.ts    # POST: Mollie payout naar IBAN
│       │   │   └── webhook/route.ts     # POST: Mollie webhook handler
│       │   ├── markets/
│       │   │   ├── route.ts             # GET browse / POST create
│       │   │   └── [id]/
│       │   │       ├── route.ts         # GET detail
│       │   │       └── resolve/route.ts # POST (admin only)
│       │   ├── bets/
│       │   │   └── place/route.ts       # POST atomische bet placement
│       │   └── suggestions/
│       │       └── route.ts             # GET AI-voorgestelde markten (Claude)
│       └── src/lib/
│           ├── supabase.ts              # Supabase service-role client
│           ├── mollie.ts                # Mollie client + webhook verify
│           └── persona.ts              # Persona SDK wrapper
├── packages/
│   └── shared/
│       └── types.ts                    # Gedeelde TypeScript types
├── supabase/
│   └── migrations/                     # SQL migraties
└── package.json                        # Turborepo workspace config
```

---

## Database Schema (PostgreSQL via Supabase)

```sql
-- Uitbreiding van Supabase auth.users
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  full_name TEXT,
  date_of_birth DATE,
  country TEXT,                          -- 'NL' | 'US' | etc.
  kyc_status TEXT DEFAULT 'unverified',  -- unverified | pending | verified | rejected
  kyc_persona_inquiry_id TEXT,
  kyc_verified_at TIMESTAMPTZ,
  is_banned BOOLEAN DEFAULT FALSE,
  deposit_limit_cents_weekly BIGINT,     -- verantwoord gokken (KSA-vereiste)
  self_excluded_until TIMESTAMPTZ,       -- CRUKS / zelf-uitsluiting
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles UNIQUE NOT NULL,
  balance_cents BIGINT DEFAULT 0,        -- altijd in eurocenten, nooit negatief
  currency TEXT DEFAULT 'EUR'
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets NOT NULL,
  amount_cents BIGINT NOT NULL,          -- negatief = debit
  type TEXT NOT NULL,                    -- deposit | withdrawal | bet_escrow | payout | fee
  status TEXT DEFAULT 'pending',         -- pending | completed | failed
  mollie_payment_id TEXT,
  mollie_payout_id TEXT,
  reference_id UUID,                     -- FK naar bets.id of markets.id
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,                         -- sports | politics | entertainment | friends | other
  status TEXT DEFAULT 'draft',           -- draft | open | closed | resolved | cancelled
  is_monetary BOOLEAN DEFAULT TRUE,      -- false = bragging rights only
  resolution_method TEXT DEFAULT 'admin',-- admin | creator | community_vote
  close_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  winning_option_id UUID,
  total_pool_cents BIGINT DEFAULT 0,
  platform_fee_pct NUMERIC(5,4) DEFAULT 0.02,  -- 2% marge
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE market_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets NOT NULL,
  title TEXT NOT NULL,
  total_staked_cents BIGINT DEFAULT 0,
  sort_order INT DEFAULT 0
);

CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles NOT NULL,
  market_id UUID REFERENCES markets NOT NULL,
  option_id UUID REFERENCES market_options NOT NULL,
  amount_cents BIGINT NOT NULL,
  status TEXT DEFAULT 'active',          -- active | won | lost | refunded
  payout_cents BIGINT,
  placed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles NOT NULL,
  invite_code TEXT UNIQUE DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE group_members (
  group_id UUID REFERENCES friend_groups,
  user_id UUID REFERENCES profiles,
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE group_markets (
  group_id UUID REFERENCES friend_groups,
  market_id UUID REFERENCES markets,
  PRIMARY KEY (group_id, market_id)
);

CREATE TABLE suggested_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  source TEXT DEFAULT 'editorial',       -- ai_generated | editorial | trending
  is_active BOOLEAN DEFAULT TRUE,
  times_launched INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**RLS policies** op elke tabel: gebruikers zien/muteren alleen hun eigen data. Admin-acties vereisen service-role key of aparte `admin_users` check.

---

## Kernflows

### 1. Onboarding — Progressief (geen drempel)

**Tier 1 — Bragging rights (direct toegankelijk):**
- Registreer met username + wachtwoord (geen email vereist)
- Toegang tot alle niet-monetaire markten en friend groups
- Geen KYC, geen betaalgegevens

**Tier 2 — Echt geld (KYC-gated, zo minimaal mogelijk automatisch):**

> **Wettelijk kader NL:** De WWFT vereist CDD (Customer Due Diligence) vóór eerste storting. Er is géén drempelbedrag voor online gokken — ook €1 vereist verificatie. Maar: de verificatie mag volledig geautomatiseerd zijn; er is geen menselijke review vereist.

**Strategie: minimale KYC via iDIN (geen documenten uploaden)**

1. Bij "Geld storten" → user kiest bank (iDIN-scherm, zelfde look als iDEAL)
2. Bankapp opent → gebruiker bevestigt met Face ID / pincode
3. Bank stuurt geautomatiseerd terug: naam, geboortedatum, adres → direct `kyc_status = 'verified'`
4. Kosten: ~€0,30–€0,50 per check (vs. €1–3 voor document-verificatie)
5. Volledig geautomatiseerd, geen upload, geen wachttijd, geen menselijke review

**Wanneer wél Persona (document-verificatie)?**
- Gebruiker heeft geen iDIN-ondersteunende bank (niet-NL bank, jonge bank)
- Fallback bij iDIN-fout
- Buitenlandse gebruikers (Fase 2+)

**iDIN levert:**
- Volledige naam ✓
- Geboortedatum (→ 18+ check) ✓
- Adres ✓
- Bankrelatie-verificatie (sterk bewijs van identiteit) ✓
- Geen BSN tenzij expliciet gevraagd (privacy-vriendelijk)

**iDIN integratie:**
- Via Mollie (Mollie ondersteunt iDIN natively als betaalmethode)
- Of via iDIN.nl direct (open bank API)
- `POST /api/kyc/idin/start` → redirect naar bank → callback → webhook → `kyc_status = 'verified'`

Dit scheidt de twee doelgroepen duidelijk: vrienden die gratis wedden vs. serieuze gebruikers met echt geld, waarbij verificatie voor die laatste groep zo snel mogelijk is (< 30 seconden via bankapp).

### 2. Wallet & Deposit (Mollie)
1. Geverifieerde user tikt "Storten" → voert bedrag in
2. `POST /api/payments/deposit` → server maakt Mollie payment session aan (iDEAL)
3. Expo opent Mollie checkout via `WebBrowser`
4. Bij succesvolle betaling → Mollie webhook → `/api/payments/webhook`
5. Webhook verifieert Mollie signature, crediteert `wallets.balance_cents`, schrijft `transactions`
6. **Uitbetaling**: user voert IBAN in → server maakt Mollie Payout aan naar IBAN op naam

### 3. Bet Placement (atomisch)
`POST /api/bets/place` voert één PostgreSQL transactie uit:
```sql
BEGIN;
  SELECT balance_cents FROM wallets WHERE user_id = $1 FOR UPDATE;
  -- validaties: balance >= amount, market open, user niet gebanned/uitgesloten
  UPDATE wallets SET balance_cents = balance_cents - $amount WHERE user_id = $1;
  INSERT INTO transactions (type='bet_escrow', ...);
  INSERT INTO bets (...);
  UPDATE market_options SET total_staked_cents = total_staked_cents + $amount;
  UPDATE markets SET total_pool_cents = total_pool_cents + $amount,
    status = CASE WHEN status = 'draft' THEN 'open' ELSE status END;
COMMIT;
```
Nooit client-side balance vertrouwen.

### 4. Parimutuel Odds
- Impliciete kans: `option_staked / total_pool`
- Payout multiplier: `(total_pool × (1 - fee)) / option_staked`
- Weergegeven als: "Zet €10 → win ~€X" — live bijgewerkt via Supabase Realtime

### 5. Settlement
Admin (of creator, afhankelijk van `resolution_method`) roept `POST /api/markets/[id]/resolve` aan:
1. Set `markets.status = 'resolved'`, `winning_option_id`
2. Bereken payout per winnende bet: `(bet_amount / winning_staked) × total_pool × (1 - fee)`
3. Crediteer wallets in één batch-transactie
4. Stuur push notificaties via Expo Notifications

### 6. Bragging Rights Modus
Markets met `is_monetary = FALSE`: geen wallet-interactie, geen Mollie, geen KYC vereist. Deelname vrij. Leaderboard per friend group op basis van trefpercentage.

### 7. Voorgestelde Markten (Claude)
Cloudflare Cron trigger → `GET /api/suggestions` → Claude haiku genereert 10-20 markt-templates in JSON → opgeslagen in `suggested_markets`. Gaan live zodra iemand er geld op inzet.

---

## Business Model & Liquiditeitsrisico

### Hoe verdienen we geld zonder eigen risicokapitaal?

**Parimutuel (peer-to-peer pool) model — de sleutel:**
Het platform neemt **nooit** zelf de andere kant van een weddenschap in. Gebruikers wedden *tegen elkaar*, niet tegen het huis. Het platform is puur escrow + marktplaats.

```
Voorbeeld: 100 mensen zetten €10 → pool = €1.000
Platform-fee (2%) = €20 direct "verdiend"
Winnende partij ontvangt: €1.000 − €20 = €980 (verdeeld naar rato)
Platform-exposure: €0
```

### Hoe voorkomen we dat het platform met eigen geld bijspringt?

1. **Geen krediet, nooit** — server-side check `balance_cents >= bet_amount_cents` vóór elke bet. Als er niet genoeg saldo is, wordt de bet geweigerd. Nooit een negatief saldo mogelijk.

2. **Escrow bij plaatsing** — zodra een bet geplaatst wordt, gaat het bedrag direct naar `type='bet_escrow'`. Het is onttrokken aan het saldo van de user; ze kunnen het niet opnemen zolang de markt open is.

3. **Settlement betaalt zich zelf terug** — uitbetalingen bij resolutie komen *volledig* uit de geëscrowde pool. Het platform betaalt alleen de 2% fee aan zichzelf uit vanuit diezelfde pool. Er is geen extra liquiditeit nodig.

4. **Geen uitbetaling vóór deposit-confirmatie** — Mollie-webhook moet `status = 'paid'` teruggeven vóórdat `wallets.balance_cents` gecrediteerd wordt. Nooit optimistisch saldo toekennen.

5. **Annulering = volledige terugbetaling** — als een markt geannuleerd wordt, gaan alle escrowed bedragen 1-op-1 terug naar de wallets van de betters. Platform houdt dan geen fee in.

### Inkomstenstromen (platform, zonder risico)

| Bron | Bedrag | Risico |
|---|---|---|
| Rake per markt | 2% van de pool bij settlement | Nul — altijd kleiner dan totale pool |
| Premium markten (toekomst) | Vaste vergoeding per premium markt | Nul |
| Promoted markets (toekomst) | Adverteerders betalen voor zichtbaarheid | Nul |

### Risicobeheersing — chargeback (iDEAL)
iDEAL heeft vrijwel geen chargebacks (bank-to-bank bevestiging). Mocht een chargeback toch voorkomen:
- Account wordt direct gesuspendeerd
- Openstaande bets worden geannuleerd + pool teruggestort naar andere betters
- Verlies voor platform = maximaal 2% fee die al uitbetaald was (acceptabel)

---

## Compliance — Kritisch

**Nederland (KSA):**
- **KOA-vergunning** vereist vóór lancering met echt geld
- **CRUKS-koppeling** verplicht (check bij elke login op zelf-uitsluiting)
- Verplichte instelbare stortingslimieten (dag/week/maand)
- Uitbetalingen exclusief naar IBAN op naam van geregistreerde gebruiker (afdwingen via Mollie)
- Leeftijd 18+ via Persona KYC

**USA:**
- Voorspellingsmarkten (non-sport) onder CFTC als "event contracts" (Kalshi-precedent 2024)
- Sportgokken: state-by-state licenties — **niet voor MVP**
- **Aanbeveling**: Start NL-only. US toevoegen in fase 2 na juridische review.

**AML:**
- Transacties >€2.000/maand → verhoogde monitoring
- Meldplicht FIU-Nederland voor ongebruikelijke transacties

---

## Implementatiefasen

| Fase | Inhoud | Duur |
|---|---|---|
| **1 — Bragging Rights MVP** | Turborepo setup, Supabase schema + migraties, username/wachtwoord auth, markt aanmaken, bets plaatsen (niet-monetair), friend groups, invite links, leaderboard | 4 weken |
| **2 — Geld & KYC** | Persona KYC-flow (Tier 2 onboarding), Mollie iDEAL deposit, wallet, atomische bet placement, live odds via Realtime | 4 weken |
| **3 — Resolutie & Uitbetaling** | Admin resolutie panel, settlement-logica, uitbetaling naar IBAN, markt-browser met filtering | 3 weken |
| **4 — Discovery** | AI-voorgestelde markten (Claude), push notificaties, Wero toevoegen | 3 weken |
| **5 — Compliance** | CRUKS-integratie, stortingslimieten, geo-blocking, zelf-uitsluiting, KSA-dossier | 6 weken + juridisch |

**MVP = Fase 1** — volledig functionerende bragging-rights app om gebruikers te werven vóórdat geld nodig is.

---

## Verificatie

- **Unit**: wallet-mutatiefuncties (jest), odds-berekening
- **Integration**: bet placement + settlement end-to-end (Supabase local + Mollie test mode)
- **KYC**: iDIN testomgeving (gratis beschikbaar via iDIN.nl); Persona sandbox als fallback
- **Payments**: Mollie test mode — €10 storten → wedden → resolutie → uitbetaling naar IBAN
- **E2E mobile**: Expo + Detox — golden path: registreren → KYC → storten → wedden → winnen
- **Security**: handmatige poging om via API balance te manipuleren (moet falen door server-side lock)
