import { Instagram, Mail, MapPin, Phone } from 'lucide-react';
import logo from '../../assets/logo-uva-moda-fitness.png';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import './Footer.css';

export default function Footer() {
  const { settings } = useSettings();

  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <img
            src={settings.footerLogoUrl || settings.logoUrl || logo}
            alt={settings.storeName}
          />
          <p>{settings.slogan}</p>
        </div>

        <div className="footer__group">
          <h2>Loja</h2>
          <p><MapPin size={16} /> {settings.addressCity}</p>
          <p><Phone size={16} /> {settings.contactPhone}</p>
          <p><Mail size={16} /> {settings.contactEmail}</p>
        </div>

        <div className="footer__group">
          <h2>Redes</h2>
          <p><Instagram size={16} /> {settings.instagram}</p>
          <p>Trocas, privacidade e termos de uso preparados para publicacao.</p>
        </div>
      </div>
    </footer>
  );
}
