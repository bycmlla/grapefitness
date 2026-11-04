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

Pagamento online real ainda nao foi implementado. Pedidos com frete confirmado registram pagamento pendente no provedor `manual_placeholder`. Solicitações com frete a combinar não criam pagamento até a confirmação do total pela cliente.

## Checkout e entrega

O backend consulta o [ViaCEP](https://viacep.com.br/) e identifica a entrega local pela cidade e UF consultadas, comparando com as cidades cadastradas em **Admin > Configurações > Entrega local**. A configuração inicial é Feira de Santana/BA. Cidade e UF não são fixadas no formulário.

As migrações executadas ao iniciar a API acrescentam campos ao pedido e os novos status, preservando os registros existentes. O endereço e o contato são copiados para o pedido para que alterações posteriores na conta não alterem seu histórico. O estoque continua sendo reservado na criação e devolvido no cancelamento.

Fluxo com frete a combinar:

1. A cliente envia a solicitação: **Aguardando definição do frete**, sem pagamento.
2. Em **Admin > Pedidos**, a loja informa o valor: **Aguardando confirmação do frete**.
3. Em **Meus pedidos**, a cliente confere frete e total e escolhe o pagamento.
4. Após confirmar, o pedido passa a **Aguardando pagamento**, mantendo o processamento manual existente.

Os atalhos de WhatsApp abrem uma conversa, sem enviar mensagens automaticamente. Configure o número da loja em **Admin > Configurações**.

### Cotação de transporte

Não há uma transportadora ativa no projeto. Sem integração ou quando a cotação estiver indisponível, entregas para outras cidades também aguardam definição e confirmação do frete. Não são usados valores fictícios ou enviados pelo navegador.

Para conectar um adaptador de transporte, configure no `backend/.env`:

```env
SHIPPING_QUOTE_URL=https://seu-adaptador.example/cotacoes
SHIPPING_QUOTE_TOKEN=credencial-do-adaptador
SHIPPING_ORIGIN_ZIP_CODE=44056000
```

O backend faz `POST` com `{ originZipCode, destinationZipCode, items: [{ productId, sku, quantity, unitPrice }] }`. Preços e SKUs vêm do banco. O adaptador deve resolver os dados de embalagem do catálogo e retornar `{ rates: [{ service: "Nome da modalidade", amount: 25.50, deliveryDays: 5 }] }`, com valores em reais. A modalidade com menor valor válido é identificada automaticamente; não é necessário escolher motoboy ou Correios. A cotação assinada vale por dez minutos e está vinculada à conta, ao CEP e ao carrinho.

### Validação

```powershell
cd backend
npm test
$env:TEST_MYSQL = 'true'
npm test
```

Os testes de integração criam e removem um banco temporário com prefixo `uva_checkout_test_`, usando as credenciais locais. Não alteram os dados da loja. Exigem permissão MySQL para criar esse banco.
