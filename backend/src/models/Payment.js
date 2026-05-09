import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  method: {
    type: DataTypes.ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'pickup_payment'),
    allowNull: false
  },
  provider: {
    type: DataTypes.STRING(60),
    allowNull: false,
    defaultValue: 'manual_placeholder'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'failed', 'refunded', 'manual_review'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  paidAt: {
    type: DataTypes.DATE,
    field: 'paid_at'
  },
  transactionCode: {
    type: DataTypes.STRING(120),
    field: 'transaction_code'
  },
  metadata: {
    type: DataTypes.JSON
  }
}, {
  tableName: 'pagamentos'
});

