import { createContext, useContext, useMemo, useState } from 'react';
import { useSettings } from './SettingsContext.jsx';

const CartContext = createContext(null);

const readStoredCart = () => {
  try {
    return JSON.parse(localStorage.getItem('uva_cart')) || [];
  } catch (error) {
    return [];
  }
};

const getVariationQuantity = (variation) => Number(variation?.quantity ?? variation?.stock ?? 0);

const getItemPrice = (item) => Number(
  item.unitPrice
  ?? item.variation?.price
  ?? item.product?.salePrice
  ?? item.product?.price
  ?? 0
);

const getItemStock = (item) => (
  item.variation
    ? getVariationQuantity(item.variation)
    : Number(item.product?.stock || 0)
);

export function CartProvider({ children }) {
  const [items, setItems] = useState(readStoredCart);
  const { settings } = useSettings();
  const allowOutOfStockPurchase = Boolean(settings.allowOutOfStockPurchase);

  const persist = (nextItems) => {
    localStorage.setItem('uva_cart', JSON.stringify(nextItems));
    setItems(nextItems);
  };

  const addItem = (product, options = {}) => {
    const selectedVariation = options.variation || null;
    const selectedSize = options.size || selectedVariation?.size || product.sizes?.[0] || null;
    const selectedColor = options.color || selectedVariation?.color || product.colors?.[0] || null;
    const variationId = options.variationId || selectedVariation?.id || null;
    const quantity = Number(options.quantity || 1);
    const availableStock = selectedVariation
      ? getVariationQuantity(selectedVariation)
      : Number(product.stock || 0);

    if (!allowOutOfStockPurchase && availableStock <= 0) {
      return false;
    }

    const key = variationId
      ? `${product.id}-${variationId}`
      : `${product.id}-${selectedSize || 'sem-tamanho'}-${selectedColor || 'sem-cor'}`;
    const existingItem = items.find((item) => item.key === key);
    const nextQuantity = allowOutOfStockPurchase
      ? Number(existingItem?.quantity || 0) + quantity
      : existingItem
        ? Math.min(existingItem.quantity + quantity, availableStock)
        : Math.min(quantity, availableStock);

    if (existingItem) {
      persist(items.map((item) => (
        item.key === key
          ? { ...item, quantity: nextQuantity }
          : item
      )));
      return true;
    }

    persist([
      ...items,
      {
        key,
        product,
        variationId,
        variation: selectedVariation,
        size: selectedSize,
        color: selectedColor,
        quantity: nextQuantity,
        unitPrice: Number(selectedVariation?.price ?? product.salePrice ?? product.price)
      }
    ]);

    return true;
  };

  const updateQuantity = (key, quantity) => {
    const nextQuantity = Number(quantity);

    if (nextQuantity < 1) {
      return;
    }

    persist(items.map((item) => {
      if (item.key !== key) {
        return item;
      }

      const availableStock = getItemStock(item);
      const cappedQuantity = !allowOutOfStockPurchase && availableStock > 0
        ? Math.min(nextQuantity, availableStock)
        : nextQuantity;

      return {
        ...item,
        quantity: Math.max(1, cappedQuantity)
      };
    }));
  };

  const removeItem = (key) => {
    persist(items.filter((item) => item.key !== key));
  };

  const clearCart = () => {
    persist([]);
  };

  const subtotal = items.reduce((total, item) => (
    total + getItemPrice(item) * item.quantity
  ), 0);

  const value = useMemo(() => ({
    items,
    itemsCount: items.reduce((total, item) => total + item.quantity, 0),
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart
  }), [allowOutOfStockPurchase, items, subtotal]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
