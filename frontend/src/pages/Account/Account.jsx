import { Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './Account.css';

export default function Account() {
  const { user } = useAuth();

  return (
    <main className="page-shell account-page">
      <div className="page-title">
        <div>
          <h1>Minha conta</h1>
          <p>Dados de cadastro e atalhos da area do cliente.</p>
        </div>
      </div>

      <section className="account-page__grid">
        <article className="account-page__profile">
          <div className="account-page__avatar">
            <User size={34} />
          </div>
          <h2>{user?.name}</h2>
          <p><Mail size={17} /> {user?.email}</p>
          {user?.phone && <p><Phone size={17} /> {user.phone}</p>}
          <span className="status-pill">
            <ShieldCheck size={16} />
            {user?.role === 'admin' ? 'Administrador' : 'Cliente'}
          </span>
        </article>

        <div className="account-page__actions">
          <Link to="/meus-pedidos">Meus pedidos</Link>
          <Link to="/enderecos">Enderecos</Link>
          {user?.role === 'admin' && <Link to="/admin">Painel administrativo</Link>}
        </div>
      </section>
    </main>
  );
}

