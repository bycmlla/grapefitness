import { useEffect, useState } from 'react';
import { api } from '../../services/api.js';
import { formatCurrency } from '../../data/mockCatalog.js';
import './Orders.css';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    api.get('/orders/me')
      .then(({ data }) => {
        if (mounted) {
          setOrders(data.orders || []);
        }
      })
      .catch(() => {
        if (mounted) {
          setOrders([]);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="page-shell orders-page">
      <div className="page-title">
        <div>
          <h1>Meus pedidos</h1>
          <p>Acompanhe status, total e forma de recebimento.</p>
        </div>
      </div>

      {loading ? (
        <div className="orders-page__empty">Carregando pedidos</div>
      ) : orders.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Status</th>
                <th>Recebimento</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.orderNumber}</td>
                  <td>{order.status}</td>
                  <td>{order.fulfillmentType === 'pickup' ? 'Retirada' : 'Entrega'}</td>
                  <td>{formatCurrency(Number(order.total))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="orders-page__empty">Nenhum pedido encontrado.</div>
      )}
    </main>
  );
}

