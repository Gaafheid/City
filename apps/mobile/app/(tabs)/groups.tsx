import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { groupsApi } from '@/lib/api';
import type { FriendGroup } from '@betting-app/shared';

export default function GroupsScreen() {
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const { groups: data } = await groupsApi.list();
      setGroups(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function handleCreate() {
    if (!newGroupName.trim()) return;
    setSubmitting(true);
    try {
      const { group } = await groupsApi.create(newGroupName.trim());
      setGroups(prev => [group, ...prev]);
      setShowCreate(false);
      setNewGroupName('');
    } catch (e: unknown) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Onbekende fout');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    const code = inviteCode.trim().toLowerCase();
    if (code.length !== 12) {
      Alert.alert('Ongeldige uitnodigingscode', 'Code is 12 tekens lang');
      return;
    }
    setSubmitting(true);
    try {
      const { group, already_member } = await groupsApi.join(code);
      if (already_member) {
        Alert.alert('Al lid', `Je bent al lid van ${group.name}`);
      } else {
        setGroups(prev => [group, ...prev]);
        Alert.alert('Welkom!', `Je bent nu lid van ${group.name}`);
      }
      setShowJoin(false);
      setInviteCode('');
    } catch (e: unknown) {
      Alert.alert('Fout', e instanceof Error ? e.message : 'Ongeldige code');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator color="#6366f1" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Groepen</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowJoin(true)}>
            <Text style={styles.actionBtnText}>Meedoen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.primaryBtn]} onPress={() => setShowCreate(true)}>
            <Text style={styles.actionBtnText}>+ Groep</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={groups}
        keyExtractor={g => g.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/group/${item.id}`)}
          >
            <Text style={styles.groupName}>{item.name}</Text>
            <Text style={styles.inviteCode}>Code: {item.invite_code}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.empty}>Nog geen groepen. Maak er een of doe mee via uitnodigingscode.</Text>
          </View>
        }
      />

      {/* Create group modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Nieuwe groep</Text>
            <TextInput
              style={styles.input}
              placeholder="Groepsnaam"
              placeholderTextColor="#64748b"
              value={newGroupName}
              onChangeText={setNewGroupName}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowCreate(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleCreate} style={styles.confirmBtn} disabled={submitting}>
                <Text style={styles.confirmText}>{submitting ? 'Aanmaken…' : 'Aanmaken'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Join group modal */}
      <Modal visible={showJoin} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Groep meedoen</Text>
            <TextInput
              style={styles.input}
              placeholder="Uitnodigingscode (12 tekens)"
              placeholderTextColor="#64748b"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowJoin(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Annuleren</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleJoin} style={styles.confirmBtn} disabled={submitting}>
                <Text style={styles.confirmText}>{submitting ? 'Meedoen…' : 'Meedoen'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, paddingTop: 80 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, paddingTop: 60,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#f8fafc' },
  headerActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  primaryBtn: { backgroundColor: '#6366f1' },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#334155', gap: 6,
  },
  groupName: { fontSize: 17, fontWeight: '600', color: '#f8fafc' },
  inviteCode: { fontSize: 12, color: '#64748b', fontFamily: 'monospace' },
  empty: { color: '#64748b', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#f8fafc' },
  input: {
    backgroundColor: '#0f172a', borderRadius: 10, padding: 14,
    fontSize: 16, color: '#f8fafc', borderWidth: 1, borderColor: '#334155',
  },
  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#334155', alignItems: 'center' },
  cancelText: { color: '#94a3b8', fontWeight: '600' },
  confirmBtn: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#6366f1', alignItems: 'center' },
  confirmText: { color: '#fff', fontWeight: '600' },
});
