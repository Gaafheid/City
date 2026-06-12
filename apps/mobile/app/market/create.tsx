import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { marketsApi } from '@/lib/api';
import type { MarketCategory } from '@betting-app/shared';

const CATEGORIES: MarketCategory[] = ['sports', 'politics', 'entertainment', 'friends', 'other'];
const CATEGORY_LABELS: Record<MarketCategory, string> = {
  sports: 'Sport',
  politics: 'Politiek',
  entertainment: 'Entertainment',
  friends: 'Vrienden',
  other: 'Overig',
};

export default function CreateMarketScreen() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<MarketCategory>('friends');
  const [options, setOptions] = useState(['', '']);
  const [isMonetary, setIsMonetary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateOption(index: number, value: string) {
    setOptions(prev => prev.map((o, i) => (i === index ? value : o)));
  }

  function addOption() {
    if (options.length >= 10) return;
    setOptions(prev => [...prev, '']);
  }

  function removeOption(index: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== index));
  }

  async function handleCreate() {
    const filledOptions = options.map(o => o.trim()).filter(Boolean);
    if (title.trim().length < 5) {
      Alert.alert('Titel te kort', 'Minimaal 5 tekens');
      return;
    }
    if (filledOptions.length < 2) {
      Alert.alert('Opties', 'Minimaal 2 opties vereist');
      return;
    }

    setSubmitting(true);
    try {
      const { market } = await marketsApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        options: filledOptions,
        is_monetary: isMonetary,
        resolution_method: 'creator',
      });
      router.replace(`/market/${market.id}`);
    } catch (e: unknown) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
      <TouchableOpacity onPress={() => router.back()} style={styles.back}>
        <Text style={styles.backText}>← Terug</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Nieuwe markt</Text>

      <Text style={styles.label}>Vraag / titel</Text>
      <TextInput
        style={styles.input}
        placeholder="Bijv. Wie wint de finale?"
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
        multiline
      />

      <Text style={styles.label}>Beschrijving (optioneel)</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Extra context over de weddenschap…"
        placeholderTextColor="#64748b"
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={3}
      />

      <Text style={styles.label}>Categorie</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
              {CATEGORY_LABELS[cat]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Opties</Text>
      <View style={styles.optionsContainer}>
        {options.map((opt, i) => (
          <View key={i} style={styles.optionRow}>
            <TextInput
              style={[styles.input, styles.optionInput]}
              placeholder={`Optie ${i + 1}`}
              placeholderTextColor="#64748b"
              value={opt}
              onChangeText={v => updateOption(i, v)}
            />
            {options.length > 2 && (
              <TouchableOpacity onPress={() => removeOption(i)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>×</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
        {options.length < 10 && (
          <TouchableOpacity onPress={addOption} style={styles.addOptionBtn}>
            <Text style={styles.addOptionText}>+ Optie toevoegen</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.monetaryRow}>
        <View style={styles.monetaryText}>
          <Text style={styles.label}>Echt geld</Text>
          <Text style={styles.monetaryHint}>Uit = gratis bragging rights</Text>
        </View>
        <Switch
          value={isMonetary}
          onValueChange={setIsMonetary}
          trackColor={{ false: '#334155', true: '#6366f1' }}
          thumbColor="#fff"
          disabled
        />
      </View>
      {isMonetary && (
        <Text style={styles.monetaryWarning}>
          Echt geld markten zijn nog niet beschikbaar in deze versie.
        </Text>
      )}

      <TouchableOpacity
        style={[styles.createBtn, submitting && styles.createBtnDisabled]}
        onPress={handleCreate}
        disabled={submitting}
      >
        <Text style={styles.createBtnText}>{submitting ? 'Aanmaken…' : 'Markt aanmaken'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { padding: 20, paddingTop: 60, gap: 14 },
  back: { marginBottom: 4 },
  backText: { color: '#6366f1', fontSize: 16 },
  heading: { fontSize: 24, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1e293b', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#f8fafc', borderWidth: 1, borderColor: '#334155',
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  categoryRow: { flexDirection: 'row' },
  categoryChip: {
    backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14,
    paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: '#334155',
  },
  categoryChipActive: { backgroundColor: '#312e81', borderColor: '#6366f1' },
  categoryChipText: { color: '#94a3b8', fontSize: 14 },
  categoryChipTextActive: { color: '#a5b4fc', fontWeight: '600' },
  optionsContainer: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  optionInput: { flex: 1 },
  removeBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  removeBtnText: { color: '#f87171', fontSize: 22, fontWeight: '300' },
  addOptionBtn: { padding: 10, alignItems: 'center' },
  addOptionText: { color: '#6366f1', fontWeight: '600' },
  monetaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', opacity: 0.5 },
  monetaryText: { gap: 2 },
  monetaryHint: { fontSize: 12, color: '#64748b' },
  monetaryWarning: { fontSize: 13, color: '#f59e0b', fontStyle: 'italic' },
  createBtn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  createBtnDisabled: { opacity: 0.6 },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 17 },
});
