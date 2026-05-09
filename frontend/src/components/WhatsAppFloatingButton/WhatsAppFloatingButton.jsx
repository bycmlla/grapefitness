import { MessageCircle } from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext.jsx';
import './WhatsAppFloatingButton.css';

const onlyDigits = (value) => String(value || '').replace(/\D/g, '');

export default function WhatsAppFloatingButton() {
  const { settings } = useSettings();
  const phone = onlyDigits(settings.whatsappNumber || settings.contactPhone);

  if (!settings.whatsappFloatingButtonEnabled || !phone) {
    return null;
  }

  const message = encodeURIComponent(settings.whatsappDefaultMessage || '');

  return (
    <a
      className="whatsapp-float"
      href={`https://wa.me/${phone}${message ? `?text=${message}` : ''}`}
      target="_blank"
      rel="noreferrer"
      aria-label="Atendimento pelo WhatsApp"
      title="Atendimento pelo WhatsApp"
    >
      <MessageCircle size={24} />
    </a>
  );
}
