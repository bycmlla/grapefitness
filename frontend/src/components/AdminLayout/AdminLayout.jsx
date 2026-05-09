import { ClipboardList, Image, LayoutDashboard, Package, Settings, Tags, Ticket, UsersRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import './AdminLayout.css';

export default function AdminLayout({ title, children }) {
  return (
    <main className="admin-layout">
      <aside className="admin-layout__sidebar">
        <strong>Admin</strong>
        <nav>
          <NavLink to="/admin/dashboard"><LayoutDashboard size={18} /> Dashboard</NavLink>
          <NavLink to="/admin/produtos"><Package size={18} /> Produtos</NavLink>
          <NavLink to="/admin/categorias"><Tags size={18} /> Categorias</NavLink>
          <NavLink to="/admin/pedidos"><ClipboardList size={18} /> Pedidos</NavLink>
          <NavLink to="/admin/usuarios"><UsersRound size={18} /> Usuarios</NavLink>
          <NavLink to="/admin/cupons"><Ticket size={18} /> Cupons</NavLink>
          <NavLink to="/admin/banners"><Image size={18} /> Banners</NavLink>
          <NavLink to="/admin/configuracoes"><Settings size={18} /> Configuracoes</NavLink>
        </nav>
      </aside>

      <section className="admin-layout__content">
        <div className="page-title">
          <div>
            <h1>{title}</h1>
            <p>Gestao protegida para administradores.</p>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
