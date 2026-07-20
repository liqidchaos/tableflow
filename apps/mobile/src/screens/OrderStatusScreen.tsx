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
  const accent = brandColor ?? theme.colors.gold;

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
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 24, alignItems: 'stretch' },
  title: { fontSize: 28, fontFamily: theme.fonts.serif, marginBottom: 16, textAlign: 'center', color: theme.colors.onSurface },
  statusPill: { alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: theme.radii.full, marginBottom: 24 },
  statusPillText: { fontFamily: theme.fonts.sansBold, fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5, color: theme.colors.goldOn },
  steps: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  step: { alignItems: 'center', flex: 1 },
  bar: { width: '100%', height: 4, borderRadius: theme.radii.full, backgroundColor: theme.colors.outlineVariant, marginBottom: 8 },
  label: { fontSize: 10, color: theme.colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center', fontFamily: theme.fonts.sans },
  labelActive: { color: theme.colors.onSurface, fontFamily: theme.fonts.sansBold },
  itemsBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: 16,
    marginBottom: 20,
  },
  itemsTitle: { fontFamily: theme.fonts.serif, fontSize: 16, marginBottom: 12, color: theme.colors.onSurface },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant },
  itemName: { fontFamily: theme.fonts.sans, flex: 1, color: theme.colors.onSurface },
  itemPrice: { fontFamily: theme.fonts.sansBold, color: theme.colors.onSurface },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    borderRadius: theme.radii.full,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: theme.colors.surfaceLow,
  },
  secondaryBtnText: { fontFamily: theme.fonts.sansBold, color: theme.colors.onSurface },
  primaryBtn: { padding: 16, borderRadius: theme.radii.full, alignItems: 'center', marginBottom: 12 },
  primaryBtnText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold, fontSize: 15, letterSpacing: 0.5 },
  linkBtn: { alignItems: 'center', padding: 12 },
  linkBtnText: { fontFamily: theme.fonts.sansBold },
});
