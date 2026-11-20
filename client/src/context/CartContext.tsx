import React, { createContext, useContext, useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';

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

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('sofa_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('sofa_cart', JSON.stringify(items));
  }, [items]);

  const calculateItemTotal = (menuItem: MenuItem, quantity: number, selectedOptions: string[] = []): number => {
    let price = menuItem.price;
    if (menuItem.options && selectedOptions.length > 0) {
      for (const optName of selectedOptions) {
        const found = menuItem.options.find(o => o.name === optName);
        if (found) price += found.price_modifier;
      }
    }
    return price * quantity;
  };

  const addToCart = (menuItem: MenuItem, quantity = 1, selectedOptions: string[] = [], notes?: string) => {
    setItems((prev) => {
      // Check if identical item with exact same options exists
      const existingIndex = prev.findIndex(
        (i) =>
          i.menuItem.id === menuItem.id &&
          JSON.stringify(i.selectedOptions?.sort()) === JSON.stringify(selectedOptions?.sort()) &&
          i.notes === notes
      );

      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = next[existingIndex].quantity + quantity;
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: newQty,
          itemTotal: calculateItemTotal(menuItem, newQty, selectedOptions),
        };
        return next;
      }

      return [
        ...prev,
        {
          menuItem,
          quantity,
          selectedOptions,
          notes,
          itemTotal: calculateItemTotal(menuItem, quantity, selectedOptions),
        },
      ];
    });
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    setItems((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = {
          ...next[index],
          quantity,
          itemTotal: calculateItemTotal(next[index].menuItem, quantity, next[index].selectedOptions),
        };
      }
      return next;
    });
  };

  const removeFromCart = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.itemTotal, 0);
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalCount,
        isCartOpen,
        setIsCartOpen,
        tableNumber,
        setTableNumber,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
