import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Image,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { apiFetch } from '../lib/api';
import { useSession } from '../context/SessionContext';
import { useOrderStatus } from '../hooks/useOrderStatus';
import { registerGuestPushNotifications } from '../utils/notifications';
import { theme, statusColor } from '../lib/theme';
import type { MenuCategoryWithItems } from '@tableflow/types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Menu'>;

export function MenuScreen({ navigation }: Props) {
  const { venueId, sessionId, sessionToken, guestId, tableName, venueName, brandColor, activeOrderId } = useSession();
  const [categories, setCategories] = useState<MenuCategoryWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dietary, setDietary] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const orderStatus = useOrderStatus(activeOrderId ?? '', sessionToken ?? undefined);

  const accent = brandColor ?? theme.colors.flow;

  useEffect(() => {
    if (!venueId) return;
    apiFetch(`/venues/${venueId}/menu`)
      .then((data) => setCategories(data.categories))
      .finally(() => setLoading(false));
  }, [venueId]);

  useEffect(() => {
    if (sessionId && guestId && sessionToken) {
      registerGuestPushNotifications(sessionId, guestId, sessionToken).catch(() => {});
    }
  }, [sessionId, guestId, sessionToken]);

  const items = useMemo(() => {
    const source = selectedCategoryId
      ? categories.filter((c) => c.id === selectedCategoryId)
      : categories;
    const all = source.flatMap((c) =>
      c.items.map((item) => ({ ...item, categoryName: c.name }))
    );
    return all.filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (dietary && !item.dietary_tags?.includes(dietary)) return false;
      return true;
    });
  }, [categories, search, dietary, selectedCategoryId]);

  const hasFilters = Boolean(search || dietary || selectedCategoryId);

  const goToOrderStatus = useCallback(() => {
    if (activeOrderId) navigation.navigate('OrderStatus', { orderId: activeOrderId });
  }, [activeOrderId, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={accent} />
        <Text style={styles.loadingText}>Getting your menu</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.venueName}>{venueName}</Text>
        <Text style={styles.tableName}>{tableName}</Text>
      </View>

      {activeOrderId && (
        <TouchableOpacity style={[styles.statusBar, { borderColor: statusColor(orderStatus) }]} onPress={goToOrderStatus}>
          <Text style={styles.statusLabel}>Your order</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor(orderStatus) }]}>
            <Text style={styles.statusPillText}>
              {orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
            </Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={styles.filters}>
        <TextInput
          style={styles.search}
          placeholder="Search menu"
          placeholderTextColor={theme.colors.muted}
          value={search}
          onChangeText={setSearch}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryTabs}>
          <TouchableOpacity
            style={[styles.categoryTab, !selectedCategoryId && { backgroundColor: accent }]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <Text style={[styles.categoryTabText, !selectedCategoryId && styles.categoryTabTextActive]}>All</Text>
          </TouchableOpacity>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryTab,
                selectedCategoryId === cat.id && { backgroundColor: accent },
              ]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text
                style={[
                  styles.categoryTabText,
                  selectedCategoryId === cat.id && styles.categoryTabTextActive,
                ]}
              >
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <View style={styles.tagRow}>
          {['vegan', 'vegetarian', 'gluten-free'].map((tag) => (
            <TouchableOpacity
              key={tag}
              style={[styles.tag, dietary === tag && { backgroundColor: accent }]}
              onPress={() => setDietary(dietary === tag ? null : tag)}
            >
              <Text style={[styles.tagText, dietary === tag && { color: '#FFF' }]}>{tag}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100, flexGrow: 1 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🍽</Text>
            <Text style={styles.emptyTitle}>{hasFilters ? 'No items match' : 'Menu is empty'}</Text>
            <Text style={styles.emptyText}>
              {hasFilters ? 'Try adjusting your search or dietary filters.' : 'Check back soon.'}
            </Text>
            {hasFilters && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => { setSearch(''); setDietary(null); setSelectedCategoryId(null); }}
              >
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, !item.is_available && styles.unavailable]}
            onPress={() => item.is_available && navigation.navigate('ItemDetail', { itemId: item.id, item })}
            disabled={!item.is_available}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} resizeMode="cover" />
            ) : null}
            <View style={styles.cardRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.price}>${Number(item.price).toFixed(2)}</Text>
            </View>
            {item.description && <Text style={styles.description}>{item.description}</Text>}
            {item.allergens?.length > 0 && (
              <Text style={styles.allergens}>Contains: {item.allergens.join(', ')}</Text>
            )}
            {!item.is_available && <Text style={styles.soldOut}>Unavailable</Text>}
          </TouchableOpacity>
        )}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.requestButton} onPress={() => navigation.navigate('GuestRequests')}>
          <Text style={styles.requestText}>Request water / napkins</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.cartButton, { backgroundColor: accent }]}
          onPress={() => navigation.navigate('Cart')}
        >
          <Text style={styles.cartButtonText}>View Cart</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.paper },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: theme.colors.muted, fontFamily: theme.fonts.sans },
  header: { padding: 20, backgroundColor: theme.colors.surface, ...theme.shadows.sm },
  venueName: { fontSize: 22, fontFamily: theme.fonts.display, color: theme.colors.ink },
  tableName: { color: theme.colors.muted, marginTop: 4, fontFamily: theme.fonts.sans },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statusLabel: { fontFamily: theme.fonts.display, fontSize: 14, color: theme.colors.ink },
  statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: theme.radii.full },
  statusPillText: { fontFamily: theme.fonts.sansBold, fontSize: 11, textTransform: 'uppercase', color: theme.colors.ink },
  filters: { padding: 12, backgroundColor: theme.colors.surface, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  search: {
    backgroundColor: theme.colors.paper,
    borderRadius: theme.radii.md,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    fontFamily: theme.fonts.sans,
  },
  categoryTabs: { marginBottom: 8 },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.paper,
    marginRight: 8,
  },
  categoryTabText: { fontSize: 13, fontFamily: theme.fonts.display, color: theme.colors.ink },
  categoryTabTextActive: { color: '#FFF' },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radii.full, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  tagText: { fontSize: 13, color: theme.colors.ink, fontFamily: theme.fonts.sans },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.md,
    overflow: 'hidden',
  },
  itemImage: { width: '100%', height: 140, borderRadius: theme.radii.md, marginBottom: 12, marginHorizontal: -16, marginTop: -16, maxWidth: undefined },
  unavailable: { opacity: 0.5 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 18, fontFamily: theme.fonts.display, flex: 1 },
  price: { fontSize: 17, fontFamily: theme.fonts.sansBold },
  description: { color: theme.colors.muted, marginTop: 6, fontSize: 13, fontFamily: theme.fonts.sans },
  allergens: { color: theme.colors.muted, fontSize: 12, marginTop: 4, fontFamily: theme.fonts.sans },
  soldOut: { color: theme.colors.error, fontFamily: theme.fonts.sansBold, marginTop: 8 },
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontFamily: theme.fonts.display, fontSize: 18, marginBottom: 8, color: theme.colors.ink },
  emptyText: { color: theme.colors.muted, fontFamily: theme.fonts.sans, textAlign: 'center', marginBottom: 16 },
  clearBtn: { borderWidth: 1.5, borderColor: theme.colors.ink, borderRadius: theme.radii.full, paddingHorizontal: 20, paddingVertical: 10 },
  clearBtnText: { fontFamily: theme.fonts.display, color: theme.colors.ink },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: 8,
  },
  requestButton: { padding: 12, alignItems: 'center' },
  requestText: { color: theme.colors.muted, fontFamily: theme.fonts.display },
  cartButton: { padding: 16, borderRadius: theme.radii.full, alignItems: 'center' },
  cartButtonText: { color: '#FFF', fontFamily: theme.fonts.display, fontSize: 15 },
});
