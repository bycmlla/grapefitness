## Regras do projeto


O projeto **Uva Moda Fitness** será um e-commerce para venda de roupas fitness.

O sistema terá:

- Área pública para clientes acessarem produtos e categorias.
- Área do usuário para cadastro, login, carrinho, checkout e pedidos.
- Área administrativa protegida, acessível apenas por usuários administradores.

## 2. Funcionalidades do Cliente

O cliente poderá:

- Criar conta.
- Fazer login com e-mail e senha.
- Fazer login com Google.
- Visualizar produtos.
- Visualizar categorias.
- Buscar produtos.
- Filtrar produtos por categoria.
- Ver detalhes do produto.
- Escolher variações, como tamanho, cor ou modelo.
- Adicionar produtos ao carrinho.
- Editar o carrinho.
- Finalizar compra após login.
- Escolher entrega ou retirada na loja.
- Cadastrar endereço.
- Ver seus pedidos.
- Acompanhar status dos pedidos.
- Atualizar seus dados cadastrais.

## 3. Funcionalidades do Administrador

A tela admin terá rotas protegidas.  
Somente usuários administradores poderão acessar.

O administrador poderá:

- Criar, editar, desativar e excluir categorias.
- Ajustar a ordem das categorias.
- Definir quais categorias aparecem na página inicial.
- Criar, editar, desativar e excluir produtos.
- Cadastrar informações dos produtos.
- Cadastrar fotos dos produtos.
- Cadastrar variações dos produtos.
- Controlar estoque por produto e variação.
- Ver todos os produtos.
- Ver todos os usuários.
- Ver todos os pedidos.
- Alterar status dos pedidos.
- Gerenciar banners da página inicial.
- Gerenciar cupons de desconto.
- Visualizar relatórios básicos de vendas.

## 4. Página Inicial

A home deverá conter:

- Logo da Uva Moda Fitness.
- Menu de navegação.
- Campo de busca.
- Ícone de carrinho.
- Botão de login/cadastro.
- Banner principal.
- Categorias em destaque.
- Produtos em destaque.
- Lançamentos.
- Promoções.
- Rodapé com contato, redes sociais e informações da loja.

## 5. Produtos

Cada produto deverá ter:

- Nome.
- Descrição.
- Preço.
- Preço promocional, se houver.
- Categoria.
- Fotos.
- Status ativo/inativo.
- Produto em destaque ou não.
- SKU.
- Estoque.
- Variações, como tamanho, cor, modelo ou estampa.

Cada variação poderá ter:

- SKU próprio.
- Estoque próprio.
- Preço próprio, se necessário.
- Foto própria, se necessário.


## 6. Categorias

As categorias serão cadastradas pelo administrador.

Exemplos de categorias:

- Leggings.
- Tops.
- Shorts.
- Macacões.
- Camisetas.
- Conjuntos.
- Acessórios.
- Promoções.

Cada categoria poderá ter:

- Nome.
- Descrição.
- Imagem.
- Ordem de exibição.
- Status ativo/inativo.
- Opção para aparecer ou não na página inicial.

## 7. Carrinho

O carrinho deverá permitir:

- Adicionar produtos.
- Remover produtos.
- Alterar quantidade.
- Visualizar subtotal.
- Aplicar cupom, se houver.
- Visualizar total.
- Prosseguir para checkout.

O cliente poderá adicionar produtos ao carrinho sem estar logado.  
Ao finalizar a compra, o sistema deverá solicitar login sem perder os itens do carrinho.

## 8. Checkout

Para finalizar a compra, o cliente deverá estar logado.

O checkout deverá permitir:

- Selecionar endereço de entrega.
- Cadastrar novo endereço.
- Escolher retirada na loja.
- Escolher forma de pagamento.
- Revisar itens do pedido.
- Confirmar pedido.

### Endereço de Entrega

Campos sugeridos:

- CEP.
- Rua.
- Número.
- Complemento.
- Bairro.
- Cidade.
- Estado.
- Referência.

### Retirada na Loja

O cliente poderá escolher uma das lojas:

1. Avenida Ayrton Senna, 5302, Conceição, Feira de Santana - BA, 44056-000, Brasil.
2. R. Prof. Geminiano Costa, 65 - Centro, Feira de Santana - BA, 44001-120.
3. R. Barão do Rio Branco, 1686 - Centro, Feira de Santana - BA, 44001-232.

Caso escolha retirada, o pedido deverá salvar a loja selecionada.

