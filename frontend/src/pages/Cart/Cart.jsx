import { Minus, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../data/mockCatalog.js';
import { useCart } from '../../contexts/CartContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import './Cart.css';

const getVariationQuantity = (variation) => Number(variation?.quantity ?? variation?.stock ?? 0);

const getItemPrice = (item) => Number(
  item.unitPrice
  ?? item.variation?.price
  ?? item.product.salePrice
  ?? item.product.price
);

const getItemStock = (item) => (
  item.variation ? getVariationQuantity(item.variation) : Number(item.product.stock || 0)
);

const getMainImage = (product, color) => (
  product.images?.find((image) => image.color === color && image.isMain)
  || product.images?.find((image) => image.color === color)
  || product.images?.find((image) => !image.color && image.isMain)
  || product.images?.find((image) => !image.color)
  || product.images?.[0]
);

export default function Cart() {
  const { items, subtotal, updateQuantity, removeItem } = useCart();
  const { settings } = useSettings();
  const allowOutOfStockPurchase = Boolean(settings.allowOutOfStockPurchase);

  if (!items.length) {
    return (
      <main className="page-shell page-shell--center cart-empty">
        <h1>Carrinho vazio</h1>
        <p>Escolha suas pecas favoritas e volte para finalizar.</p>
        <Link className="button" to="/produtos">Ver produtos</Link>
      </main>
    );
  }

  return (
    <main className="page-shell cart-page">
      <div className="page-title">
        <div>
          <h1>Carrinho</h1>
          <p>Revise tamanhos, cores e quantidades.</p>
        </div>
      </div>

      <section className="cart-page__layout">
        <div className="cart-page__items">
          {items.map((item) => {
            const price = getItemPrice(item);
            const availableStock = getItemStock(item);
            const itemColor = item.color || item.variation?.color;
            const itemSize = item.size || item.variation?.size;
            const mainImage = getMainImage(item.product, itemColor);

            return (
              <article className="cart-item" key={item.key}>
                <div className={`cart-item__visual cart-item__visual--${item.product.imageTone || 'mixed'}`}>
                  {mainImage?.url && <img src={mainImage.url} alt={mainImage.altText || item.product.name} />}
                </div>
                <div className="cart-item__body">
                  <h2>{item.product.name}</h2>
                  <p>Cor: {itemColor || '-'}</p>
                  <p>Tamanho: {itemSize || '-'}</p>
                  <strong>{formatCurrency(price)}</strong>
                </div>
                <div className="cart-item__actions">
                  <div className="cart-item__stepper">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                      aria-label="Reduzir quantidade"
                    >
                      <Minus size={17} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                      disabled={!allowOutOfStockPurchase && (availableStock <= 0 || item.quantity >= availableStock)}
                      aria-label="Aumentar quantidade"
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => removeItem(item.key)}
                    aria-label="Remover item"
                    title="Remover item"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        <aside className="cart-page__summary">
          <h2>Total do carrinho</h2>
          <div>
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <div>
            <span>Total</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          <Link className="button button--full" to="/checkout">Finalizar compra</Link>
        </aside>
      </section>
    </main>
  );
}
