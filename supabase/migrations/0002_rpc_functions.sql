-- ─── place_bet (atomic) ───────────────────────────────────────────────────────
-- Places a bet transactionally: validates balance, debits wallet, inserts bet,
-- updates market pool. Returns the new balance and implied odds.
CREATE OR REPLACE FUNCTION place_bet(
  p_user_id UUID,
  p_market_id UUID,
  p_option_id UUID,
  p_amount_cents BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_market markets%ROWTYPE;
  v_option market_options%ROWTYPE;
  v_wallet wallets%ROWTYPE;
  v_profile profiles%ROWTYPE;
  v_bet bets%ROWTYPE;
  v_new_total BIGINT;
  v_new_option_total BIGINT;
  v_implied_odds NUMERIC;
BEGIN
  -- Lock profile row for validation
  SELECT * INTO v_profile FROM profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_profile.is_banned THEN RAISE EXCEPTION 'User is banned'; END IF;
  IF v_profile.self_excluded_until IS NOT NULL AND v_profile.self_excluded_until > NOW() THEN
    RAISE EXCEPTION 'User is self-excluded until %', v_profile.self_excluded_until;
  END IF;

  -- Load and lock market
  SELECT * INTO v_market FROM markets WHERE id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Market not found'; END IF;
  IF v_market.status != 'open' THEN RAISE EXCEPTION 'Market is not open'; END IF;
  IF v_market.close_at IS NOT NULL AND v_market.close_at <= NOW() THEN
    RAISE EXCEPTION 'Market is not open';
  END IF;

  -- Validate option belongs to market
  SELECT * INTO v_option FROM market_options WHERE id = p_option_id AND market_id = p_market_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid option for this market'; END IF;

  -- For monetary markets: check and debit wallet
  IF v_market.is_monetary THEN
    SELECT * INTO v_wallet FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF v_wallet.balance_cents < p_amount_cents THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Debit wallet
    UPDATE wallets
    SET balance_cents = balance_cents - p_amount_cents
    WHERE id = v_wallet.id;

    -- Record transaction
    INSERT INTO transactions (wallet_id, amount_cents, type, status, reference_id)
    VALUES (v_wallet.id, -p_amount_cents, 'bet_escrow', 'completed', p_market_id);
  END IF;

  -- Insert bet
  INSERT INTO bets (user_id, market_id, option_id, amount_cents)
  VALUES (p_user_id, p_market_id, p_option_id, p_amount_cents)
  RETURNING * INTO v_bet;

  -- Update market pool and option totals
  v_new_total := v_market.total_pool_cents + p_amount_cents;
  v_new_option_total := v_option.total_staked_cents + p_amount_cents;

  UPDATE markets SET total_pool_cents = v_new_total WHERE id = p_market_id;
  UPDATE market_options SET total_staked_cents = v_new_option_total WHERE id = p_option_id;

  -- Calculate implied odds for response
  IF v_new_total > 0 THEN
    v_implied_odds := v_new_option_total::NUMERIC / v_new_total::NUMERIC;
  ELSE
    v_implied_odds := 0.5;
  END IF;

  RETURN jsonb_build_object(
    'bet', row_to_json(v_bet),
    'new_balance_cents', CASE WHEN v_market.is_monetary THEN v_wallet.balance_cents - p_amount_cents ELSE NULL END,
    'implied_odds', v_implied_odds
  );
END;
$$;

-- ─── credit_wallet ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_wallet(
  p_wallet_id UUID,
  p_amount_cents BIGINT,
  p_type TEXT,
  p_reference_id UUID DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE wallets SET balance_cents = balance_cents + p_amount_cents WHERE id = p_wallet_id;
  INSERT INTO transactions (wallet_id, amount_cents, type, status, reference_id)
  VALUES (p_wallet_id, p_amount_cents, p_type, 'completed', p_reference_id);
END;
$$;

-- ─── leaderboard_for_group ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION leaderboard_for_group(p_group_id UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  total_bets BIGINT,
  won_bets BIGINT,
  win_rate NUMERIC,
  total_won_cents BIGINT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id AS user_id,
    p.username,
    COUNT(b.id) AS total_bets,
    COUNT(b.id) FILTER (WHERE b.status = 'won') AS won_bets,
    CASE
      WHEN COUNT(b.id) = 0 THEN 0
      ELSE ROUND(COUNT(b.id) FILTER (WHERE b.status = 'won')::NUMERIC / COUNT(b.id)::NUMERIC, 4)
    END AS win_rate,
    COALESCE(SUM(b.payout_cents) FILTER (WHERE b.status = 'won'), 0) AS total_won_cents
  FROM group_members gm
  JOIN profiles p ON p.id = gm.user_id
  LEFT JOIN bets b ON b.user_id = gm.user_id
    AND b.market_id IN (
      SELECT market_id FROM group_markets WHERE group_id = p_group_id
    )
    AND b.status IN ('won', 'lost', 'refunded')
  WHERE gm.group_id = p_group_id
  GROUP BY p.id, p.username
  ORDER BY won_bets DESC, win_rate DESC;
$$;
