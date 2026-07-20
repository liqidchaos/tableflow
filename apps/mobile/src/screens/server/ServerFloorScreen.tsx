import { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { createAnonClient } from '@tableflow/db/clients';
import { subscribeWithBackoff } from '@tableflow/db/realtime';
import { apiFetch } from '../../lib/api';
import { registerForPushNotifications } from '../../utils/notifications';
import { getStaffCredentials } from './ServerLoginScreen';
import { theme } from '../../lib/theme';
import type { FloorTable } from '@tableflow/types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerFloor'>;

const STATUS_COLORS: Record<FloorTable['status'], string> = {
  empty: theme.colors.outlineVariant,
  ordering: theme.colors.sun,
  eating: theme.colors.citrus,
  paying: theme.colors.gold,
  needs_attention: theme.colors.error,
};

const POLL_INTERVAL_MS = 30_000;

export function ServerFloorScreen({ navigation }: Props) {
  const [tables, setTables] = useState<FloorTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState<string | null>(null);

  const loadFloor = useCallback(async () => {
    const creds = await getStaffCredentials();
    if (!creds) {
      navigation.replace('ServerLogin');
      return null;
    }

    setVenueId(creds.venue_id);
    registerForPushNotifications(creds.venue_id, creds.staff_id, creds.access_token).catch(() => {});

    try {
      const data = await apiFetch(`/venues/${creds.venue_id}/floor?mine=1`, {
        headers: { Authorization: `Bearer ${creds.access_token}` },
      });
      setTables(data.tables);
      return creds;
    } catch {
      navigation.replace('ServerLogin');
      return null;
    }
  }, [navigation]);

  useEffect(() => {
    loadFloor().finally(() => setLoading(false));
    const interval = setInterval(() => {
      void loadFloor();
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [loadFloor]);

  useEffect(() => {
    if (!venueId) return;
    let teardown: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const creds = await getStaffCredentials();
      if (cancelled || !creds?.access_token) return;

      const supabase = createAnonClient();
      teardown = subscribeWithBackoff(
        supabase,
        `floor:${venueId}`,
        (channel) =>
          channel
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'orders', filter: `venue_id=eq.${venueId}` },
              () => { void loadFloor(); }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'item_requests', filter: `venue_id=eq.${venueId}` },
              () => { void loadFloor(); }
            )
            .on(
              'postgres_changes',
              { event: '*', schema: 'public', table: 'table_sessions' },
              () => { void loadFloor(); }
            ),
        { accessToken: creds.access_token }
      );
    })();

    return () => {
      cancelled = true;
      teardown?.();
    };
  }, [venueId, loadFloor]);

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: theme.colors.bg }} color={theme.colors.gold} />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Floor Manager</Text>
        {venueId && (
          <TouchableOpacity onPress={() => navigation.navigate('ServerRequests', { venueId })}>
            <Text style={styles.requestsLink}>Requests</Text>
          </TouchableOpacity>
        )}
      </View>
      <FlatList
        data={tables}
        keyExtractor={(t) => t.id}
        numColumns={2}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.tableCard, { borderColor: STATUS_COLORS[item.status] }]}
            onPress={() => navigation.navigate('ServerTable', { table: item, venueId: venueId! })}
          >
            <Text style={styles.tableName}>{item.name}</Text>
            <Text style={styles.tableStatus}>{item.status.replace('_', ' ')}</Text>
            {item.pending_requests > 0 && (
              <Text style={styles.alert}>{item.pending_requests} requests</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outlineVariant,
  },
  title: { fontSize: 26, fontFamily: theme.fonts.serif, color: theme.colors.onSurface },
  requestsLink: { color: theme.colors.gold, fontFamily: theme.fonts.sansBold, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase' },
  tableCard: {
    flex: 1,
    margin: 8,
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radii.md,
    padding: 16,
    borderWidth: 1,
  },
  tableName: { fontSize: 18, fontFamily: theme.fonts.sansBold, color: theme.colors.onSurface },
  tableStatus: { color: theme.colors.onSurfaceVariant, marginTop: 4, textTransform: 'capitalize', fontFamily: theme.fonts.sans },
  alert: { color: theme.colors.error, fontFamily: theme.fonts.sansBold, marginTop: 8 },
});
