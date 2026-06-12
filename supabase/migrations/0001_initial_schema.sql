-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  date_of_birth DATE,
  country TEXT,
  kyc_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (kyc_status IN ('unverified', 'pending', 'verified', 'rejected')),
  kyc_persona_inquiry_id TEXT,
  kyc_verified_at TIMESTAMPTZ,
  is_banned BOOLEAN NOT NULL DEFAULT FALSE,
  deposit_limit_cents_weekly BIGINT,
  self_excluded_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public usernames are readable by all authenticated users (for leaderboards)
CREATE POLICY "Authenticated users can read usernames"
  ON profiles FOR SELECT USING (auth.role() = 'authenticated');

-- ─── wallets ──────────────────────────────────────────────────────────────────
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles UNIQUE NOT NULL,
  balance_cents BIGINT NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR'
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet"
  ON wallets FOR SELECT USING (auth.uid() = user_id);

-- ─── transactions ─────────────────────────────────────────────────────────────
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID REFERENCES wallets NOT NULL,
  amount_cents BIGINT NOT NULL,
  type TEXT NOT NULL
    CHECK (type IN ('deposit', 'withdrawal', 'bet_escrow', 'payout', 'fee')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed')),
  mollie_payment_id TEXT,
  mollie_payout_id TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own transactions"
  ON transactions FOR SELECT
  USING (wallet_id IN (SELECT id FROM wallets WHERE user_id = auth.uid()));

-- ─── markets ──────────────────────────────────────────────────────────────────
CREATE TABLE markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES profiles NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT
    CHECK (category IN ('sports', 'politics', 'entertainment', 'friends', 'other')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft', 'open', 'closed', 'resolved', 'cancelled')),
  is_monetary BOOLEAN NOT NULL DEFAULT FALSE,
  resolution_method TEXT NOT NULL DEFAULT 'creator'
    CHECK (resolution_method IN ('admin', 'creator', 'community_vote')),
  close_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  winning_option_id UUID,
  total_pool_cents BIGINT NOT NULL DEFAULT 0,
  platform_fee_pct NUMERIC(5,4) NOT NULL DEFAULT 0.02,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can browse open markets
CREATE POLICY "Authenticated users can read open markets"
  ON markets FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create markets"
  ON markets FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their markets"
  ON markets FOR UPDATE
  USING (auth.uid() = creator_id AND status NOT IN ('resolved', 'cancelled'))
  WITH CHECK (auth.uid() = creator_id);

-- ─── market_options ───────────────────────────────────────────────────────────
CREATE TABLE market_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id UUID REFERENCES markets ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  total_staked_cents BIGINT NOT NULL DEFAULT 0,
  sort_order INT NOT NULL DEFAULT 0
);

ALTER TABLE market_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market options"
  ON market_options FOR SELECT USING (auth.role() = 'authenticated');

-- ─── bets ─────────────────────────────────────────────────────────────────────
CREATE TABLE bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles NOT NULL,
  market_id UUID REFERENCES markets NOT NULL,
  option_id UUID REFERENCES market_options NOT NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'won', 'lost', 'refunded')),
  payout_cents BIGINT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bets"
  ON bets FOR SELECT USING (auth.uid() = user_id);

-- ─── friend_groups ────────────────────────────────────────────────────────────
CREATE TABLE friend_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  creator_id UUID REFERENCES profiles NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(6), 'hex'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE friend_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read groups"
  ON friend_groups FOR SELECT
  USING (
    id IN (SELECT group_id FROM group_members WHERE user_id = auth.uid())
    OR creator_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create groups"
  ON friend_groups FOR INSERT WITH CHECK (auth.uid() = creator_id);

-- ─── group_members ────────────────────────────────────────────────────────────
CREATE TABLE group_members (
  group_id UUID REFERENCES friend_groups ON DELETE CASCADE,
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, user_id)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can see group membership"
  ON group_members FOR SELECT
  USING (user_id = auth.uid() OR group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

-- ─── group_markets ────────────────────────────────────────────────────────────
CREATE TABLE group_markets (
  group_id UUID REFERENCES friend_groups ON DELETE CASCADE,
  market_id UUID REFERENCES markets ON DELETE CASCADE,
  PRIMARY KEY (group_id, market_id)
);

ALTER TABLE group_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can read group markets"
  ON group_markets FOR SELECT
  USING (group_id IN (
    SELECT group_id FROM group_members WHERE user_id = auth.uid()
  ));

-- ─── suggested_markets ────────────────────────────────────────────────────────
CREATE TABLE suggested_markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT
    CHECK (category IN ('sports', 'politics', 'entertainment', 'friends', 'other')),
  source TEXT NOT NULL DEFAULT 'editorial'
    CHECK (source IN ('ai_generated', 'editorial', 'trending')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  times_launched INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE suggested_markets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read active suggestions"
  ON suggested_markets FOR SELECT
  USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- ─── Triggers ─────────────────────────────────────────────────────────────────

-- Auto-create wallet + profile row on user sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');

  INSERT INTO wallets (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_creator ON markets(creator_id);
CREATE INDEX idx_bets_user ON bets(user_id);
CREATE INDEX idx_bets_market ON bets(market_id);
CREATE INDEX idx_transactions_wallet ON transactions(wallet_id);
CREATE INDEX idx_group_members_user ON group_members(user_id);
CREATE INDEX idx_group_members_group ON group_members(group_id);
