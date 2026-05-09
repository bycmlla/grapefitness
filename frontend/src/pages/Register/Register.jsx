import { UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import '../Login/Login.css';

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: ''
  });
  const [error, setError] = useState('');
  const { isAuthenticated, register, loading } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/minha-conta" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      await register(form);
      navigate('/minha-conta', { replace: true });
    } catch (registerError) {
      setError(registerError.message);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-page__panel">
        <span className="status-pill">Cadastro</span>
        <h1>Criar conta</h1>
        <p>Use sua conta para finalizar compras e acompanhar pedidos.</p>

        {error && <div className="alert">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Nome</span>
            <input name="name" value={form.name} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>E-mail</span>
            <input type="email" name="email" value={form.email} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input name="phone" value={form.phone} onChange={handleChange} />
          </label>

          <label className="field">
            <span>Senha</span>
            <input type="password" name="password" value={form.password} onChange={handleChange} minLength="6" required />
          </label>

          <button className="button button--full" type="submit" disabled={loading}>
            <UserPlus size={18} />
            {loading ? 'Criando conta' : 'Criar conta'}
          </button>
        </form>

        <p className="auth-page__link">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </section>
    </main>
  );
}

