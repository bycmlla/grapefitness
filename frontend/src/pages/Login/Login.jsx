import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import './Login.css';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const { isAuthenticated, login, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || '/minha-conta';

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (loginError) {
      setError(loginError.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-page__panel">
        <span className="status-pill">Conta Uva</span>
        <h1>Entrar</h1>
        <p>Acesse carrinho, checkout, pedidos e dados da sua conta.</p>

        {error && <div className="alert">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>E-mail</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>

          <label className="field">
            <span>Senha</span>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>

          <button className="button button--full" type="submit" disabled={loading}>
            <LogIn size={18} />
            {loading ? 'Entrando' : 'Entrar'}
          </button>

          <button className="button button--ghost button--full" type="button" disabled>
            Continuar com Google
          </button>
        </form>

        <p className="auth-page__link">
          Ainda nao tem conta? <Link to="/cadastro">Criar conta</Link>
        </p>
      </section>
    </main>
  );
}

