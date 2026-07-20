import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useCart } from '../context/CartContext';
import { lineTotal } from '../utils/cart';
import type { UpsellSuggestion } from '@tableflow/types';
import { theme } from '../lib/theme';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Cart'>;

export function CartScreen({ navigation }: Props) {
  const { sessionId, sessionToken, guestId, venueId, brandColor, setActiveOrderId, tabMode } = useSession();
  const { items, removeItem, clearCart, total, addItem, itemCount } = useCart();
  const [loading, setLoading] = useState(false);
  const [optimistic, setOptimistic] = useState(false);
  const [suggestions, setSuggestions] = useState<UpsellSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const accent = brandColor ?? theme.colors.gold;

  const fetchUpsells = useCallback(async () => {
    if (!venueId || !sessionToken || items.length === 0) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const data = await apiFetch(`/venues/${venueId}/ai/upsell`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({ current_items: items.map((i) => i.item_id) }),
      });
      setSuggestions(data.suggestions ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [venueId, sessionToken, items]);

  useEffect(() => {
    fetchUpsells();
  }, [fetchUpsells]);

  async function submitOrder() {
    if (!sessionId || !sessionToken || !guestId) return;

    setOptimistic(true);
    setActiveOrderId('pending');
    setLoading(true);

    try {
      const data = await apiFetch('/orders', {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: JSON.stringify({
          session_id: sessionId,
          guest_id: guestId,
          items: items.map((i) => ({
            item_id: i.item_id,
            quantity: i.quantity,
            modifiers: i.modifiers,
            special_instructions: i.special_instructions,
            course: i.course,
          })),
        }),
      });
      clearCart();
      setActiveOrderId(data.order_id);
      if (tabMode === 'pay_per_order') {
        navigation.navigate('Payment', {
          mode: 'pay_order',
          orderId: data.order_id,
          orderTotal: Number(data.subtotal ?? total),
        });
      } else {
        navigation.navigate('OrderStatus', { orderId: data.order_id });
      }
    } catch (err) {
      setActiveOrderId(null);
      Alert.alert('Error', err instanceof Error ? err.message : 'Order failed');
    } finally {
      setLoading(false);
      setOptimistic(false);
    }
  }

  function addSuggestion(suggestion: UpsellSuggestion) {
    if (!suggestion.name || suggestion.price == null) return;
    addItem({
      item_id: suggestion.item_id,
      name: suggestion.name,
      price: suggestion.price,
      quantity: 1,
      modifiers: [],
      course: 'main',
    });
    setSuggestions((prev) => prev.filter((s) => s.item_id !== suggestion.item_id));
  }

  return (
    <View style={styles.container}>
      {optimistic && (
        <View style={[styles.optimisticBar, { backgroundColor: accent }]}>
          <Text style={styles.optimisticText}>Submitting order…</Text>
        </View>
      )}
      <FlatList
        data={items}
        keyExtractor={(item) => item.lineKey}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.empty}>Your cart is empty</Text>}
        ListHeaderComponent={
          <>
            {items.length > 0 && (
              <Text style={styles.cartCount}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} in your order
              </Text>
            )}
            {suggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
              <Text style={styles.suggestionsTitle}>You might also like</Text>
              {loadingSuggestions ? (
                <ActivityIndicator color={accent} size="small" />
              ) : (
                suggestions.map((s) => (
                  <TouchableOpacity key={s.item_id} style={styles.suggestionRow} onPress={() => addSuggestion(s)}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.suggestionName}>{s.name}</Text>
                      <Text style={styles.suggestionReason}>{s.reason}</Text>
                    </View>
                    {s.price != null && (
                      <Text style={[styles.suggestionPrice, { color: accent }]}>+${s.price.toFixed(2)}</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
              </View>
            )}
          </>
        }
        renderItem={({ item }) => (
          <View style={styles.row}>
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.rowImage} resizeMode="cover" />
            ) : (
              <View style={[styles.rowImage, styles.rowImagePlaceholder]} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.itemName}>{item.quantity}x {item.name}</Text>
              {item.modifierLabels && item.modifierLabels.length > 0 && (
                <Text style={styles.modifiers}>{item.modifierLabels.join(', ')}</Text>
              )}
              {item.special_instructions && (
                <Text style={styles.instructions}>{item.special_instructions}</Text>
              )}
            </View>
            <Text style={styles.price}>${lineTotal(item).toFixed(2)}</Text>
            <TouchableOpacity onPress={() => removeItem(item.lineKey)}>
              <Text style={styles.remove}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
      {items.length > 0 && (
        <View style={styles.footer}>
          <Text style={styles.total}>Total: ${total.toFixed(2)}</Text>
          {loading ? (
            <ActivityIndicator color={accent} />
          ) : (
            <TouchableOpacity style={[styles.submitButton, { backgroundColor: accent }]} onPress={submitOrder}>
              <Text style={styles.submitText}>Confirm Order</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  optimisticBar: { padding: 12, alignItems: 'center' },
  optimisticText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold, fontSize: 14 },
  empty: { textAlign: 'center', color: theme.colors.onSurfaceVariant, marginTop: 40, fontFamily: theme.fonts.sans },
  cartCount: {
    fontFamily: theme.fonts.sansBold,
    fontSize: 12,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  suggestionsBox: {
    backgroundColor: theme.colors.surfaceLow,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
  },
  suggestionsTitle: { fontFamily: theme.fonts.sansBold, fontSize: 15, marginBottom: 12, color: theme.colors.gold },
  suggestionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant },
  suggestionName: { fontFamily: theme.fonts.sansBold, fontSize: 14, color: theme.colors.onSurface },
  suggestionReason: { color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 2, fontFamily: theme.fonts.sans },
  suggestionPrice: { fontFamily: theme.fonts.sansBold, marginLeft: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceLow,
    borderWidth: 1,
    borderColor: theme.colors.outlineVariant,
    padding: 12,
    borderRadius: theme.radii.lg,
    marginBottom: 8,
    gap: 12,
  },
  rowImage: { width: 56, height: 56, borderRadius: theme.radii.md },
  rowImagePlaceholder: { backgroundColor: theme.colors.surfaceHigh },
  itemName: { fontFamily: theme.fonts.sansBold, fontSize: 15, color: theme.colors.onSurface },
  modifiers: { color: theme.colors.onSurfaceVariant, fontSize: 12, marginTop: 2, fontFamily: theme.fonts.sans },
  instructions: { color: theme.colors.onSurfaceVariant, fontSize: 13, marginTop: 4, fontFamily: theme.fonts.sans },
  price: { fontFamily: theme.fonts.sansBold, marginRight: 12, color: theme.colors.onSurface },
  remove: { color: theme.colors.error, fontSize: 18 },
  footer: { padding: 16, backgroundColor: theme.colors.bg, borderTopWidth: 1, borderTopColor: theme.colors.outlineVariant },
  total: { fontSize: 18, fontFamily: theme.fonts.sansBold, marginBottom: 12, color: theme.colors.onSurface },
  submitButton: { padding: 16, borderRadius: theme.radii.full, alignItems: 'center' },
  submitText: { color: theme.colors.goldOn, fontFamily: theme.fonts.sansBold, letterSpacing: 0.5 },
});
