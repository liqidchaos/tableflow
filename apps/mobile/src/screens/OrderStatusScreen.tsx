import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { useOrderDetail } from '../hooks/useOrderDetail';
import { useSession } from '../context/SessionContext';
import { apiFetch } from '../lib/api';
import { theme, statusColor } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'OrderStatus'>;

const STEPS = ['received', 'preparing', 'ready', 'delivered'] as const;
const LABELS: Record<string, string> = {
  received: 'Received',
  preparing: 'Preparing',
  ready: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export function OrderStatusScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const { sessionId, sessionToken, brandColor } = useSession();
  const status = useOrderStatus(orderId, sessionToken ?? undefined);
  const { order, loading } = useOrderDetail(orderId);
  const [tabTotal, setTabTotal] = useState(0);
  const currentIndex = STEPS.indexOf(status as (typeof STEPS)[number]);
  const accent = brandColor ?? theme.colors.flow;

  useEffect(() => {
    if (!sessionId || !sessionToken) return;
    apiFetch(`/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${sessionToken}` },
    })
      .then((data) => setTabTotal(Number(data.total_amount ?? 0)))
      .catch(() => {});
  }, [sessionId, sessionToken]);

  useEffect(() => {
    if (status !== 'ready') return;
    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Order ready!',
        body: 'Your food is ready.',
        sound: 'default',
      },
      trigger: null,
    }).catch(() => {});
  }, [status]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Order Status</Text>

      <View style={[styles.statusPill, { backgroundColor: statusColor(status) }]}>
        <Text style={styles.statusPillText}>{LABELS[status] ?? status}</Text>
      </View>

      <View style={styles.steps}>
        {STEPS.map((step, i) => (
          <View key={step} style={styles.step}>
            <View style={[styles.bar, i <= currentIndex && { backgroundColor: accent }]} />
            <Text style={[styles.label, i <= currentIndex && styles.labelActive]}>{LABELS[step]}</Text>
          </View>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={accent} style={{ marginVertical: 24 }} />
      ) : order?.order_items?.length ? (
        <View style={styles.itemsBox}>
          <Text style={styles.itemsTitle}>Your items</Text>
          {order.order_items.map((line) => (
            <View key={line.id} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {line.quantity}× {(line.menu_items as { name: string } | null)?.name ?? 'Item'}
              </Text>
              <Text style={styles.itemPrice}>${Number(line.total_price).toFixed(2)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: accent }]}
        onPress={() => navigation.navigate('Menu')}
      >
        <Text style={styles.primaryBtnText}>Add more items</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('GuestRequests')}>
        <Text style={styles.secondaryBtnText}>Request something</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: accent }]}
        onPress={() => navigation.navigate('Payment', { mode: 'close', tabTotal })}
      >
        <Text style={styles.primaryBtnText}>
          Pay & close tab{tabTotal > 0 ? ` ($${tabTotal.toFixed(2)})` : ''}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkBtn}
        onPress={() => navigation.navigate('Payment', { mode: 'setup' })}
      >
        <Text style={[styles.linkBtnText, { color: accent }]}>Save card for later</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  content: { padding: 24, alignItems: 'stretch' },
  title: { fontSize: 28, fontFamily: theme.fonts.display, marginBottom: 16, textAlign: 'center', color: theme.colors.ink },
  statusPill: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.radii.full, marginBottom: 24 },
  statusPillText: { fontFamily: theme.fonts.sansBold, fontSize: 14, textTransform: 'uppercase', color: theme.colors.ink },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  step: { alignItems: 'center', flex: 1 },
  bar: { width: '100%', height: 6, borderRadius: theme.radii.full, backgroundColor: theme.colors.border, marginBottom: 8 },
  label: { fontSize: 10, color: theme.colors.muted, textTransform: 'uppercase', textAlign: 'center', fontFamily: theme.fonts.sans },
  labelActive: { color: theme.colors.ink, fontFamily: theme.fonts.sansBold },
  itemsBox: { backgroundColor: theme.colors.surface, borderRadius: theme.radii.lg, padding: 16, marginBottom: 20, ...theme.shadows.md },
  itemsTitle: { fontFamily: theme.fonts.display, fontSize: 16, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.border },
  itemName: { fontFamily: theme.fonts.sans, flex: 1 },
  itemPrice: { fontFamily: theme.fonts.sansBold },
  secondaryBtn: {
    borderWidth: 1.5,
    borderColor: theme.colors.ink,
    borderRadius: theme.radii.full,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: theme.colors.surface,
  },
  secondaryBtnText: { fontFamily: theme.fonts.display, color: theme.colors.ink },
  primaryBtn: { padding: 16, borderRadius: theme.radii.full, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: '#FFF', fontFamily: theme.fonts.display, fontSize: 15 },
  linkBtn: { alignItems: 'center', padding: 12 },
  linkBtnText: { fontFamily: theme.fonts.display },
});
