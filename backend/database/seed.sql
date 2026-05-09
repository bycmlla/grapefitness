USE uva_moda_fitness;

INSERT INTO usuarios (
  id,
  name,
  email,
  password_hash,
  role,
  provider,
  active,
  created_at,
  updated_at
) VALUES (
  UUID(),
  'Administrador Uva',
  'admin@uvamodafitness.com.br',
  '$2b$12$3CgIwHqf/f.OG8LQmLuNF.BqVn6yE.vbpcxKGBycKVnXX2KkCAb2S',
  'admin',
  'local',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  role = VALUES(role),
  active = VALUES(active),
  updated_at = NOW();

INSERT INTO categorias (
  id,
  name,
  slug,
  description,
  display_order,
  active,
  show_on_home,
  created_at,
  updated_at
) VALUES
  (UUID(), 'Leggings', 'leggings', 'Modelagens firmes para treino e rotina.', 1, 1, 1, NOW(), NOW()),
  (UUID(), 'Tops', 'tops', 'Sustentacao para diferentes intensidades.', 2, 1, 1, NOW(), NOW()),
  (UUID(), 'Shorts', 'shorts', 'Pecas leves para movimento livre.', 3, 1, 1, NOW(), NOW()),
  (UUID(), 'Macacoes', 'macacoes', 'Visual unico com conforto de treino.', 4, 1, 1, NOW(), NOW()),
  (UUID(), 'Camisetas', 'camisetas', 'Camisetas dry fit e basicas.', 5, 1, 1, NOW(), NOW()),
  (UUID(), 'Conjuntos', 'conjuntos', 'Combinacoes prontas para usar.', 6, 1, 1, NOW(), NOW()),
  (UUID(), 'Acessorios', 'acessorios', 'Complementos para treino e rotina.', 7, 1, 0, NOW(), NOW()),
  (UUID(), 'Promocoes', 'promocoes', 'Selecao especial com preco menor.', 8, 1, 1, NOW(), NOW()),
  (UUID(), 'Uva Shoes', 'uva-shoes', 'Calcados para completar o look fitness.', 9, 1, 0, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  display_order = VALUES(display_order),
  active = VALUES(active),
  show_on_home = VALUES(show_on_home),
  updated_at = NOW();

INSERT INTO lojas_retirada (
  id,
  name,
  address,
  city,
  state,
  zip_code,
  active,
  created_at,
  updated_at
) VALUES
  (
    UUID(),
    'Conceicao',
    'Avenida Ayrton Senna, 5302, Conceicao, Feira de Santana - BA, Brasil',
    'Feira de Santana',
    'BA',
    '44056-000',
    1,
    NOW(),
    NOW()
  ),
  (
    UUID(),
    'Centro - Prof. Geminiano Costa',
    'R. Prof. Geminiano Costa, 65 - Centro, Feira de Santana - BA',
    'Feira de Santana',
    'BA',
    '44001-120',
    1,
    NOW(),
    NOW()
  ),
  (
    UUID(),
    'Centro - Barao do Rio Branco',
    'R. Barao do Rio Branco, 1686 - Centro, Feira de Santana - BA',
    'Feira de Santana',
    'BA',
    '44001-232',
    1,
    NOW(),
    NOW()
  )
ON DUPLICATE KEY UPDATE
  address = VALUES(address),
  city = VALUES(city),
  state = VALUES(state),
  zip_code = VALUES(zip_code),
  active = VALUES(active),
  updated_at = NOW();
