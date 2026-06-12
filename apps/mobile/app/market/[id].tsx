import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { marketsApi, betsApi } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import type { MarketWithOptions, MarketOption } from '@betting-app/shared';

function OddsBar({ option, totalCents }: { option: MarketOption; totalCents: number }) {
  const pct = totalCents > 0 ? (option.total_staked_cents / totalCents) * 100 : 0;
  return (
    <View style={styles.oddsBarOuter}>
      <View style={[styles.oddsBarFill, { width: `${pct}%` }]} />
    </View>
  );
}

export default function MarketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [market, setMarket] = useState<MarketWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [placing, setPlacing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    marketsApi.get(id)
      .then(({ market: m }) => setMarket(m))
      .catch(() => router.back())
      .finally(() => setLoading(false));
  }, [id]);

  async function handlePlaceBet() {
    if (!selectedOption || !market) return;

    // Bragging-rights bets use amount_cents = 1 (symbolic unit)
    const amount = market.is_monetary ? parseInt(betAmount) * 100 : 1;

    if (market.is_monetary && (isNaN(amount) || amount < 100)) {
      Alert.alert('Ongeldig bedrag', 'Minimale inzet is €1,00');
      return;
    }

    setPlacing(true);
    try {
      await betsApi.place({ market_id: market.id, option_id: selectedOption, amount_cents: amount });
      Alert.alert('Bet geplaatst!', 'Je weddenschap is geregistreerd.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e: unknown) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setPlacing(false);
    }
  }

  async function handleResolve(optionId: string) {
    try {
      await marketsApi.resolve(market!.id, optionId);
      Alert.alert('Markt gesloten', 'De winnaar is vastgesteld.');
      router.back();
    } catch (e: unknown) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Onbekende fout');
    }
  }

  if (loading || !market) {
    return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;
  }

  const totalCents = market.options.reduce((s, o) => s + o.total_staked_cents, 0);
  const isCreator = market.creator_id === userId;
  const isOpen = market.status === 'open';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Terug</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        {!market.is_monetary && (
          <View style={styles.bragBadge}>
            <Text style={styles.bragText}>Bragging Rights</Text>
          </View>
        )}
        <Text style={styles.title}>{market.title}</Text>
        {market.description && <Text style={styles.description}>{market.description}</Text>}
        <Text style={styles.meta}>door @{market.creator.username} · {market.status}</Text>
      </View>

      <Text style={styles.sectionLabel}>Opties</Text>
      <View style={styles.options}>
        {market.options.map(opt => {
          const pct = totalCents > 0 ? ((opt.total_staked_cents / totalCents) * 100).toFixed(0) : '0';
          const isSelected = selectedOption === opt.id;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.option, isSelected && styles.optionSelected]}
              onPress={() => isOpen && setSelectedOption(opt.id)}
              disabled={!isOpen}
            >
              <View style={styles.optionTop}>
                <Text style={[styles.optionTitle, isSelected && styles.optionTitleSelected]}>
                  {opt.title}
                </Text>
                <Text style={styles.optionPct}>{pct}%</Text>
              </View>
              <OddsBar option={opt} totalCents={totalCents} />
            </TouchableOpacity>
          );
        })}
      </View>

      {isOpen && selectedOption && (
        <View style={styles.betSection}>
          {market.is_monetary ? (
            <>
              <Text style={styles.sectionLabel}>Inzet (euro)</Text>
              <TextInput
                style={styles.input}
                placeholder="Bijv. 5"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={betAmount}
                onChangeText={setBetAmount}
              />
            </>
          ) : (
            <Text style={styles.bragInfo}>
              Bragging-rights bet — geen geld vereist
            </Text>
          )}
          <TouchableOpacity
            style={[styles.betBtn, placing && styles.betBtnDisabled]}
            onPress={handlePlaceBet}
            disabled={placing}
          >
            <Text style={styles.betBtnText}>{placing ? 'Plaatsen…' : 'Bet plaatsen'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {isCreator && isOpen && (
        <View style={styles.resolveSection}>
          <Text style={styles.sectionLabel}>Winnaar vaststellen</Text>
          {market.options.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={styles.resolveBtn}
              onPress={() => Alert.alert('Winnaar vaststellen', `"${opt.title}" als winnaar markeren?`, [
                { text: 'Annuleren', style: 'cancel' },
                { text: 'Bevestig', onPress: () => handleResolve(opt.id) },
              ])}
            >
              <Text style={styles.resolveBtnText}>{opt.title} wint</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  inner: { padding: 20, paddingTop: 60, gap: 16 },
  back: { marginBottom: 4 },
  backText: { color: '#6366f1', fontSize: 16 },
  header: { gap: 8 },
  bragBadge: { backgroundColor: '#312e81', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  bragText: { fontSize: 12, color: '#a5b4fc', fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '700', color: '#f8fafc', lineHeight: 30 },
  description: { fontSize: 15, color: '#94a3b8', lineHeight: 22 },
  meta: { fontSize: 12, color: '#475569' },
  sectionLabel: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  options: { gap: 10 },
  option: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 14,
    borderWidth: 2, borderColor: '#334155', gap: 8,
  },
  optionSelected: { borderColor: '#6366f1', backgroundColor: '#1e2040' },
  optionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  optionTitle: { flex: 1, fontSize: 16, fontWeight: '500', color: '#cbd5e1' },
  optionTitleSelected: { color: '#a5b4fc', fontWeight: '700' },
  optionPct: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  oddsBarOuter: { height: 4, backgroundColor: '#334155', borderRadius: 2, overflow: 'hidden' },
  oddsBarFill: { height: 4, backgroundColor: '#6366f1', borderRadius: 2 },
  betSection: { gap: 10 },
  bragInfo: { fontSize: 14, color: '#94a3b8', fontStyle: 'italic' },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14,
    fontSize: 18, color: '#f8fafc', borderWidth: 1, borderColor: '#334155',
  },
  betBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center' },
  betBtnDisabled: { opacity: 0.6 },
  betBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  resolveSection: { gap: 10, marginTop: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#334155' },
  resolveBtn: { backgroundColor: '#134e4a', borderRadius: 10, padding: 14, alignItems: 'center' },
  resolveBtnText: { color: '#6ee7b7', fontWeight: '600' },
});
