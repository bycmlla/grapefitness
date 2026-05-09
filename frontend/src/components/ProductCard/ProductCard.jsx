import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import './ProductCard.css';

const getVariationQuantity = (variation) => Number(variation?.quantity ?? variation?.stock ?? 0);

const getTotalStock = (product) => {
  if (Number.isFinite(Number(product.totalStock))) {
    return Number(product.totalStock);
  }

  const variations = (product.variations || []).filter((variation) => variation.active !== false);

  if (variations.length) {
    return variations.reduce((total, variation) => total + getVariationQuantity(variation), 0);
  }

  return Number(product.stock || 0);
};

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const { settings } = useSettings();
  const price = product.salePrice || product.price;
  const mainImage = product.images?.find((image) => image.isMain) || product.images?.[0];
  const activeVariations = (product.variations || []).filter((variation) => variation.active !== false);
  const hasVariations = activeVariations.length > 0;
  const totalStock = getTotalStock(product);
  const outOfStock = !settings.allowOutOfStockPurchase && totalStock <= 0;

  return (
    <article className="product-card">
      <Link
        className={`product-card__visual product-card__visual--${product.imageTone || 'mixed'}`}
        to={`/produto/${product.slug}`}
        aria-label={product.name}
      >
        {mainImage?.url && <img src={mainImage.url} alt={mainImage.altText || product.name} />}
        {product.onSale && <span className="product-card__tag">Oferta</span>}
      </Link>

      <div className="product-card__body">
        <div>
          <p className="product-card__sku">{product.sku}</p>
          <h2>
            <Link to={`/produto/${product.slug}`}>{product.name}</Link>
          </h2>
        </div>

        <div className="product-card__price">
          {product.salePrice && <span>{formatCurrency(product.price)}</span>}
          <strong>{formatCurrency(price)}</strong>
        </div>

        {hasVariations ? (
          outOfStock ? (
            <button type="button" className="button button--full" disabled>
              Indisponivel
            </button>
          ) : (
            <Link className="button button--full" to={`/produto/${product.slug}`}>
              Ver opcoes
            </Link>
          )
        ) : (
          <button
            type="button"
            className="button button--full"
            onClick={() => addItem(product)}
            disabled={outOfStock}
          >
            <ShoppingBag size={18} />
            {outOfStock ? 'Indisponivel' : 'Adicionar'}
          </button>
        )}
      </div>
    </article>
  );
}
