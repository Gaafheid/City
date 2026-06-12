import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@betting-app/shared';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setProfile(data));
    });
  }, []);

  async function handleSignOut() {
    Alert.alert('Uitloggen', 'Weet je zeker dat je wilt uitloggen?', [
      { text: 'Annuleren', style: 'cancel' },
      {
        text: 'Uitloggen',
        style: 'destructive',
        onPress: async () => { await supabase.auth.signOut(); },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
      <Text style={styles.headerTitle}>Profiel</Text>

      {profile && (
        <View style={styles.card}>
          <Text style={styles.username}>@{profile.username}</Text>
          <View style={styles.kycRow}>
            <Text style={styles.kycLabel}>Account type</Text>
            <Text style={styles.kycValue}>
              {profile.kyc_status === 'verified' ? 'Geverifieerd (echt geld)' : 'Bragging Rights (gratis)'}
            </Text>
          </View>
        </View>
      )}

      {profile?.kyc_status !== 'verified' && (
        <View style={styles.upgradeCard}>
          <Text style={styles.upgradeTitle}>Upgrade naar echt geld</Text>
          <Text style={styles.upgradeText}>
            Verifieer je identiteit via iDIN (je eigen bank) om echt geld te storten en te wedden. Duurt minder dan 30 seconden.
          </Text>
          <TouchableOpacity style={styles.upgradeBtn} disabled>
            <Text style={styles.upgradeBtnText}>Verifieer via iDIN — binnenkort</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Uitloggen</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { padding: 20, paddingTop: 60, gap: 16 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#f8fafc', marginBottom: 8 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 18,
    gap: 10, borderWidth: 1, borderColor: '#334155',
  },
  username: { fontSize: 20, fontWeight: '700', color: '#f8fafc' },
  kycRow: { flexDirection: 'row', justifyContent: 'space-between' },
  kycLabel: { fontSize: 14, color: '#94a3b8' },
  kycValue: { fontSize: 14, color: '#f8fafc', fontWeight: '500' },
  upgradeCard: {
    backgroundColor: '#1a1f2e', borderRadius: 14, padding: 18,
    gap: 10, borderWidth: 1, borderColor: '#4f46e5',
  },
  upgradeTitle: { fontSize: 17, fontWeight: '700', color: '#a5b4fc' },
  upgradeText: { fontSize: 14, color: '#94a3b8', lineHeight: 21 },
  upgradeBtn: {
    backgroundColor: '#4338ca', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  upgradeBtnText: { color: '#c7d2fe', fontWeight: '600' },
  signOutBtn: {
    backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#334155', marginTop: 16,
  },
  signOutText: { color: '#f87171', fontWeight: '600', fontSize: 16 },
});
