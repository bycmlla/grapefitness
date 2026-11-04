import { useCallback, useEffect, useState } from 'react';
import { api, getApiMessage } from '../../services/api.js';
import { formatCurrency } from '../../data/mockCatalog.js';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import {
  addressLabel,
  orderStatusLabels,
  paymentMethodLabels,
  shippingLabel,
  whatsappLink
} from '../../utils/orders.js';
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const [methods, setMethods] = useState({});
  const { settings } = useSettings();
  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/orders/me');
      setOrders(data.orders || []);
    } catch (error) {
      setMessage(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);
  useEffect(() => {
    window.addEventListener('focus', loadOrders);
    return () => window.removeEventListener('focus', loadOrders);
  }, [loadOrders]);

  const confirmFreight = async (order) => {
    setBusy(order.id);
    setMessage('');
    try {
      const { data } = await api.post(`/orders/me/${order.id}/confirm-freight`, {
        shippingRevision: order.shippingDetails?.revision,
        paymentMethod: methods[order.id] || order.preferredPaymentMethod || 'pix'
      });
      setOrders((current) => current.map((item) => (item.id === order.id ? data.order : item)));
      setMessage('Frete e total confirmados. Seu pedido está aguardando pagamento.');
    } catch (error) {
      setMessage(getApiMessage(error));
      await loadOrders();
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="page-shell orders-page">
      <div className="page-title">
        <div>
          <h1>Meus pedidos</h1>
          <p>Acompanhe o frete, o total e o recebimento.</p>
        </div>
        <button className="button button--secondary" type="button" onClick={loadOrders}>
          Atualizar pedidos
        </button>
      </div>
      {message && (
        <p className="orders-page__message" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <div className="orders-page__empty">Carregando pedidos</div>
      ) : orders.length ? (
        <div className="orders-page__list">
          {orders.map((order) => {
            const pending = order.shippingStatus === 'pending';
            const awaitingConfirmation = order.status === 'aguardando_confirmacao_frete';
            const whatsapp = whatsappLink(
              settings.whatsappNumber || settings.contactPhone,
              `Olá! Gostaria de falar sobre o pedido ${order.orderNumber} e o frete.`
            );
            return (
              <article className="orders-page__card" key={order.id}>
                <div className="orders-page__heading">
                  <h2>{order.orderNumber}</h2>
                  <span>{orderStatusLabels[order.status] || order.status}</span>
                </div>
                <p>
                  <strong>{shippingLabel(order)}</strong>
                </p>
                <p className="orders-page__address">{addressLabel(order)}</p>
                <ul className="orders-page__items">
                  {(order.items || []).map((item) => (
                    <li key={item.id}>
                      {item.quantity}x {item.productName}
                      {item.variationColor ? ` · ${item.variationColor}` : ''}
                      {item.variationSize ? ` · ${item.variationSize}` : ''} —{' '}
                      {formatCurrency(item.total)}
                    </li>
                  ))}
                </ul>
                <dl className="orders-page__totals">
                  <div>
                    <dt>Produtos</dt>
                    <dd>{formatCurrency(order.subtotal)}</dd>
                  </div>
                  {Number(order.discountTotal) > 0 && (
                    <div>
                      <dt>Desconto</dt>
                      <dd>− {formatCurrency(order.discountTotal)}</dd>
                    </div>
                  )}
                  <div>
                    <dt>Frete</dt>
                    <dd>
                      {pending
                        ? 'A combinar'
                        : Number(order.shippingTotal) === 0
                          ? 'Grátis'
                          : formatCurrency(order.shippingTotal)}
                    </dd>
                  </div>
                  <div>
                    <dt>{pending ? 'Total dos produtos' : 'Total'}</dt>
                    <dd>
                      <strong>{formatCurrency(order.total)}</strong>
                    </dd>
                  </div>
                </dl>
                {pending && order.status !== 'cancelado' && (
                  <p className="orders-page__notice">
                    Aguardando definição do frete. Você confirmará o valor final antes do pagamento.
                  </p>
                )}
                {awaitingConfirmation && (
                  <div className="orders-page__confirmation">
                    <p>
                      A loja informou o frete. Confira o endereço e o total acima para prosseguir.
                    </p>
                    <label className="field">
                      <span>Forma de pagamento</span>
                      <select
                        aria-label={`Pagamento do pedido ${order.orderNumber}`}
                        value={methods[order.id] || order.preferredPaymentMethod || 'pix'}
                        onChange={(event) =>
                          setMethods((current) => ({ ...current, [order.id]: event.target.value }))
                        }
                      >
                        {Object.entries(paymentMethodLabels)
                          .filter(([method]) => method !== 'pickup_payment')
                          .map(([method, label]) => (
                            <option key={method} value={method}>
                              {label}
                            </option>
                          ))}
                      </select>
                    </label>
                    <button
                      className="button"
                      disabled={busy === order.id}
                      type="button"
                      onClick={() => confirmFreight(order)}
                    >
                      {busy === order.id
                        ? 'Confirmando…'
                        : `Confirmar total de ${formatCurrency(order.total)} e prosseguir`}
                    </button>
                  </div>
                )}
                {order.payment && (
                  <p className="orders-page__notice">
                    {paymentMethodLabels[order.payment.method] || order.payment.method} ·{' '}
                    {order.payment.status === 'approved'
                      ? 'Pagamento aprovado'
                      : orderStatusLabels[order.status] || 'Aguardando pagamento'}
                  </p>
                )}
                {whatsapp && (
                  <a
                    className="orders-page__whatsapp"
                    href={whatsapp}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Falar com a loja no WhatsApp
                  </a>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="orders-page__empty">Nenhum pedido encontrado.</div>
      )}
    </main>
  );
}
