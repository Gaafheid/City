import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { Link, router } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    const u = username.trim().toLowerCase();
    if (!u || u.length < 3) {
      Alert.alert('Ongeldige gebruikersnaam', 'Minimaal 3 tekens');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(u)) {
      Alert.alert('Ongeldige gebruikersnaam', 'Alleen letters, cijfers en underscores');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Wachtwoord te kort', 'Minimaal 8 tekens');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Wachtwoorden komen niet overeen');
      return;
    }

    setLoading(true);
    try {
      // We use username@internal.betting-app as email placeholder
      const email = `${u}@internal.betting-app`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username: u } },
      });
      if (error) {
        if (error.message.includes('already registered')) {
          throw new Error('Gebruikersnaam is al in gebruik');
        }
        throw error;
      }
      router.replace('/(tabs)');
    } catch (e: unknown) {
      Alert.alert('Registratie mislukt', e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Account aanmaken</Text>
        <Text style={styles.subtitle}>Geen email nodig — kies een gebruikersnaam</Text>

        <TextInput
          style={styles.input}
          placeholder="Gebruikersnaam (a–z, 0–9, _)"
          placeholderTextColor="#64748b"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord (min. 8 tekens)"
          placeholderTextColor="#64748b"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TextInput
          style={styles.input}
          placeholder="Wachtwoord bevestigen"
          placeholderTextColor="#64748b"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
        />

        <View style={styles.notice}>
          <Text style={styles.noticeText}>
            Je speelt nu gratis met bragging rights. Voor echt geld storten voeg je later een email toe en verifieer je via iDIN.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Account aanmaken…' : 'Gratis beginnen'}</Text>
        </TouchableOpacity>

        <Link href="/(auth)/login" style={styles.link}>
          Al een account? Log in
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  inner: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#f8fafc', marginBottom: 4 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginBottom: 8 },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#f8fafc',
    borderWidth: 1,
    borderColor: '#334155',
  },
  notice: {
    backgroundColor: '#1e3a5f',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  noticeText: { color: '#93c5fd', fontSize: 13, lineHeight: 19 },
  button: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: '#818cf8', textAlign: 'center', marginTop: 8 },
});
