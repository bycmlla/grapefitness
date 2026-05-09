import { CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import CheckoutSummary from '../../components/CheckoutSummary/CheckoutSummary.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { api } from '../../services/api.js';
import './Checkout.css';

const initialAddress = {
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: 'Feira de Santana',
  state: 'BA',
  reference: ''
};

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [pickupStores, setPickupStores] = useState([]);
  const [selectedStore, setSelectedStore] = useState('');
  const [address, setAddress] = useState(initialAddress);
  const [status, setStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get('/pickup-stores')
      .then(({ data }) => {
        const stores = data.pickupStores || data.stores || [];
        setPickupStores(stores);
        setSelectedStore((current) => current || stores[0]?.id || '');
      })
      .catch(() => {
        setPickupStores([]);
        setSelectedStore('');
      });
  }, []);

  if (!items.length && !status) {
    return <Navigate to="/carrinho" replace />;
  }

  const handleAddressChange = (event) => {
    const { name, value } = event.target;
    setAddress((current) => ({ ...current, [name]: value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    const payload = {
      fulfillmentType,
      paymentMethod,
      address: fulfillmentType === 'delivery' ? address : undefined,
      pickupStoreId: fulfillmentType === 'pickup' ? selectedStore : undefined,
      items: items.map((item) => ({
        productId: item.product.id,
        variationId: item.variationId || item.variation?.id || null,
        quantity: item.quantity
      }))
    };

    try {
      const { data } = await api.post('/orders', payload);
      setStatus(data.order.orderNumber || 'Pedido criado');
      clearCart();
    } catch (error) {
      setErrorMessage(error.response?.data?.message || 'Nao foi possivel criar o pedido.');
    } finally {
      setSubmitting(false);
    }
  };

  if (status) {
    return (
      <main className="page-shell page-shell--center checkout-success">
        <CheckCircle2 size={54} />
        <h1>Pedido recebido</h1>
        <p>{status}</p>
        <Link className="button" to="/meus-pedidos">Ver pedidos</Link>
      </main>
    );
  }

  return (
    <main className="page-shell checkout-page">
      <div className="page-title">
        <div>
          <h1>Checkout</h1>
          <p>Confirme entrega, retirada e forma de pagamento.</p>
        </div>
      </div>

      <form className="checkout-page__layout" onSubmit={submitOrder}>
        <section className="checkout-page__form">
          <div className="checkout-page__block">
            <h2>Recebimento</h2>
            <div className="checkout-page__toggle">
              <button
                type="button"
                className={fulfillmentType === 'delivery' ? 'is-selected' : ''}
                onClick={() => setFulfillmentType('delivery')}
              >
                Entrega
              </button>
              <button
                type="button"
                className={fulfillmentType === 'pickup' ? 'is-selected' : ''}
                onClick={() => setFulfillmentType('pickup')}
              >
                Retirada
              </button>
            </div>
          </div>

          {fulfillmentType === 'delivery' ? (
            <div className="checkout-page__block">
              <h2>Endereco</h2>
              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>CEP</span>
                  <input name="zipCode" value={address.zipCode} onChange={handleAddressChange} required />
                </label>
                <label className="field">
                  <span>Rua</span>
                  <input name="street" value={address.street} onChange={handleAddressChange} required />
                </label>
                <label className="field">
                  <span>Numero</span>
                  <input name="number" value={address.number} onChange={handleAddressChange} required />
                </label>
                <label className="field">
                  <span>Complemento</span>
                  <input name="complement" value={address.complement} onChange={handleAddressChange} />
                </label>
                <label className="field">
                  <span>Bairro</span>
                  <input name="district" value={address.district} onChange={handleAddressChange} required />
                </label>
                <label className="field">
                  <span>Cidade</span>
                  <input name="city" value={address.city} onChange={handleAddressChange} required />
                </label>
                <label className="field">
                  <span>Estado</span>
                  <input name="state" value={address.state} onChange={handleAddressChange} maxLength="2" required />
                </label>
                <label className="field">
                  <span>Referencia</span>
                  <input name="reference" value={address.reference} onChange={handleAddressChange} />
                </label>
              </div>
            </div>
          ) : (
            <div className="checkout-page__block">
              <h2>Loja de retirada</h2>
              <div className="checkout-page__stores">
                {pickupStores.map((store) => (
                  <label key={store.id} className={selectedStore === store.id ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="pickupStore"
                      value={store.id}
                      checked={selectedStore === store.id}
                      onChange={(event) => setSelectedStore(event.target.value)}
                    />
                    <strong>{store.name}</strong>
                    <span>{store.address}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="checkout-page__block">
            <h2>Pagamento</h2>
            <select
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
              aria-label="Forma de pagamento"
            >
              <option value="pix">Pix</option>
              <option value="credit_card">Cartao de credito</option>
              <option value="debit_card">Cartao de debito</option>
              <option value="boleto">Boleto</option>
              <option value="pickup_payment">Pagamento na retirada</option>
            </select>
          </div>

          <button className="button button--full" type="submit" disabled={submitting}>
            {submitting ? 'Enviando pedido' : 'Confirmar pedido'}
          </button>
          {errorMessage && <p className="checkout-page__error">{errorMessage}</p>}
        </section>

        <CheckoutSummary items={items} subtotal={subtotal} />
      </form>
    </main>
  );
}
