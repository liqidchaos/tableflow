import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../../lib/api';
import { getStaffCredentials } from './ServerLoginScreen';
import type { ItemRequest } from '@tableflow/types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerRequests'>;

export function ServerRequestsScreen({ route }: Props) {
  const { venueId } = route.params;
  const [requests, setRequests] = useState<ItemRequest[]>([]);

  const loadRequests = useCallback(async () => {
    const creds = await getStaffCredentials();
    if (!creds) return;

    try {
      const data = await apiFetch(`/venues/${venueId}/requests?status=pending&mine=1`, {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });
      setRequests(data.requests);
    } catch {
      setRequests([]);
    }
  }, [venueId]);

  useEffect(() => {
    loadRequests();
    const interval = setInterval(loadRequests, 15_000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  async function fulfill(requestId: string) {
    const creds = await getStaffCredentials();
    if (!creds) return;

    await apiFetch(`/requests/${requestId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${creds.access_token}` },
      body: JSON.stringify({ status: 'fulfilled' }),
    });
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.type}>{item.request_type}</Text>
            {item.custom_text && <Text style={styles.custom}>{item.custom_text}</Text>}
            <TouchableOpacity style={styles.btn} onPress={() => fulfill(item.id)}>
              <Text style={styles.btnText}>Mark Fulfilled</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No pending requests</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8', padding: 16 },
  title: { fontSize: 22, fontFamily: 'Fraunces_600SemiBold', marginBottom: 16 },
  card: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 8 },
  type: { fontFamily: 'Inter_600SemiBold', textTransform: 'capitalize' },
  custom: { color: '#6B7280', marginTop: 4, fontFamily: 'Inter_400Regular' },
  btn: { marginTop: 12, backgroundColor: '#1A7F5A', padding: 10, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontFamily: 'Inter_600SemiBold' },
  empty: { textAlign: 'center', color: '#6B7280', marginTop: 40, fontFamily: 'Inter_400Regular' },
});
