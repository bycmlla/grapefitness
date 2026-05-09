import { LayoutDashboard, LogOut, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo-uva-moda-fitness.png';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { useCart } from '../../contexts/CartContext.jsx';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import { api } from '../../services/api.js';
import './Header.css';

export default function Header() {
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const { user, isAdmin, logout } = useAuth();
  const { itemsCount } = useCart();
  const { settings } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isNewProductsActive = location.pathname === '/produtos'
    && new URLSearchParams(location.search).get('novidades') === 'true';
  const isProductsActive = location.pathname === '/produtos' && !isNewProductsActive;
  const navbarCategories = categories.filter((category) => (
    category.showInNavbar
  ));
  const submenuCategories = categories.filter((category) => (
    !category.showInNavbar
  ));

  const loadCategories = useCallback(() => {
    api.get('/categories')
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    loadCategories();

    window.addEventListener('uva:categories-updated', loadCategories);
    window.addEventListener('focus', loadCategories);

    return () => {
      window.removeEventListener('uva:categories-updated', loadCategories);
      window.removeEventListener('focus', loadCategories);
    };
  }, [loadCategories]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/produtos?busca=${encodeURIComponent(query)}` : '/produtos');
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);
  const navLinkClass = ({ isActive }) => (
    `header__nav-link ${isActive ? 'is-active' : ''}`
  );

  return (
    <header className="header">
      <div className="header__top">
        <div className="header__top-inner">
          <Link to="/" className="header__brand" aria-label={settings.storeName}>
            <img
              src={settings.headerLogoUrl || settings.logoUrl || logo}
              alt={settings.storeName}
            />
          </Link>

          <form className="header__search" onSubmit={submitSearch}>
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar produtos"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>

          <div className="header__actions">
            {isAdmin && (
              <Link
                className="header__top-icon"
                to="/admin"
                aria-label="Painel admin"
                title="Painel admin"
              >
                <LayoutDashboard size={20} />
              </Link>
            )}

            <Link className="header__cart header__top-icon" to="/carrinho" aria-label="Carrinho" title="Carrinho">
              <ShoppingBag size={20} />
              {itemsCount > 0 && <span>{itemsCount}</span>}
            </Link>

            {user ? (
              <>
                <Link className="header__login" to="/minha-conta">
                  <User size={17} />
                  Conta
                </Link>
                <button className="header__top-icon" type="button" onClick={logout} aria-label="Sair" title="Sair">
                  <LogOut size={19} />
                </button>
              </>
            ) : (
              <Link className="header__login" to="/login">
                <User size={17} />
                Entrar
              </Link>
            )}

            <button
              className="header__menu"
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
              title={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              {menuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>
      </div>

      <div className="header__nav-bar">
        <nav className={`header__nav ${menuOpen ? 'header__nav--open' : ''}`} aria-label="Menu principal">
          <NavLink end className={navLinkClass} to="/" onClick={closeMenu}>Inicio</NavLink>

          <Link
            className={`header__nav-link ${isNewProductsActive ? 'is-active' : ''}`}
            to="/produtos?novidades=true"
            onClick={closeMenu}
          >
            Novidades
          </Link>

          <div className={`header__nav-item ${isProductsActive ? 'is-active' : ''}`}>
            <Link className="header__nav-link" to="/produtos" onClick={closeMenu}>
              Produtos
            </Link>
            <div className="header__submenu">
              {submenuCategories.map((category) => (
                <Link
                  key={category.id}
                  to={`/categoria/${category.slug}`}
                  onClick={closeMenu}
                >
                  {category.name}
                </Link>
              ))}
            </div>
          </div>

          {navbarCategories.map((category) => (
            <Link
              key={category.id}
              className={`header__nav-link ${location.pathname === `/categoria/${category.slug}` ? 'is-active' : ''}`}
              to={`/categoria/${category.slug}`}
              onClick={closeMenu}
            >
              {category.name}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
