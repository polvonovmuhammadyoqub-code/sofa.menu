import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { CartItem, MenuItem } from '../types';

interface CartContextType {
  items: CartItem[];
  addToCart: (menuItem: MenuItem, quantity?: number, selectedOptions?: string[], notes?: string) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCount: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  tableNumber: string | null;
  setTableNumber: (table: string | null) => void;
}

export const MAX_LINE_QUANTITY = 20;

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  totalAmount: 0,
  totalCount: 0,
  isCartOpen: false,
  setIsCartOpen: () => {},
  tableNumber: null,
  setTableNumber: () => {},
});

function itemTotal(menuItem: MenuItem, quantity: number, selectedOptions: string[]) {
  const unitPrice = (menuItem.options ?? []).reduce((price, option) =>
    selectedOptions.includes(option.name) ? price + option.price_modifier : price, menuItem.price);
  return unitPrice * quantity;
}

function restoreCart(storageKey: string, menuItems?: MenuItem[]): CartItem[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(saved)) return [];
    const currentMenu = menuItems ? new Map(menuItems.map((item) => [item.id, item])) : undefined;
    return saved.flatMap((line: CartItem) => {
      if (!line?.menuItem?.id || !Number.isInteger(line.quantity) || line.quantity < 1) return [];
      const menuItem = currentMenu ? currentMenu.get(line.menuItem.id) : line.menuItem;
      if (!menuItem?.is_available) return [];
      const quantity = Math.min(line.quantity, MAX_LINE_QUANTITY);
      const selectedOptions = (menuItem.options ?? [])
        .filter((option) => option.is_required || (Array.isArray(line.selectedOptions) && line.selectedOptions.includes(option.name)))
        .map((option) => option.name);
      return [{ menuItem, quantity, selectedOptions, notes: typeof line.notes === 'string' ? line.notes : undefined, itemTotal: itemTotal(menuItem, quantity, selectedOptions) }];
    });
  } catch {
    return [];
  }
}

interface CartProviderProps {
  children: ReactNode;
  storageKey?: string;
  initialTable?: string | null;
  menuItems?: MenuItem[];
}

export function CartProvider({ children, storageKey = 'sofa_cart', initialTable = null, menuItems }: CartProviderProps) {
  const [items, setItems] = useState(() => restoreCart(storageKey, menuItems));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState<string | null>(initialTable);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // The cart can still be used for the current visit.
    }
  }, [storageKey, items]);

  function addToCart(menuItem: MenuItem, quantity = 1, selectedOptions: string[] = [], notes?: string) {
    const options = [...new Set(selectedOptions)].sort();
    setItems((current) => {
      const existingIndex = current.findIndex((line) =>
        line.menuItem.id === menuItem.id &&
        JSON.stringify([...line.selectedOptions].sort()) === JSON.stringify(options) &&
        line.notes === notes
      );
      if (existingIndex === -1) {
        const amount = Math.min(quantity, MAX_LINE_QUANTITY);
        return [...current, { menuItem, quantity: amount, selectedOptions: options, notes, itemTotal: itemTotal(menuItem, amount, options) }];
      }
      const next = [...current];
      const amount = Math.min(next[existingIndex].quantity + quantity, MAX_LINE_QUANTITY);
      next[existingIndex] = { menuItem, quantity: amount, selectedOptions: options, notes, itemTotal: itemTotal(menuItem, amount, options) };
      return next;
    });
  }

  function updateQuantity(index: number, quantity: number) {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    const amount = Math.min(quantity, MAX_LINE_QUANTITY);
    setItems((current) => current.map((line, position) => position === index
      ? { ...line, quantity: amount, itemTotal: itemTotal(line.menuItem, amount, line.selectedOptions) }
      : line
    ));
  }

  function removeFromCart(index: number) {
    setItems((current) => current.filter((_, position) => position !== index));
  }

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart: () => setItems([]),
      totalAmount: items.reduce((sum, item) => sum + item.itemTotal, 0),
      totalCount: items.reduce((sum, item) => sum + item.quantity, 0),
      isCartOpen,
      setIsCartOpen,
      tableNumber,
      setTableNumber,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
