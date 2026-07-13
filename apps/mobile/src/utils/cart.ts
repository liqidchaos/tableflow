export interface CartModifier {
  modifier_id: string;
  option_id: string;
}

export interface CartLineInput {
  item_id: string;
  price: number;
  quantity: number;
  modifiers: CartModifier[];
  special_instructions?: string;
  modifierPriceDeltas?: number[];
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

export function lineTotal(line: CartLineInput): number {
  return unitPrice(line.price, line.modifierPriceDeltas) * line.quantity;
}

export function cartTotal(lines: CartLineInput[]): number {
  return lines.reduce((sum, line) => sum + lineTotal(line), 0);
}
