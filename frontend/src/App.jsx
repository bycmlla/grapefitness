import { Route, Routes } from 'react-router-dom';
import Header from './components/Header/Header.jsx';
import Footer from './components/Footer/Footer.jsx';
import WhatsAppFloatingButton from './components/WhatsAppFloatingButton/WhatsAppFloatingButton.jsx';
import ProtectedRoute from './components/ProtectedRoute/ProtectedRoute.jsx';
import AdminRoute from './components/ProtectedRoute/AdminRoute.jsx';
import Home from './pages/Home/Home.jsx';
import Products from './pages/Products/Products.jsx';
import ProductDetail from './pages/ProductDetail/ProductDetail.jsx';
import Cart from './pages/Cart/Cart.jsx';
import Checkout from './pages/Checkout/Checkout.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import Account from './pages/Account/Account.jsx';
import Addresses from './pages/Addresses/Addresses.jsx';
import Orders from './pages/Orders/Orders.jsx';
import AdminDashboard from './pages/Admin/AdminDashboard.jsx';
import AdminProducts from './pages/Admin/AdminProducts.jsx';
import AdminCategories from './pages/Admin/AdminCategories.jsx';
import AdminOrders from './pages/Admin/AdminOrders.jsx';
import AdminUsers from './pages/Admin/AdminUsers.jsx';
import AdminSettings from './pages/Admin/AdminSettings.jsx';
import AdminPlaceholder from './pages/Admin/AdminPlaceholder.jsx';
import './App.css';

function NotFound() {
  return (
    <main className="page-shell page-shell--center">
      <h1>Pagina nao encontrada</h1>
      <p>Confira o endereco ou volte para a vitrine.</p>
    </main>
  );
}

export default function App() {
  return (
    <div className="app">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/produtos" element={<Products />} />
        <Route path="/produto/:slug" element={<ProductDetail />} />
        <Route path="/categorias" element={<Products />} />
        <Route path="/categoria/:categoryId" element={<Products />} />
        <Route path="/carrinho" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route
          path="/checkout"
          element={(
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/minha-conta"
          element={(
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/meus-pedidos"
          element={(
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/meus-pedidos/:id"
          element={(
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/enderecos"
          element={(
            <ProtectedRoute>
              <Addresses />
            </ProtectedRoute>
          )}
        />
        <Route
          path="/admin"
          element={(
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/dashboard"
          element={(
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/produtos"
          element={(
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/produtos/novo"
          element={(
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/produtos/:id/editar"
          element={(
            <AdminRoute>
              <AdminProducts />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/categorias"
          element={(
            <AdminRoute>
              <AdminCategories />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/pedidos"
          element={(
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/pedidos/:id"
          element={(
            <AdminRoute>
              <AdminOrders />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/usuarios"
          element={(
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/cupons"
          element={(
            <AdminRoute>
              <AdminPlaceholder title="Cupons" />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/banners"
          element={(
            <AdminRoute>
              <AdminPlaceholder title="Banners" />
            </AdminRoute>
          )}
        />
        <Route
          path="/admin/configuracoes"
          element={(
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          )}
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <WhatsAppFloatingButton />
    </div>
  );
}
