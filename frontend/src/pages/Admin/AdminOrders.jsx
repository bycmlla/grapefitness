import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import { formatCurrency } from '../../data/mockCatalog.js';
import { api } from '../../services/api.js';
import './Admin.css';

const statusOptions = [
  'aguardando_pagamento',
  'pagamento_aprovado',
  'em_separacao',
  'pronto_para_retirada',
  'enviado',
  'entregue',
  'cancelado',
  'reembolsado'
];

const getItemVariationLabel = (item) => {
  const color = item.variationColor || item.variation?.color;
  const size = item.variationSize || item.variation?.size;

  return [color && `Cor: ${color}`, size && `Tamanho: ${size}`]
    .filter(Boolean)
    .join(' | ');
};

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const loadOrders = () => {
    api.get('/admin/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch(() => setOrders([]));
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId, status) => {
    await api.patch(`/admin/orders/${orderId}/status`, { status });
    loadOrders();
  };

  return (
    <AdminLayout title="Pedidos">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Cliente</th>
              <th>Status</th>
              <th>Total</th>
              <th>Itens</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.orderNumber}</td>
                <td>{order.user?.name || order.user?.email || '-'}</td>
                <td>
                  <select
                    className="admin-table-select"
                    value={order.status}
                    onChange={(event) => updateStatus(order.id, event.target.value)}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </td>
                <td>{formatCurrency(order.total)}</td>
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
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
