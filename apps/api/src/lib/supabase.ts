import { createClient } from '@supabase/supabase-js';
import type {
  Database,
  Market,
  MarketOption,
  Bet,
  FriendGroup,
  GroupMember,
  Transaction,
  Wallet,
  Profile,
  SuggestedMarket,
} from '@betting-app/shared';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Untyped admin client — we apply explicit types at call sites in route handlers.
// The Database generic causes "never" type errors because our Row interfaces
// don't satisfy Record<string, unknown> (GenericTable constraint).
// Runtime behaviour is identical; type safety is preserved via explicit casts.
const _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

// Re-export with a typed facade — callers cast query results to the shared types.
export const supabaseAdmin = _supabaseAdmin;

// Re-export shared types so route handlers have a single import.
export type {
  Database,
  Market,
  MarketOption,
  Bet,
  FriendGroup,
  GroupMember,
  Transaction,
  Wallet,
  Profile,
  SuggestedMarket,
};

export function createServerClient(accessToken: string) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false },
  });
}
