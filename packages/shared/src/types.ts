// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ─── Enums ───────────────────────────────────────────────────────────────────

export type KycStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type MarketStatus = 'draft' | 'open' | 'closed' | 'resolved' | 'cancelled';
export type BetStatus = 'active' | 'won' | 'lost' | 'refunded';
export type TransactionType = 'deposit' | 'withdrawal' | 'bet_escrow' | 'payout' | 'fee';
export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type ResolutionMethod = 'admin' | 'creator' | 'community_vote';
export type MarketCategory = 'sports' | 'politics' | 'entertainment' | 'friends' | 'other';
export type SuggestionSource = 'ai_generated' | 'editorial' | 'trending';

// ─── Database row types ───────────────────────────────────────────────────────

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  date_of_birth: string | null;
  country: string | null;
  kyc_status: KycStatus;
  kyc_persona_inquiry_id: string | null;
  kyc_verified_at: string | null;
  is_banned: boolean;
  deposit_limit_cents_weekly: number | null;
  self_excluded_until: string | null;
  created_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance_cents: number;
  currency: string;
}

export interface Transaction {
  id: string;
  wallet_id: string;
  amount_cents: number;
  type: TransactionType;
  status: TransactionStatus;
  mollie_payment_id: string | null;
  mollie_payout_id: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Market {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: MarketCategory | null;
  status: MarketStatus;
  is_monetary: boolean;
  resolution_method: ResolutionMethod;
  close_at: string | null;
  resolved_at: string | null;
  winning_option_id: string | null;
  total_pool_cents: number;
  platform_fee_pct: number;
  created_at: string;
}

export interface MarketOption {
  id: string;
  market_id: string;
  title: string;
  total_staked_cents: number;
  sort_order: number;
}

export interface Bet {
  id: string;
  user_id: string;
  market_id: string;
  option_id: string;
  amount_cents: number;
  status: BetStatus;
  payout_cents: number | null;
  placed_at: string;
}

export interface FriendGroup {
  id: string;
  name: string;
  creator_id: string;
  invite_code: string;
  created_at: string;
}

export interface GroupMember {
  group_id: string;
  user_id: string;
}

export interface GroupMarket {
  group_id: string;
  market_id: string;
}

export interface SuggestedMarket {
  id: string;
  title: string;
  description: string | null;
  category: MarketCategory | null;
  source: SuggestionSource;
  is_active: boolean;
  times_launched: number;
  created_at: string;
}

// ─── API request/response types ───────────────────────────────────────────────

export interface CreateMarketRequest {
  title: string;
  description?: string;
  category?: MarketCategory;
  options: string[];
  is_monetary?: boolean;
  resolution_method?: ResolutionMethod;
  close_at?: string;
}

export interface PlaceBetRequest {
  market_id: string;
  option_id: string;
  amount_cents: number;
}

export interface PlaceBetResponse {
  bet: Bet;
  new_balance_cents: number;
  implied_odds: number;
}

export interface MarketWithOptions extends Market {
  options: MarketOption[];
  creator: Pick<Profile, 'id' | 'username'>;
}

export interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_bets: number;
  won_bets: number;
  win_rate: number;
  total_won_cents: number;
}

// ─── Supabase Database type (matches @supabase/supabase-js GenericSchema) ────

type TableDef<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<Profile, Omit<Profile, 'created_at'>, Partial<Profile>>;
      wallets: TableDef<Wallet, Omit<Wallet, 'id'>, Partial<Wallet>>;
      transactions: TableDef<Transaction, Omit<Transaction, 'id' | 'created_at'>, Partial<Transaction>>;
      markets: TableDef<Market, Omit<Market, 'id' | 'created_at'>, Partial<Market>>;
      market_options: TableDef<MarketOption, Omit<MarketOption, 'id'>, Partial<MarketOption>>;
      bets: TableDef<Bet, Omit<Bet, 'id' | 'placed_at'>, Partial<Bet>>;
      friend_groups: TableDef<FriendGroup, Omit<FriendGroup, 'id' | 'created_at' | 'invite_code'>, Partial<FriendGroup>>;
      group_members: TableDef<GroupMember, GroupMember, Partial<GroupMember>>;
      group_markets: TableDef<GroupMarket, GroupMarket, Partial<GroupMarket>>;
      suggested_markets: TableDef<SuggestedMarket, Omit<SuggestedMarket, 'id' | 'created_at'>, Partial<SuggestedMarket>>;
    };
    Views: { [_ in never]: never };
    Functions: {
      place_bet: {
        Args: {
          p_user_id: string;
          p_market_id: string;
          p_option_id: string;
          p_amount_cents: number;
        };
        Returns: Json;
      };
      credit_wallet: {
        Args: {
          p_wallet_id: string;
          p_amount_cents: number;
          p_type: string;
          p_reference_id?: string | null;
        };
        Returns: undefined;
      };
      leaderboard_for_group: {
        Args: { p_group_id: string };
        Returns: Json[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
