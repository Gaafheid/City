import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { marketsApi } from '@/lib/api';
import type { MarketWithOptions } from '@betting-app/shared';

function MarketCard({ market }: { market: MarketWithOptions }) {
  const totalBets = market.options.reduce((s, o) => s + o.total_staked_cents, 0);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/market/${market.id}`)}
      activeOpacity={0.8}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.category}>{market.category ?? 'overig'}</Text>
        {!market.is_monetary && (
          <View style={styles.bragBadge}>
            <Text style={styles.bragText}>Bragging Rights</Text>
          </View>
        )}
      </View>
      <Text style={styles.title}>{market.title}</Text>
      <View style={styles.options}>
        {market.options.slice(0, 3).map(opt => {
          const pct = totalBets > 0 ? (opt.total_staked_cents / totalBets) * 100 : 0;
          return (
            <View key={opt.id} style={styles.optionRow}>
              <Text style={styles.optionTitle} numberOfLines={1}>{opt.title}</Text>
              <Text style={styles.optionPct}>{pct.toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>
      <Text style={styles.meta}>door @{market.creator.username}</Text>
    </TouchableOpacity>
  );
}

export default function DiscoverScreen() {
  const [markets, setMarkets] = useState<MarketWithOptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { markets: data } = await marketsApi.list({ limit: 20 });
      setMarkets(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#6366f1" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ontdek</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/market/create')}
        >
          <Text style={styles.createBtnText}>+ Markt</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={markets}
        keyExtractor={m => m.id}
        renderItem={({ item }) => <MarketCard market={item} />}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Nog geen markten. Maak de eerste!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#f8fafc' },
  createBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  category: { fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  bragBadge: { backgroundColor: '#312e81', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  bragText: { fontSize: 11, color: '#a5b4fc', fontWeight: '600' },
  title: { fontSize: 17, fontWeight: '600', color: '#f8fafc', lineHeight: 23 },
  options: { gap: 6 },
  optionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { flex: 1, fontSize: 14, color: '#cbd5e1', marginRight: 8 },
  optionPct: { fontSize: 14, fontWeight: '600', color: '#6366f1', minWidth: 36, textAlign: 'right' },
  meta: { fontSize: 12, color: '#475569' },
  empty: { color: '#64748b', fontSize: 15 },
});