## 9. Pagamento

Formas de pagamento sugeridas:

- Pix.
- Cartão de crédito.
- Cartão de débito.
- Boleto, se necessário.
- Pagamento na retirada, se permitido.

O pedido deverá registrar:

- Forma de pagamento.
- Status do pagamento.
- Valor total.
- Data do pagamento.
- Código da transação, se houver.

Integrações futuras possíveis:

- Mercado Pago.
- PagSeguro.
- Pagar.me.
- Stripe.
- Asaas.

## 10. Pedidos

O cliente poderá:

- Ver seus pedidos.
- Ver detalhes do pedido.
- Acompanhar status.
- Ver produtos comprados.
- Ver endereço ou loja de retirada.
- Ver total e forma de pagamento.

O administrador poderá:

- Ver todos os pedidos.
- Filtrar por status, cliente ou data.
- Ver detalhes do pedido.
- Alterar status.
- Cancelar pedido.
- Confirmar pagamento manualmente, se necessário.

Status sugeridos:

- Aguardando pagamento.
- Pagamento aprovado.
- Em separação.
- Pronto para retirada.
- Enviado.
- Entregue.
- Cancelado.
- Reembolsado.

## 11. Estoque

Regras de estoque:

- Produto sem estoque não poderá ser comprado.
- O estoque deverá ser controlado por produto e por variação.
- O estoque deverá ser reduzido após confirmação do pedido.
- O admin deverá conseguir ver produtos com estoque baixo.
- Produtos sem estoque poderão ficar ocultos ou aparecer como indisponíveis.

## 12. Cupons

O administrador poderá criar cupons com:

- Código do cupom.
- Tipo de desconto: valor fixo ou porcentagem.
- Valor do desconto.
- Data de validade.
- Valor mínimo de compra.
- Limite de uso.
- Status ativo/inativo.

## 13. Segurança

O sistema deverá ter:

- Senhas criptografadas.
- Login com token JWT ou sessão segura.
- Rotas administrativas protegidas.
- Controle de permissão por tipo de usuário.
- Validação de dados no frontend e backend.
- Logout seguro.
- Proteção dos dados dos clientes.
- Política de privacidade e termos de uso.

## 14. Tecnologias Sugeridas

### Frontend

- React.js.
- Vite.
- React Router DOM.
- Axios.
- Context API ou Zustand.
- CSS

### Backend

- Node.js.
- Express.
- MySQL.
- Sequelize ou Prisma.
- JWT.
- Bcrypt.
- Multer ou serviço externo para upload de imagens.
- Google Login.

### Banco de Dados

Principais tabelas:

- usuarios.
- enderecos.
- categorias.
- produtos.
- produto_imagens.
- produto_variacoes.
- carrinhos.
- carrinho_itens.
- pedidos.
- pedido_itens.
- pagamentos.
- cupons.
- banners.
- lojas_retirada.

## 15. Rotas Sugeridas

### Públicas

- `/`
- `/produtos`
- `/produto/:id`
- `/categorias`
- `/categoria/:id`
- `/login`
- `/cadastro`
- `/carrinho`
- `/checkout`

### Usuário Logado

- `/minha-conta`
- `/meus-pedidos`
- `/meus-pedidos/:id`
- `/enderecos`

### Admin

- `/admin`
- `/admin/dashboard`
- `/admin/produtos`
- `/admin/produtos/novo`
- `/admin/produtos/:id/editar`
- `/admin/categorias`
- `/admin/pedidos`
- `/admin/pedidos/:id`
- `/admin/usuarios`
- `/admin/cupons`
- `/admin/banners`
- `/admin/configuracoes`

## 17. Prioridade de Desenvolvimento

### Fase 1

- Cadastro e login.
- Admin protegido.
- Cadastro de categorias.
- Cadastro de produtos.
- Listagem de produtos.
- Página de produto.
- Carrinho.
- Checkout.
- Criação de pedido.

### Fase 2

- Controle de estoque.
- Status de pedido.
- Cupons.
- Banners.
- Categorias na home.
- Listagem de usuários e pedidos.

### Fase 3

- Login com Google.
- Pagamento online.
- Favoritos.
- Avaliações.
- Notificações.
- Relatórios.
- Integração com frete.

---

## 18. Observações

O projeto deve ser responsivo, principalmente para celular.  
A primeira versão pode ser simples, mas deve ter uma estrutura preparada para crescer com produtos, categorias, variações, estoque, carrinho,
pedidos e painel administrativo.
