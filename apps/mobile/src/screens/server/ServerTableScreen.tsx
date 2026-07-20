import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../../lib/api';
import { getStaffCredentials } from './ServerLoginScreen';
import { theme } from '../../lib/theme';
import type { FloorTable, KDSTicket } from '@tableflow/types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ServerTable'>;

export function ServerTableScreen({ route, navigation }: Props) {
  const { table, venueId } = route.params;
  const [tickets, setTickets] = useState<KDSTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      const creds = await getStaffCredentials();
      if (!creds) return;

      try {
        const data = await apiFetch(`/venues/${venueId}/kds`, {
          headers: { Authorization: `Bearer ${creds.access_token}` },
        });
        const forTable = (data.tickets as KDSTicket[]).filter((t) => t.table_name === table.name);
        setTickets(forTable);
      } catch {
        setTickets([]);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, [venueId, table.name]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{table.name}</Text>
      <Text style={styles.status}>Status: {table.status.replace('_', ' ')}</Text>
      <Text style={styles.detail}>Guests: {table.guest_count}</Text>
      <Text style={styles.detail}>Open orders: {table.open_orders}</Text>
      <Text style={styles.detail}>Tab total: ${table.tab_total.toFixed(2)}</Text>

      <Text style={styles.sectionTitle}>Order items</Text>
      {loading ? (
        <ActivityIndicator color={theme.colors.gold} style={{ marginVertical: 16 }} />
      ) : tickets.length === 0 ? (
        <Text style={styles.empty}>No active order items</Text>
      ) : (
        tickets.map((ticket) => (
          <View key={ticket.order_id} style={styles.orderCard}>
            <Text style={styles.orderHeader}>
              Order {ticket.order_id.slice(0, 8)} — {ticket.status}
            </Text>
            {ticket.items.map((line) => (
              <View key={line.id} style={styles.lineItem}>
                <Text style={styles.lineName}>
                  {line.quantity}× {line.name}
                </Text>
                {line.modifiers.length > 0 && (
                  <Text style={styles.lineMods}>{line.modifiers.join(', ')}</Text>
                )}
                {line.special_instructions && (
                  <Text style={styles.lineNote}>{line.special_instructions}</Text>
                )}
              </View>
            ))}
          </View>
        ))
      )}

      {table.pending_requests > 0 && (
        <TouchableOpacity
          style={styles.requestBtn}
          onPress={() => navigation.navigate('ServerRequests', { venueId })}
        >
          <Text style={styles.requestText}>{table.pending_requests} pending requests</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg, padding: 24 },
  title: { fontSize: 28, fontFamily: theme.fonts.serif, color: theme.colors.onSurface },
  status: { color: theme.colors.onSurfaceVariant, marginTop: 8, textTransform: 'capitalize', fontFamily: theme.fonts.sans },
  detail: { marginTop: 12, fontSize: 15, fontFamily: theme.fonts.sans, color: theme.colors.onSurface },
  sectionTitle: { fontSize: 18, fontFamily: theme.fonts.sansBold, marginTop: 24, marginBottom: 12, color: theme.colors.onSurface },
  empty: { color: theme.colors.onSurfaceVariant, fontFamily: theme.fonts.sans },
  orderCard: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: 16,
    marginBottom: 12,
  },
  orderHeader: { fontFamily: theme.fonts.sansBold, marginBottom: 8, textTransform: 'capitalize', color: theme.colors.onSurface },
  lineItem: { paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant },
  lineName: { fontFamily: theme.fonts.sansBold, color: theme.colors.onSurface },
  lineMods: { color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 2, fontFamily: theme.fonts.sans },
  lineNote: { color: theme.colors.sun, fontSize: 13, marginTop: 2, fontStyle: 'italic', fontFamily: theme.fonts.sans },
  requestBtn: { marginTop: 24, backgroundColor: theme.colors.errorContainer, padding: 16, borderRadius: theme.radii.md },
  requestText: { color: theme.colors.onSurface, fontFamily: theme.fonts.sansBold, textAlign: 'center' },
});
