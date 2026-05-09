import { ArrowDown, ArrowUp, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import { api, getApiMessage } from '../../services/api.js';
import './Admin.css';

const initialForm = {
  name: '',
  description: '',
  category_id: '',
  price: '',
  salePrice: '',
  sku: '',
  featured: false,
  isNew: false,
  onSale: false,
  active: true
};

const createLocalId = () => (
  globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`
);

const getMainImage = (product) => product.images?.find((image) => image.isMain) || product.images?.[0];

const createSizeForm = (overrides = {}) => ({
  localId: createLocalId(),
  id: '',
  size: '',
  quantity: 0,
  active: true,
  ...overrides
});

const createColorGroupForm = (overrides = {}) => ({
  localId: createLocalId(),
  name: '',
  hex: '#000000',
  imageItems: [],
  sizes: [createSizeForm()],
  ...overrides
});

const getVariationQuantity = (variation) => Number(variation?.quantity ?? variation?.stock ?? 0);

const getSkuPart = (value = '') => (
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
);

const getVariationSkuPreview = (productSku, group, size, index) => {
  const sku = getSkuPart(productSku) || 'UVA';
  const color = getSkuPart(group.name);
  const sizePart = getSkuPart(size.size);

  if (color && sizePart) {
    return `${sku}-${color}-${sizePart}`;
  }

  return `${sku}-VAR-${index + 1}`;
};

const getProductTotalStock = (product) => {
  if (Number.isFinite(Number(product.totalStock))) {
    return Number(product.totalStock);
  }

  const variations = product.variations || [];

  if (variations.length) {
    return variations
      .filter((variation) => variation.active !== false)
      .reduce((total, variation) => total + getVariationQuantity(variation), 0);
  }

  return Number(product.stock || 0);
};

const getStockStatus = (totalStock, lowStockThreshold = 5) => {
  if (totalStock <= 0) {
    return { className: 'out', label: 'Produto sem estoque' };
  }

  if (totalStock <= lowStockThreshold) {
    return { className: 'low', label: 'Produto com estoque baixo' };
  }

  return { className: 'ok', label: 'Estoque disponivel' };
};

const groupProductVariations = (product) => {
  const groups = new Map();
  const colorImages = product.images || [];

  for (const variation of product.variations || []) {
    const colorName = variation.color || 'Sem cor';

    if (!groups.has(colorName)) {
      const images = colorImages
        .filter((image) => image.color === colorName)
        .map((image) => ({
          type: 'existing',
          localId: image.id,
          id: image.id,
          url: image.url,
          name: image.altText || `${product.name} ${colorName}`
        }));

      groups.set(colorName, createColorGroupForm({
        name: colorName,
        hex: variation.colorHex || images[0]?.colorHex || '#000000',
        imageItems: images,
        sizes: []
      }));
    }

    groups.get(colorName).sizes.push(createSizeForm({
      id: variation.id,
      size: variation.size || '',
      quantity: getVariationQuantity(variation),
      active: variation.active !== false
    }));
  }

  const grouped = [...groups.values()].map((group) => ({
    ...group,
    sizes: group.sizes.length ? group.sizes : [createSizeForm()]
  }));

  return grouped.length ? grouped : [createColorGroupForm()];
};

function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="admin-modal__box">
        <h2 id="confirm-title">{message}</h2>
        <div className="admin-modal__actions">
          <button className="button button--secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="button" type="button" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const { settings } = useSettings();
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [imageItems, setImageItems] = useState([]);
  const [colorGroups, setColorGroups] = useState([createColorGroupForm()]);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productToDelete, setProductToDelete] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadProducts = () => {
    api.get('/products', { params: { includeInactive: 'true' } })
      .then(({ data }) => setProducts(data.products || []))
      .catch(() => setProducts([]));
  };

  const loadCategories = () => {
    api.get('/categories', { params: { includeInactive: 'true' } })
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const clearFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const revokeFileUrls = (items) => {
    items
      .filter((item) => item.type === 'file')
      .forEach((item) => URL.revokeObjectURL(item.url));
  };

  const revokeColorGroupFileUrls = (groups) => {
    groups.forEach((group) => revokeFileUrls(group.imageItems || []));
  };

  const resetForm = () => {
    setForm(initialForm);
    setImageItems((current) => {
      revokeFileUrls(current);
      return [];
    });
    setColorGroups((current) => {
      revokeColorGroupFileUrls(current);
      return [createColorGroupForm()];
    });
    setEditingProduct(null);
    clearFileInput();
  };

  const selectImages = (event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setImageItems((current) => ([
      ...current,
      ...files.map((file) => ({
        type: 'file',
        localId: createLocalId(),
        file,
        url: URL.createObjectURL(file),
        name: file.name
      }))
    ]));
    clearFileInput();
  };

  const removeImage = (localId) => {
    setImageItems((current) => {
      const removed = current.find((item) => item.localId === localId);

      if (removed?.type === 'file') {
        URL.revokeObjectURL(removed.url);
      }

      return current.filter((item) => item.localId !== localId);
    });
  };

  const moveImage = (localId, direction) => {
    setImageItems((current) => {
      const index = current.findIndex((item) => item.localId === localId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= current.length) {
        return current;
      }

      const nextItems = [...current];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);
      return nextItems;
    });
  };

  const startEdit = (product) => {
    setImageItems((current) => {
      revokeFileUrls(current);
      return (product.images || [])
        .filter((image) => !image.color)
        .map((image) => ({
          type: 'existing',
          localId: image.id,
          id: image.id,
          url: image.url,
          name: image.altText || product.name
        }));
    });

    setColorGroups((current) => {
      revokeColorGroupFileUrls(current);
      return groupProductVariations(product);
    });

    setEditingProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      category_id: product.category_id || product.category?.id || '',
      price: product.price || '',
      salePrice: product.salePrice || '',
      sku: product.sku || '',
      featured: Boolean(product.featured),
      isNew: Boolean(product.isNew),
      onSale: Boolean(product.onSale),
      active: Boolean(product.active)
    });

    clearFileInput();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateColorGroup = (localId, field, value) => {
    setColorGroups((current) => current.map((group) => (
      group.localId === localId ? { ...group, [field]: value } : group
    )));
  };

  const addColorGroup = () => {
    setColorGroups((current) => [...current, createColorGroupForm()]);
  };

  const removeColorGroup = (localId) => {
    setColorGroups((current) => {
      const removed = current.find((group) => group.localId === localId);

      if (removed) {
        revokeFileUrls(removed.imageItems || []);
      }

      return current.length === 1
        ? [createColorGroupForm()]
        : current.filter((group) => group.localId !== localId);
    });
  };

  const updateColorSize = (groupId, sizeId, field, value) => {
    setColorGroups((current) => current.map((group) => (
      group.localId !== groupId
        ? group
        : {
          ...group,
          sizes: group.sizes.map((size) => (
            size.localId === sizeId ? { ...size, [field]: value } : size
          ))
        }
    )));
  };

  const addColorSize = (groupId) => {
    setColorGroups((current) => current.map((group) => (
      group.localId === groupId
        ? { ...group, sizes: [...group.sizes, createSizeForm()] }
        : group
    )));
  };

  const removeColorSize = (groupId, sizeId) => {
    setColorGroups((current) => current.map((group) => {
      if (group.localId !== groupId) {
        return group;
      }

      return {
        ...group,
        sizes: group.sizes.length === 1
          ? [createSizeForm()]
          : group.sizes.filter((size) => size.localId !== sizeId)
      };
    }));
  };

  const selectColorImages = (groupId, event) => {
    const files = Array.from(event.target.files || []);

    if (!files.length) {
      return;
    }

    setColorGroups((current) => current.map((group) => (
      group.localId !== groupId
        ? group
        : {
          ...group,
          imageItems: [
            ...group.imageItems,
            ...files.map((file) => ({
              type: 'file',
              localId: createLocalId(),
              file,
              url: URL.createObjectURL(file),
              name: file.name
            }))
          ]
        }
    )));
    event.target.value = '';
  };

  const removeColorImage = (groupId, imageId) => {
    setColorGroups((current) => current.map((group) => {
      if (group.localId !== groupId) {
        return group;
      }

      const removed = group.imageItems.find((item) => item.localId === imageId);

      if (removed?.type === 'file') {
        URL.revokeObjectURL(removed.url);
      }

      return {
        ...group,
        imageItems: group.imageItems.filter((item) => item.localId !== imageId)
      };
    }));
  };

  const moveColorImage = (groupId, imageId, direction) => {
    setColorGroups((current) => current.map((group) => {
      if (group.localId !== groupId) {
        return group;
      }

      const index = group.imageItems.findIndex((item) => item.localId === imageId);
      const nextIndex = index + direction;

      if (index < 0 || nextIndex < 0 || nextIndex >= group.imageItems.length) {
        return group;
      }

      const nextItems = [...group.imageItems];
      const [item] = nextItems.splice(index, 1);
      nextItems.splice(nextIndex, 0, item);

      return { ...group, imageItems: nextItems };
    }));
  };

  const buildPayload = () => {
    const payload = new FormData();
    const imageOrder = [];
    let fileIndex = 0;

    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, value ?? '');
    });

    imageItems.forEach((item) => {
      if (item.type === 'existing') {
        imageOrder.push({ type: 'existing', id: item.id });
        return;
      }

      imageOrder.push({ type: 'file', fileIndex });
      payload.append('images', item.file);
      fileIndex += 1;
    });

    const payloadColorGroups = colorGroups
      .filter((group) => (
        group.name.trim()
        || group.sizes.some((size) => size.id || size.size || Number(size.quantity || 0) > 0)
      ))
      .map((group) => {
        const groupImageOrder = [];

        group.imageItems.forEach((item) => {
          if (item.type === 'existing') {
            groupImageOrder.push({ type: 'existing', id: item.id });
            return;
          }

          groupImageOrder.push({ type: 'file', fileIndex });
          payload.append('images', item.file);
          fileIndex += 1;
        });

        return {
          name: group.name.trim(),
          hex: group.hex,
          images: groupImageOrder,
          sizes: group.sizes
            .filter((size) => size.id || size.size || Number(size.quantity || 0) > 0)
            .map((size) => ({
              id: size.id || undefined,
              size: size.size.trim(),
              quantity: Number(size.quantity || 0),
              active: Boolean(size.active)
            }))
        };
      });

    payload.append('imageOrder', JSON.stringify(imageOrder));
    payload.append('colorGroups', JSON.stringify(payloadColorGroups));
    return payload;
  };

  const submitProduct = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, buildPayload());
        setMessage('Produto atualizado com sucesso.');
      } else {
        await api.post('/products', buildPayload());
        setMessage('Produto cadastrado com sucesso.');
      }

      resetForm();
      loadProducts();
    } catch (error) {
      setMessage(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) {
      return;
    }

    try {
      await api.delete(`/products/${productToDelete.id}`);

      if (editingProduct?.id === productToDelete.id) {
        resetForm();
      }

      setMessage('Produto excluido com sucesso.');
      setProductToDelete(null);
      loadProducts();
    } catch (error) {
      setMessage(getApiMessage(error));
      setProductToDelete(null);
    }
  };

  return (
    <AdminLayout title="Produtos">
      <form className="admin-form admin-form--product" onSubmit={submitProduct}>
        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </label>

        <label>
          Categoria
          <select
            value={form.category_id}
            onChange={(event) => updateField('category_id', event.target.value)}
          >
            <option value="">Sem categoria</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label>
          SKU
          <input
            value={form.sku}
            onChange={(event) => updateField('sku', event.target.value)}
            required
          />
        </label>

        <label>
          Preço
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(event) => updateField('price', event.target.value)}
            required
          />
        </label>

        <label>
          Preço promocional
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.salePrice}
            onChange={(event) => updateField('salePrice', event.target.value)}
          />
        </label>

        <label className="admin-form__wide">
          Descrição
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows="3"
          />
        </label>

        <label className="admin-file admin-form__wide">
          Imagens gerais do produto
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={selectImages}
          />
          <span className="admin-file__control">Selecionar imagem</span>
          <small>{imageItems.length ? `${imageItems.length} imagem(ns) selecionada(s)` : 'Nenhuma imagem selecionada'}</small>
        </label>

        {imageItems.length > 0 && (
          <div className="admin-image-list admin-form__wide">
            {imageItems.map((item, index) => (
              <article className="admin-image-item" key={item.localId}>
                <img src={item.url} alt={item.name || `Imagem ${index + 1}`} />
                <div>
                  <strong>{index === 0 ? 'Capa do produto' : `Imagem ${index + 1}`}</strong>
                  <small>{item.name}</small>
                </div>
                <div className="admin-image-item__actions">
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => moveImage(item.localId, -1)}
                    disabled={index === 0}
                    aria-label="Mover imagem para cima"
                    title="Mover para cima"
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button"
                    onClick={() => moveImage(item.localId, 1)}
                    disabled={index === imageItems.length - 1}
                    aria-label="Mover imagem para baixo"
                    title="Mover para baixo"
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    type="button"
                    className="admin-icon-button admin-icon-button--danger"
                    onClick={() => removeImage(item.localId)}
                    aria-label="Remover imagem"
                    title="Remover imagem"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="admin-color-groups admin-form__wide">
          <div className="admin-section-heading">
            <h2>Cores e tamanhos</h2>
            <button className="button button--secondary" type="button" onClick={addColorGroup}>
              <Plus size={17} />
              Adicionar cor
            </button>
          </div>

          <div className="admin-color-group-list">
            {colorGroups.map((group) => (
              <article className="admin-color-group" key={group.localId}>
                <div className="admin-color-group__header">
                  <label>
                    Nome da cor
                    <input
                      value={group.name}
                      onChange={(event) => updateColorGroup(group.localId, 'name', event.target.value)}
                      placeholder="Vermelho"
                    />
                  </label>

                  <label>
                    Codigo da cor
                    <input
                      type="color"
                      value={group.hex}
                      onChange={(event) => updateColorGroup(group.localId, 'hex', event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="admin-icon-button admin-icon-button--danger"
                    onClick={() => removeColorGroup(group.localId)}
                    aria-label="Remover cor"
                    title="Remover cor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <label className="admin-file">
                  Imagens desta cor
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => selectColorImages(group.localId, event)}
                  />
                  <span className="admin-file__control">Selecionar imagem</span>
                  <small>{group.imageItems.length ? `${group.imageItems.length} imagem(ns) selecionada(s)` : 'Nenhuma imagem selecionada'}</small>
                </label>

                {group.imageItems.length > 0 && (
                  <div className="admin-image-list">
                    {group.imageItems.map((item, index) => (
                      <article className="admin-image-item" key={item.localId}>
                        <img src={item.url} alt={item.name || `${group.name} imagem ${index + 1}`} />
                        <div>
                          <strong>{index === 0 ? 'Imagem principal da cor' : `Imagem ${index + 1}`}</strong>
                          <small>{item.name}</small>
                        </div>
                        <div className="admin-image-item__actions">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => moveColorImage(group.localId, item.localId, -1)}
                            disabled={index === 0}
                            aria-label="Mover imagem para cima"
                            title="Mover para cima"
                          >
                            <ArrowUp size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => moveColorImage(group.localId, item.localId, 1)}
                            disabled={index === group.imageItems.length - 1}
                            aria-label="Mover imagem para baixo"
                            title="Mover para baixo"
                          >
                            <ArrowDown size={16} />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button admin-icon-button--danger"
                            onClick={() => removeColorImage(group.localId, item.localId)}
                            aria-label="Remover imagem"
                            title="Remover imagem"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                <div className="admin-size-list">
                  {group.sizes.map((size, sizeIndex) => (
                    <article className="admin-size-row" key={size.localId}>
                      <label>
                        Tamanho
                        <input
                          value={size.size}
                          onChange={(event) => updateColorSize(group.localId, size.localId, 'size', event.target.value)}
                          placeholder="M"
                        />
                      </label>

                      <label>
                        Quantidade
                        <input
                          type="number"
                          min="0"
                          value={size.quantity}
                          onChange={(event) => updateColorSize(group.localId, size.localId, 'quantity', event.target.value)}
                        />
                      </label>

                      <div className="admin-variation-sku">
                        <span>SKU automatico</span>
                        <strong>{getVariationSkuPreview(form.sku, group, size, sizeIndex)}</strong>
                      </div>

                      <label className="admin-variation-row__check">
                        <input
                          type="checkbox"
                          checked={size.active}
                          onChange={(event) => updateColorSize(group.localId, size.localId, 'active', event.target.checked)}
                        />
                        Ativa
                      </label>

                      <button
                        type="button"
                        className="admin-icon-button admin-icon-button--danger"
                        onClick={() => removeColorSize(group.localId, size.localId)}
                        aria-label="Remover tamanho"
                        title="Remover tamanho"
                      >
                        <Trash2 size={16} />
                      </button>
                    </article>
                  ))}

                  <button
                    className="button button--secondary"
                    type="button"
                    onClick={() => addColorSize(group.localId)}
                  >
                    <Plus size={17} />
                    Adicionar tamanho
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="admin-form__checks admin-form__wide">
          <label>
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(event) => updateField('featured', event.target.checked)}
            />
            Destaque
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.isNew}
              onChange={(event) => updateField('isNew', event.target.checked)}
            />
            Lancamento
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.onSale}
              onChange={(event) => updateField('onSale', event.target.checked)}
            />
            Promocao
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
            />
            Ativo
          </label>
        </div>

        <div className="admin-form__actions">
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : editingProduct ? 'Salvar produto' : 'Cadastrar produto'}
          </button>
          {editingProduct && (
            <button className="button button--secondary" type="button" onClick={resetForm}>
              <X size={18} />
              Cancelar
            </button>
          )}
        </div>
        {message && <p className="admin-message">{message}</p>}
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>SKU</th>
              <th>Estoque</th>
              <th>Preço</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const mainImage = getMainImage(product);
              const totalStock = getProductTotalStock(product);
              const stockStatus = getStockStatus(totalStock, Number(settings.lowStockThreshold || 0));
              const activeVariations = (product.variations || [])
                .filter((variation) => variation.active !== false)
                .length;

              return (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-cell">
                      {mainImage?.url ? (
                        <img src={mainImage.url} alt={mainImage.altText || product.name} />
                      ) : (
                        <span className="admin-product-thumb" aria-hidden="true" />
                      )}
                      <div className="admin-product-cell__text">
                        <strong>{product.name}</strong>
                        <small>{product.description || 'Sem descricao'}</small>
                      </div>
                    </div>
                  </td>
                  <td>{product.category?.name || 'Sem categoria'}</td>
                  <td>{product.sku}</td>
                  <td>
                    <div className="admin-stock-cell">
                      <span><strong>Estoque:</strong> {totalStock}</span>
                      <span><strong>Variacoes ativas:</strong> {activeVariations}</span>
                    </div>
                  </td>
                  <td>{formatCurrency(product.salePrice || product.price)}</td>
                  <td>
                    <div className="admin-stock-badges">
                      {!product.active && <span className="admin-stock-badge admin-stock-badge--inactive">Inativo</span>}
                      <span className={`admin-stock-badge admin-stock-badge--${stockStatus.className}`}>
                        {stockStatus.label}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="admin-actions">
                      <button
                        className="admin-icon-button"
                        type="button"
                        onClick={() => startEdit(product)}
                        aria-label={`Editar ${product.name}`}
                        title="Editar"
                      >
                        <Pencil size={17} />
                      </button>
                      <button
                        className="admin-icon-button admin-icon-button--danger"
                        type="button"
                        onClick={() => setProductToDelete(product)}
                        aria-label={`Excluir ${product.name}`}
                        title="Excluir"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {productToDelete && (
        <ConfirmModal
          message="Deseja apagar o produto?"
          onCancel={() => setProductToDelete(null)}
          onConfirm={confirmDeleteProduct}
        />
      )}
    </AdminLayout>
  );
}
