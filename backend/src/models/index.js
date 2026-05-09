import { sequelize } from '../config/database.js';
import { Address } from './Address.js';
import { Banner } from './Banner.js';
import { Cart } from './Cart.js';
import { CartItem } from './CartItem.js';
import { Category } from './Category.js';
import { Coupon } from './Coupon.js';
import { Order } from './Order.js';
import { OrderItem } from './OrderItem.js';
import { Payment } from './Payment.js';
import { PickupStore } from './PickupStore.js';
import { Product } from './Product.js';
import { ProductImage } from './ProductImage.js';
import { ProductVariation } from './ProductVariation.js';
import { SiteSetting } from './SiteSetting.js';
import { User } from './User.js';

User.hasMany(Address, { foreignKey: 'user_id', as: 'addresses', onDelete: 'CASCADE' });
Address.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

const productCategoryForeignKey = { name: 'category_id', allowNull: true };

Category.hasMany(Product, {
  foreignKey: productCategoryForeignKey,
  as: 'products',
  onDelete: 'SET NULL'
});
Product.belongsTo(Category, {
  foreignKey: productCategoryForeignKey,
  as: 'category',
  onDelete: 'SET NULL'
});

Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images', onDelete: 'CASCADE' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE' });

Product.hasMany(ProductVariation, { foreignKey: 'product_id', as: 'variations', onDelete: 'CASCADE' });
ProductVariation.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE' });

User.hasMany(Cart, { foreignKey: 'user_id', as: 'carts', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'CASCADE' });

Cart.hasMany(CartItem, { foreignKey: 'cart_id', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cart_id', as: 'cart', onDelete: 'CASCADE' });
Product.hasMany(CartItem, { foreignKey: 'product_id', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product', onDelete: 'CASCADE' });
ProductVariation.hasMany(CartItem, { foreignKey: 'variation_id', as: 'cartItems' });
CartItem.belongsTo(ProductVariation, { foreignKey: 'variation_id', as: 'variation' });

User.hasMany(Order, { foreignKey: 'user_id', as: 'orders', onDelete: 'RESTRICT' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user', onDelete: 'RESTRICT' });
Address.hasMany(Order, { foreignKey: 'address_id', as: 'orders' });
Order.belongsTo(Address, { foreignKey: 'address_id', as: 'address' });
PickupStore.hasMany(Order, { foreignKey: 'pickup_store_id', as: 'orders' });
Order.belongsTo(PickupStore, { foreignKey: 'pickup_store_id', as: 'pickupStore' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });
Product.hasMany(OrderItem, { foreignKey: { name: 'product_id', allowNull: true }, as: 'orderItems', onDelete: 'SET NULL' });
OrderItem.belongsTo(Product, { foreignKey: { name: 'product_id', allowNull: true }, as: 'product', onDelete: 'SET NULL' });
ProductVariation.hasMany(OrderItem, { foreignKey: 'variation_id', as: 'orderItems' });
OrderItem.belongsTo(ProductVariation, { foreignKey: 'variation_id', as: 'variation' });

Order.hasOne(Payment, { foreignKey: 'order_id', as: 'payment', onDelete: 'CASCADE' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order', onDelete: 'CASCADE' });

export {
  sequelize,
  Address,
  Banner,
  Cart,
  CartItem,
  Category,
  Coupon,
  Order,
  OrderItem,
  Payment,
  PickupStore,
  Product,
  ProductImage,
  ProductVariation,
  SiteSetting,
  User
};
