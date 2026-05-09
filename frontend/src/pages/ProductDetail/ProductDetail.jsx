import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProductCard from '../../components/ProductCard/ProductCard.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import { api } from '../../services/api.js';
import './ProductDetail.css';

const getVariationQuantity = (variation) => Number(variation?.quantity ?? variation?.stock ?? 0);

const getInitialVariation = (product) => {
  const variations = (product?.variations || []).filter((variation) => variation.active !== false);
  return variations.find((variation) => getVariationQuantity(variation) > 0) || variations[0] || null;
};

const getColorImages = (product, color) => {
  const images = product?.images || [];
  const colorImages = images.filter((image) => image.color === color);
  const productImages = images.filter((image) => !image.color);

  if (colorImages.length) {
    return colorImages;
  }

  if (productImages.length) {
    return productImages;
  }

  return images;
};

export default function ProductDetail() {
  const { slug } = useParams();
  const { addItem } = useCart();
  const { settings } = useSettings();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [selectedImageId, setSelectedImageId] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(`/products/${slug}`)
      .then(({ data }) => {
        const nextProduct = data.product;
        const initialVariation = getInitialVariation(nextProduct);
        const initialImages = getColorImages(nextProduct, initialVariation?.color);
        setProduct(nextProduct);
        setSize(initialVariation?.size || '');
        setColor(initialVariation?.color || '');
        setQuantity(1);
        setSelectedImageId(initialImages[0]?.id || '');

        if (nextProduct?.category?.slug) {
          return api.get('/products', { params: { category: nextProduct.category.slug } })
            .then((response) => {
              setRelatedProducts((response.data.products || [])
                .filter((item) => item.id !== nextProduct.id)
                .slice(0, 3));
            });
        }

        setRelatedProducts([]);
        return null;
      })
      .catch(() => {
        setProduct(null);
        setRelatedProducts([]);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  const activeVariations = useMemo(() => (
    (product?.variations || []).filter((variation) => variation.active !== false)
  ), [product]);

  const colorOptions = useMemo(() => {
    const groups = new Map();

    activeVariations.forEach((variation) => {
      if (!variation.color) {
        return;
      }

      const current = groups.get(variation.color) || {
        name: variation.color,
        hex: variation.colorHex || '#000000',
        stock: 0
      };

      current.stock += getVariationQuantity(variation);
      groups.set(variation.color, current);
    });

    return [...groups.values()];
  }, [activeVariations]);

  const sizes = useMemo(() => {
    const values = activeVariations
      .filter((variation) => !color || variation.color === color)
      .map((variation) => variation.size)
      .filter(Boolean);
    return [...new Set(values)];
  }, [activeVariations, color]);

  const selectedVariation = useMemo(() => {
    if (!activeVariations.length) {
      return null;
    }

    return activeVariations.find((variation) => (
      (!color || variation.color === color)
      && (!size || variation.size === size)
    )) || null;
  }, [activeVariations, color, size]);

  const galleryImages = useMemo(() => getColorImages(product, color), [product, color]);

  const hasVariations = activeVariations.length > 0;
  const allowOutOfStockPurchase = Boolean(settings.allowOutOfStockPurchase);
  const availableStock = selectedVariation
    ? getVariationQuantity(selectedVariation)
    : Number(product?.stock || 0);
  const canBuy = hasVariations
    ? Boolean(selectedVariation && (allowOutOfStockPurchase || availableStock > 0))
    : allowOutOfStockPurchase || availableStock > 0;
  const currentPrice = Number(selectedVariation?.price || product?.salePrice || product?.price || 0);
  const oldPrice = selectedVariation?.price ? null : product?.salePrice ? product?.price : null;
  const selectedSku = selectedVariation?.sku || product?.sku;
  const showSoldOut = !allowOutOfStockPurchase && !canBuy && (!hasVariations || selectedVariation);

  useEffect(() => {
    if (!activeVariations.length || !color || !sizes.length) {
      return;
    }

    if (!sizes.includes(size)) {
      setSize(sizes[0]);
    }
  }, [activeVariations.length, color, size, sizes]);

  useEffect(() => {
    const currentImageExists = galleryImages.some((image) => image.id === selectedImageId);

    if (!currentImageExists) {
      setSelectedImageId(galleryImages[0]?.id || '');
    }
  }, [galleryImages, selectedImageId]);

  useEffect(() => {
    setQuantity((current) => {
      if (!allowOutOfStockPurchase && availableStock <= 0) {
        return 1;
      }

      return allowOutOfStockPurchase
        ? Math.max(1, current)
        : Math.min(Math.max(1, current), availableStock);
    });
  }, [allowOutOfStockPurchase, availableStock, selectedVariation?.id]);

  if (loading) {
    return (
      <main className="page-shell page-shell--center">
        <h1>Carregando produto...</h1>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="page-shell page-shell--center">
        <h1>Produto nao encontrado</h1>
        <Link className="button" to="/produtos">Voltar para produtos</Link>
      </main>
    );
  }

  const handleAdd = () => {
    if (!canBuy) {
      return;
    }

    addItem(product, {
      variation: selectedVariation,
      size: selectedVariation?.size || size,
      color: selectedVariation?.color || color,
      quantity
    });
  };

  const selectedImage = galleryImages.find((image) => image.id === selectedImageId) || galleryImages[0];

  return (
    <main className="page-shell product-detail">
      <section className="product-detail__main">
        <div className={`product-detail__gallery ${galleryImages.length > 1 ? '' : 'product-detail__gallery--single'}`}>
          {galleryImages.length > 1 && (
            <div className="product-detail__thumbs">
              {galleryImages.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  className={image.id === selectedImage?.id ? 'is-selected' : ''}
                  onClick={() => setSelectedImageId(image.id)}
                  aria-label={`Ver imagem ${index + 1}`}
                >
                  <img src={image.url} alt={image.altText || product.name} />
                </button>
              ))}
            </div>
          )}

          <div className={`product-detail__visual product-detail__visual--${product.imageTone || 'mixed'}`}>
            {selectedImage?.url && <img src={selectedImage.url} alt={selectedImage.altText || product.name} />}
            {product.onSale && <span className="product-detail__tag">Oferta</span>}
          </div>
        </div>

        <div className="product-detail__info">
          <span className="status-pill">{product.category?.name || 'Produto'}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="product-detail__price">
            {oldPrice && <span>{formatCurrency(oldPrice)}</span>}
            <strong>{formatCurrency(currentPrice)}</strong>
          </div>

          <div className="product-detail__options">
            {colorOptions.length > 0 && (
              <div>
                <h2>Cor</h2>
                <div className="product-detail__swatches">
                  {colorOptions.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      className={[
                        color === item.name ? 'is-selected' : '',
                        !allowOutOfStockPurchase && item.stock <= 0 ? 'is-unavailable' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => setColor(item.name)}
                      aria-label={`Cor ${item.name}`}
                      title={item.name}
                    >
                      <span style={{ backgroundColor: item.hex }} />
                      <strong>{item.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {sizes.length > 0 && (
              <div>
                <h2>Tamanho</h2>
                <div className="product-detail__choice-list">
                  {sizes.map((item) => {
                    const optionVariation = activeVariations.find((variation) => (
                      (!color || variation.color === color) && variation.size === item
                    ));
                    const optionStock = getVariationQuantity(optionVariation);

                    return (
                      <button
                        key={item}
                        type="button"
                        className={[
                          size === item ? 'is-selected' : '',
                          !allowOutOfStockPurchase && optionStock <= 0 ? 'is-unavailable' : ''
                        ].filter(Boolean).join(' ')}
                        onClick={() => setSize(item)}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {showSoldOut && (
            <p className="product-detail__availability is-unavailable">
              Esgotado
            </p>
          )}

          <div className="product-detail__buy">
            <div className="product-detail__stepper">
              <button
                type="button"
                onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                disabled={!canBuy || quantity <= 1}
                aria-label="Reduzir quantidade"
              >
                <Minus size={18} />
              </button>
              <strong>{quantity}</strong>
              <button
                type="button"
                onClick={() => setQuantity((current) => (
                  allowOutOfStockPurchase ? current + 1 : Math.min(availableStock, current + 1)
                ))}
                disabled={!canBuy || (!allowOutOfStockPurchase && quantity >= availableStock)}
                aria-label="Aumentar quantidade"
              >
                <Plus size={18} />
              </button>
            </div>

            <button type="button" className="button" onClick={handleAdd} disabled={!canBuy}>
              <ShoppingBag size={18} />
              {canBuy ? 'Adicionar ao carrinho' : showSoldOut ? 'Esgotado' : 'Selecione opcoes'}
            </button>
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section>
          <div className="section-title">
            <h2>Tambem combina</h2>
          </div>
          <div className="grid grid--products">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
