import { supabase } from './supabase';
import Constants from 'expo-constants';
import type {
  CreateMarketRequest,
  PlaceBetRequest,
  PlaceBetResponse,
  MarketWithOptions,
  LeaderboardEntry,
  FriendGroup,
} from '@betting-app/shared';

const API_URL = Constants.expoConfig?.extra?.apiUrl as string;

async function getHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  };
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getHeaders();
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { ...headers, ...init?.headers } });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `API error ${res.status}`);
  return json as T;
}

// ─── Markets ──────────────────────────────────────────────────────────────────

export const marketsApi = {
  list: (params?: { category?: string; is_monetary?: boolean; group_id?: string; limit?: number; offset?: number }) => {
    const qs = new URLSearchParams();
    if (params?.category) qs.set('category', params.category);
    if (params?.is_monetary !== undefined) qs.set('is_monetary', String(params.is_monetary));
    if (params?.group_id) qs.set('group_id', params.group_id);
    if (params?.limit) qs.set('limit', String(params.limit));
    if (params?.offset) qs.set('offset', String(params.offset));
    return apiFetch<{ markets: MarketWithOptions[] }>(`/api/markets?${qs}`);
  },

  get: (id: string) => apiFetch<{ market: MarketWithOptions }>(`/api/markets/${id}`),

  create: (data: CreateMarketRequest) =>
    apiFetch<{ market: MarketWithOptions }>('/api/markets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  resolve: (id: string, winning_option_id: string) =>
    apiFetch<{ ok: boolean }>(`/api/markets/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ winning_option_id }),
    }),
};

// ─── Bets ─────────────────────────────────────────────────────────────────────

export const betsApi = {
  place: (data: PlaceBetRequest) =>
    apiFetch<PlaceBetResponse>('/api/bets/place', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ─── Groups ───────────────────────────────────────────────────────────────────

export const groupsApi = {
  list: () => apiFetch<{ groups: FriendGroup[] }>('/api/groups'),

  create: (name: string) =>
    apiFetch<{ group: FriendGroup }>('/api/groups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  join: (invite_code: string) =>
    apiFetch<{ group: FriendGroup; already_member?: boolean }>('/api/groups/join', {
      method: 'POST',
      body: JSON.stringify({ invite_code }),
    }),

  leaderboard: (groupId: string) =>
    apiFetch<{ leaderboard: LeaderboardEntry[] }>(`/api/groups/${groupId}/leaderboard`),
};
