CREATE DATABASE IF NOT EXISTS uva_moda_fitness
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uva_moda_fitness;

CREATE TABLE IF NOT EXISTS usuarios (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NULL,
  phone VARCHAR(30) NULL,
  role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
  provider ENUM('local', 'google') NOT NULL DEFAULT 'local',
  google_id VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enderecos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(80) NULL DEFAULT 'Endereco principal',
  zip_code VARCHAR(12) NOT NULL,
  street VARCHAR(160) NOT NULL,
  number VARCHAR(20) NOT NULL,
  complement VARCHAR(120) NULL,
  district VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(2) NOT NULL,
  reference VARCHAR(180) NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_enderecos_usuario
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categorias (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL UNIQUE,
  description TEXT NULL,
  image_url VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  show_on_home TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS produtos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  category_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL,
  sale_price DECIMAL(10,2) NULL,
  sku VARCHAR(80) NOT NULL UNIQUE,
  stock INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  is_new TINYINT(1) NOT NULL DEFAULT 0,
  on_sale TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produtos_categoria
    FOREIGN KEY (category_id) REFERENCES categorias(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS produto_imagens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  url VARCHAR(255) NOT NULL,
  alt_text VARCHAR(160) NULL,
  color VARCHAR(60) NULL,
  color_hex VARCHAR(20) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_main TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produto_imagens_produto
    FOREIGN KEY (product_id) REFERENCES produtos(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS produto_variacoes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  sku VARCHAR(100) NOT NULL UNIQUE,
  size VARCHAR(30) NULL,
  color VARCHAR(60) NULL,
  color_hex VARCHAR(20) NULL,
  model VARCHAR(80) NULL,
  print VARCHAR(80) NULL,
  quantidade INT NOT NULL DEFAULT 0,
  price DECIMAL(10,2) NULL,
  image_url VARCHAR(255) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_produto_variacoes_produto
    FOREIGN KEY (product_id) REFERENCES produtos(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS carrinhos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NULL,
  session_id VARCHAR(120) NULL,
  status ENUM('active', 'converted', 'abandoned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_carrinhos_usuario_status (user_id, status),
  INDEX idx_carrinhos_sessao_status (session_id, status),
  CONSTRAINT fk_carrinhos_usuario
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS carrinho_itens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  cart_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  variation_id CHAR(36) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_carrinho_itens_carrinho
    FOREIGN KEY (cart_id) REFERENCES carrinhos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_carrinho_itens_produto
    FOREIGN KEY (product_id) REFERENCES produtos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_carrinho_itens_variacao
    FOREIGN KEY (variation_id) REFERENCES produto_variacoes(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS lojas_retirada (
  id CHAR(36) NOT NULL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  address VARCHAR(220) NOT NULL,
  city VARCHAR(120) NOT NULL DEFAULT 'Feira de Santana',
  state VARCHAR(2) NOT NULL DEFAULT 'BA',
  zip_code VARCHAR(12) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lojas_retirada_name (name)
);

CREATE TABLE IF NOT EXISTS pedidos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  address_id CHAR(36) NULL,
  pickup_store_id CHAR(36) NULL,
  order_number VARCHAR(40) NOT NULL UNIQUE,
  status ENUM(
    'aguardando_pagamento',
    'pagamento_aprovado',
    'em_separacao',
    'pronto_para_retirada',
    'enviado',
    'entregue',
    'cancelado',
    'reembolsado'
  ) NOT NULL DEFAULT 'aguardando_pagamento',
  fulfillment_type ENUM('delivery', 'pickup') NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  discount_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  coupon_code VARCHAR(40) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_pedidos_usuario_status (user_id, status),
  CONSTRAINT fk_pedidos_usuario
    FOREIGN KEY (user_id) REFERENCES usuarios(id)
    ON DELETE RESTRICT,
  CONSTRAINT fk_pedidos_endereco
    FOREIGN KEY (address_id) REFERENCES enderecos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_pedidos_loja_retirada
    FOREIGN KEY (pickup_store_id) REFERENCES lojas_retirada(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pedido_itens (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  variation_id CHAR(36) NULL,
  product_name VARCHAR(160) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  variation_color VARCHAR(60) NULL,
  variation_size VARCHAR(30) NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pedido_itens_pedido
    FOREIGN KEY (order_id) REFERENCES pedidos(id)
    ON DELETE CASCADE,
  CONSTRAINT fk_pedido_itens_produto
    FOREIGN KEY (product_id) REFERENCES produtos(id)
    ON DELETE SET NULL,
  CONSTRAINT fk_pedido_itens_variacao
    FOREIGN KEY (variation_id) REFERENCES produto_variacoes(id)
    ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS pagamentos (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id CHAR(36) NOT NULL UNIQUE,
  method ENUM('pix', 'credit_card', 'debit_card', 'boleto', 'pickup_payment') NOT NULL,
  provider VARCHAR(60) NOT NULL DEFAULT 'manual_placeholder',
  status ENUM('pending', 'approved', 'failed', 'refunded', 'manual_review') NOT NULL DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  paid_at DATETIME NULL,
  transaction_code VARCHAR(120) NULL,
  metadata JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pagamentos_pedido
    FOREIGN KEY (order_id) REFERENCES pedidos(id)
    ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cupons (
  id CHAR(36) NOT NULL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  type ENUM('fixed', 'percentage') NOT NULL,
  value DECIMAL(10,2) NOT NULL,
  expires_at DATETIME NULL,
  minimum_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  usage_limit INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS banners (
  id CHAR(36) NOT NULL PRIMARY KEY,
  title VARCHAR(140) NOT NULL,
  subtitle VARCHAR(220) NULL,
  image_url VARCHAR(255) NOT NULL,
  link_url VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
