import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useGuestRequests, requestStatusLabel } from '../hooks/useGuestRequests';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'GuestRequests'>;

const REQUEST_TYPES = [
  { type: 'water' as const, label: 'Water' },
  { type: 'bread' as const, label: 'Bread' },
  { type: 'napkins' as const, label: 'Napkins' },
  { type: 'check' as const, label: 'Check please' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: theme.colors.sun,
  acknowledged: theme.colors.sun,
  fulfilled: theme.colors.citrus,
};

export function GuestRequestsScreen({ navigation }: Props) {
  const { sessionId, sessionToken, tableId, brandColor } = useSession();
  const [loading, setLoading] = useState<string | null>(null);
  const { requests } = useGuestRequests(sessionId, sessionToken);
  const accent = brandColor ?? theme.colors.flow;

  async function sendRequest(requestType: typeof REQUEST_TYPES[number]['type']) {
    if (!sessionId || !sessionToken || !tableId) return;
    setLoading(requestType);
    try {
      await apiFetch('/requests', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ session_id: sessionId, table_id: tableId, request_type: requestType }),
      });
      Alert.alert('Request sent', 'A server has been notified');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24 }}>
      <Text style={styles.title}>What do you need?</Text>
      <Text style={styles.subtitle}>Tap to notify your server</Text>
      {REQUEST_TYPES.map((req) => (
        <TouchableOpacity
          key={req.type}
          style={[styles.button, { borderColor: accent }]}
          onPress={() => sendRequest(req.type)}
          disabled={loading !== null}
        >
          <Text style={[styles.buttonText, { color: accent }]}>
            {loading === req.type ? 'Sending…' : req.label}
          </Text>
        </TouchableOpacity>
      ))}

      {requests.length > 0 && (
        <View style={styles.historyBox}>
          <Text style={styles.historyTitle}>Your requests</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.historyRow}>
              <Text style={styles.historyLabel}>
                {req.request_type === 'custom' ? req.custom_text : req.request_type}
              </Text>
              <Text style={[styles.historyStatus, { color: STATUS_COLORS[req.status] ?? '#6B7280' }]}>
                {requestStatusLabel(req.status)}
              </Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={[styles.backText, { color: accent }]}>Back to menu</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8' },
  title: { fontSize: 28, fontWeight: '600', marginBottom: 8 },
  subtitle: { color: '#6B7280', marginBottom: 32 },
  button: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, marginBottom: 12, borderWidth: 1.5, alignItems: 'center' },
  buttonText: { fontWeight: '600', fontSize: 16 },
  historyBox: { marginTop: 32, backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  historyTitle: { fontWeight: '600', fontSize: 16, marginBottom: 12 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#E8E6E1' },
  historyLabel: { textTransform: 'capitalize', flex: 1 },
  historyStatus: { fontWeight: '600', fontSize: 13 },
  backBtn: { marginTop: 24, alignItems: 'center', padding: 12 },
  backText: { fontWeight: '600' },
});
