import { formatCurrency } from '../../data/mockCatalog.js';
import './CheckoutSummary.css';

const getItemPrice = (item) => Number(
  item.unitPrice
  ?? item.variation?.price
  ?? item.product.salePrice
  ?? item.product.price
);

export default function CheckoutSummary({ items, subtotal, shipping }) {
  const freightDefined = shipping?.status === 'quoted';
  return (
    <aside className="checkout-summary">
      <h2>Resumo</h2>
      <div className="checkout-summary__items">
        {items.map((item) => {
          const itemColor = item.color || item.variation?.color;
          const itemSize = item.size || item.variation?.size;

          return (
            <div className="checkout-summary__item" key={item.key}>
              <div>
                <strong>{item.product.name}</strong>
                <span>{item.quantity}x Cor: {itemColor || '-'} | Tamanho: {itemSize || '-'}</span>
              </div>
              <span>{formatCurrency(getItemPrice(item) * item.quantity)}</span>
            </div>
          );
        })}
      </div>
      <div className="checkout-summary__total">
        <span>Subtotal</span>
        <strong>{formatCurrency(subtotal)}</strong>
      </div>
      <div className="checkout-summary__total">
        <span>Frete</span>
        <strong>{freightDefined ? shipping.amount === 0 ? 'Grátis' : formatCurrency(shipping.amount) : shipping ? 'A combinar' : 'Informe o CEP'}</strong>
      </div>
      <div className="checkout-summary__total">
        <span>{freightDefined ? 'Total' : 'Total dos produtos'}</span>
        <strong>{formatCurrency(subtotal + (freightDefined ? shipping.amount : 0))}</strong>
      </div>
      {!freightDefined && <p className="checkout-summary__notice">O total final será confirmado após a definição do frete.</p>}
    </aside>
  );
}
