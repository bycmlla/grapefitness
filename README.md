# Uva Moda Fitness

Estrutura inicial do e-commerce Uva Moda Fitness, separada em frontend e backend.

## Tecnologias

- Frontend: React.js + Vite
- Backend: Node.js + Express
- Banco: MySQL com Sequelize
- Autenticacao: JWT
- Senhas: bcrypt
- Estilos: CSS separado por componente/pagina

## Estrutura

```text
frontend/
backend/
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

URL local: `http://localhost:5173`

Crie `frontend/.env` se quiser alterar a URL da API:

```env
VITE_API_URL=http://localhost:3333/api
```

## Backend

```bash
cd backend
npm install
copy .env.example .env
npm run db:sync
npm run dev
```

URL local: `http://localhost:3333`

Health check:

```bash
GET http://localhost:3333/api/health
```

## Banco de dados

Crie um banco MySQL chamado `uva_moda_fitness` ou ajuste `DATABASE_NAME` no arquivo `backend/.env`.

Scripts SQL:

```bash
mysql -u root -p < backend/database/schema.sql
mysql -u root -p < backend/database/seed.sql
```

O comando `npm run db:sync` cria/atualiza as tabelas principais e cadastra:

- Categorias iniciais.
- Lojas de retirada da documentacao.
- Usuario admin inicial definido por `ADMIN_SEED_EMAIL` e `ADMIN_SEED_PASSWORD`.

O `seed.sql` tambem cria um admin inicial de desenvolvimento:

- E-mail: `admin@uvamodafitness.com.br`
- Senha: `admin123`

Troque essa senha antes de publicar qualquer ambiente real.

## Pagamento

Pagamento online real ainda nao foi implementado. O checkout cria o pedido e registra o pagamento como pendente usando o provedor `manual_placeholder`, deixando o modelo preparado para Mercado Pago, PagSeguro, Pagar.me, Stripe ou Asaas.
