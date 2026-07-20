export interface CartModifier {
  modifier_id: string;
  option_id: string;
}

export interface CartLine {
  lineKey: string;
  item_id: string;
  name: string;
  price: number;
  quantity: number;
  modifiers: CartModifier[];
  modifierLabels?: string[];
  modifierPriceDeltas?: number[];
  special_instructions?: string;
  course: string;
  image_url?: string;
}

export function cartLineKey(line: {
  item_id: string;
  modifiers: CartModifier[];
  special_instructions?: string;
}): string {
  const modKey = [...line.modifiers]
    .sort((a, b) => a.modifier_id.localeCompare(b.modifier_id))
    .map((m) => `${m.modifier_id}:${m.option_id}`)
    .join('|');
  return `${line.item_id}::${modKey}::${line.special_instructions ?? ''}`;
}

export function unitPrice(basePrice: number, modifierPriceDeltas: number[] = []): number {
  return basePrice + modifierPriceDeltas.reduce((sum, delta) => sum + delta, 0);
}

export function lineTotal(line: {
  price: number;
  quantity: number;
  modifierPriceDeltas?: number[];
}): number {
  return unitPrice(line.price, line.modifierPriceDeltas) * line.quantity;
}

export function cartTotal(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}
