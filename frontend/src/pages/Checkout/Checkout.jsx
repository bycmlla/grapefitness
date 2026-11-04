import { CheckCircle2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import CheckoutSummary from '../../components/CheckoutSummary/CheckoutSummary.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { api, getApiMessage } from '../../services/api.js';
import { formatCurrency } from '../../data/mockCatalog.js';
import './Checkout.css';

const initialAddress = {
  zipCode: '',
  street: '',
  number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  reference: ''
};
const digits = (value) => value.replace(/\D/g, '');
const formatZipCode = (value) =>
  digits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, '$1-$2');
const normalizeCity = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const validPhone = (value) => /^(?:55)?[1-9]\d{9,10}$/.test(digits(value));
const states = new Set(
  'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ')
);

export default function Checkout() {
  const { items, subtotal, clearCart } = useCart();
  const { user, updateUser } = useAuth();
  const [fulfillmentType, setFulfillmentType] = useState('delivery');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [pickupStores, setPickupStores] = useState([]);
  const [storesError, setStoresError] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [address, setAddress] = useState(initialAddress);
  const [noNumber, setNoNumber] = useState(false);
  const [editingCity, setEditingCity] = useState(false);
  const [contact, setContact] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const contactEdited = useRef(false);
  const [editingContact, setEditingContact] = useState(
    !user?.name || !validPhone(user?.phone || '')
  );
  const [delivery, setDelivery] = useState(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [cepError, setCepError] = useState('');
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const filledZipCode = useRef('');
  const [order, setOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const orderItems = useMemo(
    () =>
      items.map((item) => ({
        productId: item.product.id,
        variationId: item.variationId || item.variation?.id || null,
        quantity: item.quantity
      })),
    [items]
  );
  const zipCode = digits(address.zipCode);

  useEffect(() => {
    let active = true;
    api
      .get('/auth/me')
      .then(({ data }) => {
        if (active) {
          updateUser(data.user);
          if (!contactEdited.current) {
            setContact({ name: data.user.name || '', phone: data.user.phone || '' });
            setEditingContact(!data.user.name || !validPhone(data.user.phone || ''));
          }
        }
      })
      .catch(() => {});
    api
      .get('/pickup-stores')
      .then(({ data }) => {
        if (!active) return;
        const stores = data.pickupStores || data.stores || [];
        setPickupStores(stores);
        setSelectedStore((current) => current || stores[0]?.id || '');
      })
      .catch(() => {
        if (active)
          setStoresError(
            'Não foi possível carregar as lojas de retirada. Atualize a página para tentar novamente.'
          );
      });
    return () => {
      active = false;
    };
  }, [updateUser]);

  useEffect(() => {
    setDelivery(null);
    setLookingUp(false);
    if (fulfillmentType !== 'delivery' || zipCode.length !== 8 || !orderItems.length || order)
      return;
    const controller = new AbortController();
    setCepError('');
    setLookingUp(true);
    const timeout = setTimeout(async () => {
      try {
        const { data } = await api.post(
          '/shipping/quote',
          { zipCode, items: orderItems },
          { signal: controller.signal }
        );
        if (controller.signal.aborted) return;
        setDelivery(data);
        if (filledZipCode.current !== zipCode) {
          setAddress((current) =>
            digits(current.zipCode) === zipCode
              ? { ...current, ...data.address, zipCode: formatZipCode(zipCode) }
              : current
          );
          filledZipCode.current = zipCode;
          setEditingCity(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setCepError(getApiMessage(error));
          setEditingCity(true);
        }
      } finally {
        if (!controller.signal.aborted) setLookingUp(false);
      }
    }, 350);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [zipCode, fulfillmentType, orderItems, lookupAttempt, order]);

  if (!items.length && !order) return <Navigate to="/carrinho" replace />;

  const locationChanged =
    delivery &&
    (normalizeCity(address.city) !== normalizeCity(delivery.address.city) ||
      address.state !== delivery.address.state);
  const shipping = locationChanged
    ? {
        mode: 'regional',
        status: 'pending',
        label: 'Entrega para sua região',
        amount: null,
        message: 'O endereço corrigido será conferido pela loja antes de definir o frete.'
      }
    : delivery?.shipping;
  const pendingFreight = fulfillmentType === 'delivery' && shipping?.status !== 'quoted';
  const contactNeedsFields = editingContact || !contact.name.trim() || !validPhone(contact.phone);

  const handleAddressChange = ({ target: { name, value } }) => {
    if (name === 'zipCode') {
      if (digits(formatZipCode(value)) === zipCode) {
        setAddress((current) => ({ ...current, zipCode: formatZipCode(value) }));
        return;
      }
      filledZipCode.current = '';
      setAddress((current) => ({
        ...current,
        zipCode: formatZipCode(value),
        street: '',
        district: '',
        city: '',
        state: ''
      }));
      setDelivery(null);
      setCepError('');
      setEditingCity(false);
    } else
      setAddress((current) => ({
        ...current,
        [name]: name === 'state' ? value.toUpperCase() : value
      }));
  };

  const handleContactChange = (field, value) => {
    contactEdited.current = true;
    setContact((current) => ({ ...current, [field]: value }));
  };

  const submitOrder = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    if (!contact.name.trim() || !validPhone(contact.phone)) {
      setEditingContact(true);
      setErrorMessage('Informe seu nome e um telefone/WhatsApp válido com DDD.');
      return;
    }
    if (fulfillmentType === 'delivery' && (!delivery || lookingUp || cepError)) {
      setErrorMessage('Consulte um CEP válido antes de enviar o pedido.');
      return;
    }
    if (
      fulfillmentType === 'delivery' &&
      (!address.city.trim() || !states.has(address.state.toUpperCase()))
    ) {
      setEditingCity(true);
      setErrorMessage('Informe a cidade e uma UF válida.');
      return;
    }
    if (
      fulfillmentType === 'delivery' &&
      (!address.street.trim() || !address.district.trim() || (!noNumber && !address.number.trim()))
    ) {
      setErrorMessage('Informe rua, bairro e número, ou marque Sem número.');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/orders', {
        fulfillmentType,
        paymentMethod,
        contact,
        address: fulfillmentType === 'delivery' ? { ...address, noNumber } : undefined,
        shippingQuoteToken: fulfillmentType === 'delivery' ? shipping?.quoteToken : undefined,
        pickupStoreId: fulfillmentType === 'pickup' ? selectedStore : undefined,
        items: orderItems
      });
      setOrder(data.order);
      if (data.user) updateUser(data.user);
      clearCart();
    } catch (error) {
      setErrorMessage(error.response?.data?.errors?.[0]?.msg || getApiMessage(error));
      if (error.response?.status === 409 && error.response?.data?.message?.includes('cotação'))
        setLookupAttempt((current) => current + 1);
    } finally {
      setSubmitting(false);
    }
  };

  if (order)
    return (
      <main className="page-shell page-shell--center checkout-success">
        <CheckCircle2 size={54} />
        <h1>{order.shippingStatus === 'pending' ? 'Solicitação recebida' : 'Pedido recebido'}</h1>
        <p>{order.orderNumber}</p>
        {order.shippingStatus === 'pending' && (
          <p>
            Aguardando definição do frete. A loja informará o valor e você confirmará o total em
            Meus pedidos antes do pagamento.
          </p>
        )}
        <Link className="button" to="/meus-pedidos">
          Ver pedidos
        </Link>
      </main>
    );

  return (
    <main className="page-shell checkout-page">
      <div className="page-title">
        <div>
          <h1>Checkout</h1>
          <p>Confira seus dados e escolha como receber.</p>
        </div>
      </div>
      <form className="checkout-page__layout" onSubmit={submitOrder}>
        <section className="checkout-page__form">
          <div className="checkout-page__block">
            <h2>Recebimento</h2>
            <div className="checkout-page__toggle">
              <button
                type="button"
                aria-pressed={fulfillmentType === 'delivery'}
                className={fulfillmentType === 'delivery' ? 'is-selected' : ''}
                onClick={() => {
                  setFulfillmentType('delivery');
                  if (paymentMethod === 'pickup_payment') setPaymentMethod('pix');
                }}
              >
                Entrega
              </button>
              <button
                type="button"
                aria-pressed={fulfillmentType === 'pickup'}
                className={fulfillmentType === 'pickup' ? 'is-selected' : ''}
                onClick={() => setFulfillmentType('pickup')}
              >
                Retirada
              </button>
            </div>
          </div>

          {fulfillmentType === 'delivery' ? (
            <div className="checkout-page__block">
              <h2>Endereço de entrega</h2>
              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>CEP</span>
                  <input
                    name="zipCode"
                    autoComplete="postal-code"
                    inputMode="numeric"
                    value={address.zipCode}
                    onChange={handleAddressChange}
                    onBlur={() => {
                      if (zipCode.length !== 8) setCepError('CEP inválido. Informe os 8 dígitos.');
                    }}
                    maxLength={9}
                    pattern="[0-9]{5}-?[0-9]{3}"
                    placeholder="00000-000"
                    aria-invalid={Boolean(cepError)}
                    aria-describedby="cep-feedback"
                    required
                  />
                </label>
                <label className="field">
                  <span>Rua</span>
                  <input
                    name="street"
                    autoComplete="address-line1"
                    value={address.street}
                    onChange={handleAddressChange}
                    maxLength={160}
                    required
                  />
                </label>
                <div className="checkout-page__cep-feedback" id="cep-feedback" aria-live="polite">
                  {lookingUp && <span>Consultando CEP e entrega…</span>}
                  {cepError && <span className="checkout-page__error">{cepError}</span>}
                  {zipCode.length === 8 && !lookingUp && (
                    <button
                      className="checkout-page__text-button"
                      type="button"
                      onClick={() => setLookupAttempt((current) => current + 1)}
                    >
                      Consultar novamente
                    </button>
                  )}
                </div>
                <div className="field">
                  <label htmlFor="address-number">Número</label>
                  <input
                    id="address-number"
                    name="number"
                    value={noNumber ? '' : address.number}
                    onChange={handleAddressChange}
                    disabled={noNumber}
                    required={!noNumber}
                    maxLength={20}
                    placeholder={noNumber ? 'Sem número' : ''}
                  />
                  <label className="checkout-page__checkbox">
                    <input
                      type="checkbox"
                      checked={noNumber}
                      onChange={(event) => setNoNumber(event.target.checked)}
                    />
                    Sem número
                  </label>
                </div>
                <label className="field">
                  <span>
                    Complemento <small>(opcional)</small>
                  </span>
                  <input
                    name="complement"
                    autoComplete="address-line2"
                    value={address.complement}
                    onChange={handleAddressChange}
                    maxLength={120}
                  />
                </label>
                <label className="field">
                  <span>Bairro</span>
                  <input
                    name="district"
                    value={address.district}
                    onChange={handleAddressChange}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    Referência <small>(opcional)</small>
                  </span>
                  <input
                    name="reference"
                    value={address.reference}
                    onChange={handleAddressChange}
                    maxLength={180}
                  />
                </label>
                {editingCity || (!address.city && zipCode.length === 8 && !lookingUp) ? (
                  <>
                    <label className="field">
                      <span>Cidade</span>
                      <input
                        name="city"
                        autoComplete="address-level2"
                        value={address.city}
                        onChange={handleAddressChange}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Estado (UF)</span>
                      <input
                        name="state"
                        autoComplete="address-level1"
                        value={address.state}
                        onChange={handleAddressChange}
                        maxLength={2}
                        pattern="[A-Za-z]{2}"
                        required
                      />
                    </label>
                  </>
                ) : (
                  address.city && (
                    <div className="checkout-page__location">
                      <strong>
                        {address.city} / {address.state}
                      </strong>
                      <button
                        className="checkout-page__text-button"
                        type="button"
                        onClick={() => setEditingCity(true)}
                      >
                        Corrigir cidade e estado
                      </button>
                    </div>
                  )
                )}
              </div>
              {shipping && (
                <div className="checkout-page__delivery" aria-live="polite">
                  <strong>{shipping.label}</strong>
                  <span>{shipping.message}</span>
                  {shipping.status === 'quoted' && (
                    <span>
                      {shipping.service} · {formatCurrency(shipping.amount)}
                      {shipping.deliveryDays ? ` · até ${shipping.deliveryDays} dias úteis` : ''}
                    </span>
                  )}
                </div>
              )}
              {delivery && (
                <p className="checkout-page__hint">
                  Confira o endereço. Você pode corrigir os dados preenchidos.
                </p>
              )}
            </div>
          ) : (
            <div className="checkout-page__block">
              <h2>Loja de retirada</h2>
              <p className="checkout-page__free">Retirada grátis</p>
              {storesError && (
                <p role="alert" className="checkout-page__error">
                  {storesError}
                </p>
              )}
              {!storesError && !pickupStores.length && (
                <p>Nenhuma loja disponível para retirada.</p>
              )}
              <div className="checkout-page__stores">
                {pickupStores.map((store) => (
                  <label key={store.id} className={selectedStore === store.id ? 'is-selected' : ''}>
                    <input
                      type="radio"
                      name="pickupStore"
                      value={store.id}
                      checked={selectedStore === store.id}
                      onChange={(event) => setSelectedStore(event.target.value)}
                      required
                    />
                    <strong>{store.name}</strong>
                    <span>{store.address}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="checkout-page__block">
            <h2>Contato</h2>
            {contactNeedsFields ? (
              <div className="form-grid form-grid--two">
                <label className="field">
                  <span>Nome</span>
                  <input
                    autoComplete="name"
                    value={contact.name}
                    onChange={(event) => handleContactChange('name', event.target.value)}
                    maxLength={120}
                    required
                  />
                </label>
                <label className="field">
                  <span>Telefone/WhatsApp</span>
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={contact.phone}
                    onChange={(event) => handleContactChange('phone', event.target.value)}
                    maxLength={30}
                    placeholder="(75) 99999-9999"
                    required
                  />
                </label>
              </div>
            ) : (
              <div className="checkout-page__location">
                <span>
                  {contact.name} · {contact.phone}
                </span>
                <button
                  className="checkout-page__text-button"
                  type="button"
                  onClick={() => {
                    contactEdited.current = true;
                    setEditingContact(true);
                  }}
                >
                  Atualizar
                </button>
              </div>
            )}
          </div>

          <div className="checkout-page__block">
            <h2>{pendingFreight ? 'Pagamento após confirmação' : 'Pagamento'}</h2>
            {pendingFreight ? (
              <p className="checkout-page__hint">
                A loja informará o frete. Você poderá conferir e confirmar o total antes de escolher
                o pagamento.
              </p>
            ) : (
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                aria-label="Forma de pagamento"
              >
                <option value="pix">Pix</option>
                <option value="credit_card">Cartão de crédito</option>
                <option value="debit_card">Cartão de débito</option>
                <option value="boleto">Boleto</option>
                {fulfillmentType === 'pickup' && (
                  <option value="pickup_payment">Pagamento na retirada</option>
                )}
              </select>
            )}
          </div>
          <button
            className="button button--full"
            type="submit"
            disabled={
              submitting ||
              (fulfillmentType === 'delivery'
                ? lookingUp || !delivery || Boolean(cepError)
                : !selectedStore)
            }
          >
            {submitting ? 'Enviando…' : pendingFreight ? 'Solicitar pedido' : 'Confirmar pedido'}
          </button>
          {errorMessage && (
            <p className="checkout-page__error" role="alert">
              {errorMessage}
            </p>
          )}
        </section>
        <CheckoutSummary
          items={items}
          subtotal={subtotal}
          shipping={
            fulfillmentType === 'pickup'
              ? { status: 'quoted', amount: 0, label: 'Retirada grátis' }
              : shipping
          }
        />
      </form>
    </main>
  );
}
