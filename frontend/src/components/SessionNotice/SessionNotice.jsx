import { LogIn, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { SESSION_EXPIRED_MESSAGE } from '../../services/session.js';
import './SessionNotice.css';

export default function SessionNotice() {
  const { sessionExpired, dismissSessionNotice } = useAuth();
  const location = useLocation();

  if (!sessionExpired) return null;

  return (
    <div className="session-notice" role="status" aria-live="polite">
      <div className="session-notice__inner">
        <p>{SESSION_EXPIRED_MESSAGE}</p>
        {location.pathname !== '/login' && (
          <Link className="session-notice__login" to="/login">
            <LogIn size={18} aria-hidden="true" />
            Entrar novamente
          </Link>
        )}
        <button
          className="session-notice__dismiss"
          type="button"
          onClick={dismissSessionNotice}
          aria-label="Fechar aviso de sessão expirada"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
