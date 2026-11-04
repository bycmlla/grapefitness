export const orderStatusLabels = {
  aguardando_definicao_frete: 'Aguardando definição do frete',
  aguardando_confirmacao_frete: 'Aguardando confirmação do frete',
  aguardando_pagamento: 'Aguardando pagamento',
  pagamento_aprovado: 'Pagamento aprovado',
  em_separacao: 'Em separação',
  pronto_para_retirada: 'Pronto para retirada',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
  reembolsado: 'Reembolsado'
};

export const paymentMethodLabels = {
  pix: 'Pix',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  boleto: 'Boleto',
  pickup_payment: 'Pagamento na retirada'
};
export const shippingLabel = (order) =>
  order.fulfillmentType === 'pickup'
    ? 'Retirada grátis'
    : order.shippingMode === 'local'
      ? 'Entrega local'
      : 'Entrega para sua região';
export const addressLabel = (order) => {
  if (order.fulfillmentType === 'pickup') return order.pickupStore?.address || 'Retirada na loja';
  const address = order.addressSnapshot || order.address;
  if (!address) return '';
  return [
    `${address.street}, ${address.number}`,
    address.complement,
    address.district,
    `${address.city}/${address.state}`,
    `CEP ${address.zipCode}`,
    address.reference && `Referência: ${address.reference}`
  ]
    .filter(Boolean)
    .join(' · ');
};

export const whatsappLink = (phone, message) => {
  let number = String(phone || '').replace(/\D/g, '');
  if (number.length === 10 || number.length === 11) number = `55${number}`;
  return /^55\d{10,11}$/.test(number)
    ? `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    : null;
};
