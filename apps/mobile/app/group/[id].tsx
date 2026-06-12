import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { groupsApi, marketsApi } from '@/lib/api';
import type { LeaderboardEntry, MarketWithOptions } from '@betting-app/shared';

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [markets, setMarkets] = useState<MarketWithOptions[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      groupsApi.leaderboard(id),
      marketsApi.list({ group_id: id, limit: 20 }),
    ]).then(([{ leaderboard: lb }, { markets: m }]) => {
      setLeaderboard(lb);
      setMarkets(m);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>← Terug</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/market/create')}
        >
          <Text style={styles.createBtnText}>+ Markt</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={leaderboard}
        keyExtractor={e => e.user_id}
        ListHeaderComponent={() => (
          <View>
            <Text style={styles.sectionTitle}>Leaderboard</Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.rank}>#{index + 1}</Text>
            <View style={styles.rowMain}>
              <Text style={styles.rowUsername}>@{item.username}</Text>
              <Text style={styles.rowStats}>
                {item.won_bets}/{item.total_bets} gewonnen · {(item.win_rate * 100).toFixed(0)}%
              </Text>
            </View>
          </View>
        )}
        ListFooterComponent={() => (
          <View>
            <Text style={styles.sectionTitle}>Markten in deze groep</Text>
            {markets.map(m => (
              <TouchableOpacity
                key={m.id}
                style={styles.marketCard}
                onPress={() => router.push(`/market/${m.id}`)}
              >
                <Text style={styles.marketTitle}>{m.title}</Text>
                <Text style={styles.marketStatus}>{m.status}</Text>
              </TouchableOpacity>
            ))}
            {markets.length === 0 && (
              <Text style={styles.empty}>Nog geen markten in deze groep.</Text>
            )}
          </View>
        )}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 60,
  },
  back: { color: '#6366f1', fontSize: 16 },
  createBtn: { backgroundColor: '#6366f1', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc', marginTop: 16, marginBottom: 10 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14, gap: 12,
  },
  rank: { fontSize: 18, fontWeight: '700', color: '#6366f1', minWidth: 30 },
  rowMain: { flex: 1, gap: 2 },
  rowUsername: { fontSize: 16, fontWeight: '600', color: '#f8fafc' },
  rowStats: { fontSize: 13, color: '#64748b' },
  marketCard: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  marketTitle: { flex: 1, fontSize: 14, color: '#f8fafc', marginRight: 8 },
  marketStatus: { fontSize: 12, color: '#64748b' },
  empty: { color: '#64748b', fontSize: 14 },
});
