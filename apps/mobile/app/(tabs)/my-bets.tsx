import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Bet } from '@betting-app/shared';

const STATUS_LABEL: Record<string, string> = {
  active: 'Actief',
  won: 'Gewonnen',
  lost: 'Verloren',
  refunded: 'Terugbetaald',
};

const STATUS_COLOR: Record<string, string> = {
  active: '#818cf8',
  won: '#4ade80',
  lost: '#f87171',
  refunded: '#94a3b8',
};

export default function MyBetsScreen() {
  const [bets, setBets] = useState<(Bet & { market_title?: string; option_title?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('bets')
      .select(`
        *,
        market:markets(title),
        option:market_options(title)
      `)
      .eq('user_id', user.id)
      .order('placed_at', { ascending: false })
      .limit(50);

    setBets((data ?? []).map((b: Bet & { market?: { title: string }; option?: { title: string } }) => ({
      ...b,
      market_title: b.market?.title,
      option_title: b.option?.title,
    })));
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Mijn bets</Text>
      <FlatList
        data={bets}
        keyExtractor={b => b.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.marketTitle} numberOfLines={2}>{item.market_title}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[item.status] ?? '#94a3b8' }]}>
                {STATUS_LABEL[item.status] ?? item.status}
              </Text>
            </View>
            <Text style={styles.optionTitle}>Op: {item.option_title}</Text>
            {item.amount_cents > 0 && (
              <Text style={styles.meta}>
                Inzet: {(item.amount_cents / 100).toFixed(2)} punten
                {item.payout_cents ? ` → Uitbetaling: ${(item.payout_cents / 100).toFixed(2)} punten` : ''}
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Nog geen bets geplaatst.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#f8fafc', padding: 20, paddingTop: 60 },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    gap: 6, borderWidth: 1, borderColor: '#334155',
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  marketTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#f8fafc', marginRight: 8 },
  status: { fontSize: 13, fontWeight: '600' },
  optionTitle: { fontSize: 13, color: '#94a3b8' },
  meta: { fontSize: 12, color: '#64748b' },
  empty: { color: '#64748b', fontSize: 15 },
});
