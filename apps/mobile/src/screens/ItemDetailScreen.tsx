import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MenuItemWithModifiers, MenuModifierWithOptions } from '@tableflow/types';
import type { RootStackParamList } from '../navigation/types';
import { useCart } from '../context/CartContext';
import { unitPrice } from '../utils/cart';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

export function ItemDetailScreen({ route, navigation }: Props) {
  const { item } = route.params as { itemId: string; item: MenuItemWithModifiers };
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [selected, setSelected] = useState<Record<string, string[]>>({});

  const { modifierSelections, modifierLabels, modifierPriceDeltas, totalUnitPrice } = useMemo(() => {
    const selections: { modifier_id: string; option_id: string }[] = [];
    const labels: string[] = [];
    const deltas: number[] = [];

    for (const group of item.modifiers ?? []) {
      const optionIds = selected[group.id] ?? [];
      for (const optionId of optionIds) {
        const option = group.options.find((o) => o.id === optionId);
        if (option) {
          selections.push({ modifier_id: group.id, option_id: option.id });
          labels.push(option.name);
          deltas.push(Number(option.price_delta));
        }
      }
    }

    return {
      modifierSelections: selections,
      modifierLabels: labels,
      modifierPriceDeltas: deltas,
      totalUnitPrice: unitPrice(Number(item.price), deltas),
    };
  }, [item, selected]);

  function toggleOption(group: MenuModifierWithOptions, optionId: string) {
    setSelected((prev) => {
      const current = prev[group.id] ?? [];
      const isSelected = current.includes(optionId);

      if (group.max_select === 1) {
        return { ...prev, [group.id]: isSelected ? [] : [optionId] };
      }

      if (isSelected) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (current.length >= group.max_select) return prev;
      return { ...prev, [group.id]: [...current, optionId] };
    });
  }

  function validateModifiers(): boolean {
    for (const group of item.modifiers ?? []) {
      const count = (selected[group.id] ?? []).length;
      if (group.is_required && count < Math.max(1, group.min_select)) {
        Alert.alert('Selection required', `Please choose an option for ${group.group_name}`);
        return false;
      }
      if (count < group.min_select) {
        Alert.alert('Selection required', `Choose at least ${group.min_select} for ${group.group_name}`);
        return false;
      }
    }
    return true;
  }

  function handleAdd() {
    if (!validateModifiers()) return;
    addItem({
      item_id: item.id,
      name: item.name,
      price: Number(item.price),
      quantity,
      modifiers: modifierSelections,
      modifierLabels,
      modifierPriceDeltas,
      special_instructions: instructions || undefined,
      course: 'main',
    });
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container}>
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.heroImage} resizeMode="cover" />
      ) : null}
      <Text style={styles.name}>{item.name}</Text>
      <Text style={styles.price}>${totalUnitPrice.toFixed(2)}</Text>
      {item.description && <Text style={styles.description}>{item.description}</Text>}
      {item.allergens?.length > 0 && (
        <Text style={styles.allergens}>Allergens: {item.allergens.join(', ')}</Text>
      )}

      {(item.modifiers ?? []).map((group) => (
        <View key={group.id} style={styles.modifierGroup}>
          <Text style={styles.modifierTitle}>
            {group.group_name}
            {group.is_required ? ' *' : ''}
          </Text>
          <Text style={styles.modifierHint}>
            {group.max_select === 1 ? 'Choose one' : `Choose up to ${group.max_select}`}
          </Text>
          {group.options
            .filter((o) => o.is_available)
            .map((option) => {
              const isOn = (selected[group.id] ?? []).includes(option.id);
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionRow, isOn && styles.optionRowActive]}
                  onPress={() => toggleOption(group, option.id)}
                >
                  <Text style={[styles.optionName, isOn && styles.optionNameActive]}>{option.name}</Text>
                  {Number(option.price_delta) !== 0 && (
                    <Text style={styles.optionPrice}>
                      {Number(option.price_delta) > 0 ? '+' : ''}${Number(option.price_delta).toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
        </View>
      ))}

      <TextInput
        style={styles.input}
        placeholder="Special instructions (e.g. no onions)"
        value={instructions}
        onChangeText={setInstructions}
      />
      <View style={styles.quantityRow}>
        <TouchableOpacity onPress={() => setQuantity(Math.max(1, quantity - 1))} style={styles.qtyBtn}>
          <Text style={styles.qtyText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.qty}>{quantity}</Text>
        <TouchableOpacity onPress={() => setQuantity(quantity + 1)} style={styles.qtyBtn}>
          <Text style={styles.qtyText}>+</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={handleAdd}>
        <Text style={styles.addButtonText}>
          Add to Cart (${(totalUnitPrice * quantity).toFixed(2)})
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAF8', padding: 20 },
  heroImage: { width: '100%', height: 200, borderRadius: 16, marginBottom: 16, marginHorizontal: -20, maxWidth: undefined },
  name: { fontSize: 28, fontFamily: 'Fraunces_600SemiBold', color: '#0F0F0F' },
  price: { fontSize: 22, fontFamily: 'Inter_600SemiBold', marginVertical: 8 },
  description: { color: '#6B7280', lineHeight: 22, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  allergens: { color: '#D97706', fontSize: 13, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  modifierGroup: { marginBottom: 20 },
  modifierTitle: { fontSize: 16, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  modifierHint: { fontSize: 12, color: '#6B7280', marginBottom: 8, fontFamily: 'Inter_400Regular' },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  optionRowActive: { borderColor: '#E84B2C', backgroundColor: '#FFF0ED' },
  optionName: { fontFamily: 'Inter_400Regular', fontSize: 15, flex: 1 },
  optionNameActive: { fontFamily: 'Inter_600SemiBold', color: '#E84B2C' },
  optionPrice: { fontFamily: 'Inter_600SemiBold', color: '#6B7280' },
  input: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    fontFamily: 'Inter_400Regular',
  },
  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24 },
  qtyBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#E8E6E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: { fontSize: 20, fontFamily: 'Inter_600SemiBold' },
  qty: { fontSize: 20, fontFamily: 'Inter_600SemiBold', minWidth: 30, textAlign: 'center' },
  addButton: { backgroundColor: '#E84B2C', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 32 },
  addButtonText: { color: '#FFF', fontFamily: 'Inter_600SemiBold', fontSize: 15 },
});
