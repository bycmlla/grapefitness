import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import { api, getApiMessage } from '../../services/api.js';
import {
  addressLabel,
  orderStatusLabels,
  shippingLabel,
  whatsappLink
} from '../../utils/orders.js';
import './Admin.css';

const getItemVariationLabel = (item) =>
  [
    (item.variationColor || item.variation?.color) &&
      `Cor: ${item.variationColor || item.variation.color}`,
    (item.variationSize || item.variation?.size) &&
      `Tamanho: ${item.variationSize || item.variation.size}`
  ]
    .filter(Boolean)
    .join(' | ');

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [freights, setFreights] = useState({});
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null);
  const loadOrders = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/orders');
      setOrders(data.orders || []);
    } catch (error) {
      setMessage(getApiMessage(error));
    }
  }, []);
  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const updateOrder = async (order, action, payload) => {
    setBusy(order.id);
    setMessage('');
    try {
      const { data } = await api.patch(`/admin/orders/${order.id}/${action}`, payload);
      setOrders((current) => current.map((item) => (item.id === order.id ? data.order : item)));
      if (action === 'freight')
        setMessage('Frete informado. A cliente deve confirmar o novo total em Meus pedidos.');
    } catch (error) {
      setMessage(getApiMessage(error));
    } finally {
      setBusy(null);
    }
  };

  return (
    <AdminLayout title="Pedidos">
      {message && (
        <p className="admin-message" role="status">
          {message}
        </p>
      )}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Recebimento e frete</th>
              <th>Total</th>
              <th>Itens</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const needsFreight = [
                'aguardando_definicao_frete',
                'aguardando_confirmacao_frete'
              ].includes(order.status);
              const whatsapp = whatsappLink(
                order.contactSnapshot?.phone || order.user?.phone,
                `Olá, ${order.contactSnapshot?.name || order.user?.name || ''}! Sobre o pedido ${order.orderNumber}: ${order.shippingStatus === 'pending' ? 'vamos combinar o frete.' : `o frete é ${formatCurrency(order.shippingTotal)} e o total é ${formatCurrency(order.total)}. Confira e confirme em Meus pedidos no site.`}`
              );
              return (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>
                    <div className="admin-order-items">
                      <strong>
                        {order.contactSnapshot?.name ||
                          order.user?.name ||
                          order.user?.email ||
                          '-'}
                      </strong>
                      <span>{order.contactSnapshot?.phone || order.user?.phone}</span>
                      {whatsapp && (
                        <a
                          className="admin-order-whatsapp"
                          href={whatsapp}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Conversar no WhatsApp
                        </a>
                      )}
                    </div>
                  </td>
                  <td>
                    <select
                      className="admin-table-select"
                      aria-label={`Status do pedido ${order.orderNumber}`}
                      disabled={busy === order.id}
                      value={order.status}
                      onChange={(event) =>
                        updateOrder(order, 'status', { status: event.target.value })
                      }
                    >
                      {Object.entries(orderStatusLabels).map(([status, label]) => (
                        <option
                          key={status}
                          value={status}
                          disabled={
                            status !== order.status &&
                            ([
                              'aguardando_definicao_frete',
                              'aguardando_confirmacao_frete'
                            ].includes(status) ||
                              (needsFreight && status !== 'cancelado') ||
                              ['cancelado', 'reembolsado'].includes(order.status))
                          }
                        >
                          {label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <div className="admin-order-delivery">
                      <strong>{shippingLabel(order)}</strong>
                      <span>{addressLabel(order)}</span>
                      <span>
                        Frete:{' '}
                        {order.shippingStatus === 'pending'
                          ? 'A combinar'
                          : formatCurrency(order.shippingTotal)}
                      </span>
                      {needsFreight && (
                        <form
                          className="admin-order-freight"
                          onSubmit={(event) => {
                            event.preventDefault();
                            updateOrder(order, 'freight', {
                              amount:
                                freights[order.id] ??
                                (order.shippingStatus === 'pending' ? '' : order.shippingTotal)
                            });
                          }}
                        >
                          <label htmlFor={`freight-${order.id}`}>Valor do frete (R$)</label>
                          <input
                            id={`freight-${order.id}`}
                            type="number"
                            inputMode="decimal"
                            min="0"
                            max="999999.99"
                            step="0.01"
                            required
                            value={
                              freights[order.id] ??
                              (order.shippingStatus === 'pending' ? '' : order.shippingTotal)
                            }
                            onChange={(event) =>
                              setFreights((current) => ({
                                ...current,
                                [order.id]: event.target.value
                              }))
                            }
                          />
                          <button className="button" type="submit" disabled={busy === order.id}>
                            {busy === order.id ? 'Salvando…' : 'Informar frete'}
                          </button>
                        </form>
                      )}
                      {order.shippingStatus === 'awaiting_confirmation' &&
                        order.status !== 'cancelado' && (
                          <small>Aguardando confirmação da cliente.</small>
                        )}
                    </div>
                  </td>
                  <td>
                    {formatCurrency(order.total)}
                    {order.shippingStatus === 'pending' && (
                      <small className="admin-order-provisional">Sem frete definido</small>
                    )}
                  </td>
                  <td>
                    <div className="admin-order-items">
                      {(order.items || []).map((item) => (
                        <span key={item.id}>
                          {item.quantity}x {item.productName}
                          {getItemVariationLabel(item) ? ` - ${getItemVariationLabel(item)}` : ''}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
