import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import {
  dashboardIndicatorOptions,
  defaultSettings,
  useSettings
} from '../../contexts/SettingsContext.jsx';
import { api, getApiMessage } from '../../services/api.js';
import './Admin.css';

const imageFields = [
  'logo',
  'favicon',
  'headerLogo',
  'footerLogo'
];

const buildInitialFiles = () => imageFields.reduce((accumulator, field) => ({
  ...accumulator,
  [field]: null
}), {});

const buildPreviewUrl = (file, fallback) => (file ? URL.createObjectURL(file) : fallback);

function ImageField({ label, currentUrl, file, onChange, inputName }) {
  const previewUrl = buildPreviewUrl(file, currentUrl);

  return (
    <label className="admin-file admin-settings__image-field">
      {label}
      {previewUrl && (
        <span className="admin-image-preview">
          <img src={previewUrl} alt={label} />
        </span>
      )}
      <span className="admin-file__control">Selecionar imagem</span>
      <input
        type="file"
        accept="image/*"
        onChange={(event) => onChange(inputName, event.target.files?.[0] || null)}
      />
      <small>{file?.name || 'Nenhum novo arquivo selecionado.'}</small>
    </label>
  );
}

export default function AdminSettings() {
  const { settings, reloadSettings } = useSettings();
  const [form, setForm] = useState(defaultSettings);
  const [files, setFiles] = useState(buildInitialFiles);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({ ...defaultSettings, ...settings });
  }, [settings]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateFile = (field, file) => {
    setFiles((current) => ({ ...current, [field]: file }));
  };

  const submitSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    const payload = new FormData();

    Object.entries(form).forEach(([key, value]) => {
      payload.append(key, Array.isArray(value) ? JSON.stringify(value) : value ?? '');
    });

    imageFields.forEach((field) => {
      if (files[field]) {
        payload.append(field, files[field]);
      }
    });

    try {
      const { data } = await api.put('/settings', payload);
      setForm({ ...defaultSettings, ...(data.settings || {}) });
      setFiles(buildInitialFiles());
      await reloadSettings();
      window.dispatchEvent(new Event('uva:settings-updated'));
      setMessage('Configuracoes atualizadas com sucesso.');
    } catch (error) {
      setMessage(getApiMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const toggleDashboardIndicator = (indicatorId) => {
    setForm((current) => {
      const selected = Array.isArray(current.dashboardIndicators)
        ? current.dashboardIndicators
        : defaultSettings.dashboardIndicators;

      return {
        ...current,
        dashboardIndicators: selected.includes(indicatorId)
          ? selected.filter((item) => item !== indicatorId)
          : [...selected, indicatorId]
      };
    });
  };

  return (
    <AdminLayout title="Configuracoes">
      <form className="admin-form admin-settings-form" onSubmit={submitSettings}>
        <section className="admin-settings-section">
          <div className="admin-section-heading">
            <h2>Dados da loja</h2>
          </div>

          <label>
            Nome da loja
            <input
              value={form.storeName}
              onChange={(event) => updateField('storeName', event.target.value)}
            />
          </label>

          <label>
            Slogan
            <textarea
              value={form.slogan}
              onChange={(event) => updateField('slogan', event.target.value)}
              rows="3"
            />
          </label>

          <div className="admin-settings__image-grid">
            <ImageField
              label="Logo"
              inputName="logo"
              currentUrl={form.logoUrl}
              file={files.logo}
              onChange={updateFile}
            />
            <ImageField
              label="Favicon"
              inputName="favicon"
              currentUrl={form.faviconUrl}
              file={files.favicon}
              onChange={updateFile}
            />
          </div>

          <label>
            E-mail de contato
            <input
              type="email"
              value={form.contactEmail}
              onChange={(event) => updateField('contactEmail', event.target.value)}
            />
          </label>

          <label>
            Telefone/WhatsApp
            <input
              value={form.contactPhone}
              onChange={(event) => updateField('contactPhone', event.target.value)}
            />
          </label>

          <label>
            Instagram
            <input
              value={form.instagram}
              onChange={(event) => updateField('instagram', event.target.value)}
            />
          </label>

          <label>
            Endereco/cidade
            <input
              value={form.addressCity}
              onChange={(event) => updateField('addressCity', event.target.value)}
            />
          </label>
        </section>

        <section className="admin-settings-section">
          <div className="admin-section-heading">
            <h2>Aparencia do site</h2>
          </div>

          <div className="admin-settings__color-grid">
            <label>
              Cor principal
              <input
                type="color"
                value={form.primaryColor}
                onChange={(event) => updateField('primaryColor', event.target.value)}
              />
            </label>
            <label>
              Cor secundaria
              <input
                type="color"
                value={form.secondaryColor}
                onChange={(event) => updateField('secondaryColor', event.target.value)}
              />
            </label>
            <label>
              Cor de destaque
              <input
                type="color"
                value={form.accentColor}
                onChange={(event) => updateField('accentColor', event.target.value)}
              />
            </label>
            <label>
              Cor dos botoes
              <input
                type="color"
                value={form.buttonColor}
                onChange={(event) => updateField('buttonColor', event.target.value)}
              />
            </label>
            <label>
              Cor do texto
              <input
                type="color"
                value={form.textColor}
                onChange={(event) => updateField('textColor', event.target.value)}
              />
            </label>
          </div>

          <div className="admin-settings__image-grid">
            <ImageField
              label="Logo do cabecalho"
              inputName="headerLogo"
              currentUrl={form.headerLogoUrl || form.logoUrl}
              file={files.headerLogo}
              onChange={updateFile}
            />
            <ImageField
              label="Logo do rodape"
              inputName="footerLogo"
              currentUrl={form.footerLogoUrl || form.logoUrl}
              file={files.footerLogo}
              onChange={updateFile}
            />
          </div>
        </section>

        <section className="admin-settings-section">
          <div className="admin-section-heading">
            <h2>Pedidos e estoque</h2>
          </div>

          <label>
            Quantidade minima para considerar estoque baixo
            <input
              type="number"
              min="0"
              value={form.lowStockThreshold}
              onChange={(event) => updateField('lowStockThreshold', event.target.value)}
            />
          </label>

          <div className="admin-form__checks">
            <label>
              <input
                type="checkbox"
                checked={Boolean(form.allowOutOfStockPurchase)}
                onChange={(event) => updateField('allowOutOfStockPurchase', event.target.checked)}
              />
              Permitir compra sem estoque
            </label>
          </div>
        </section>

        <section className="admin-settings-section">
          <div className="admin-section-heading">
            <h2>WhatsApp e atendimento</h2>
          </div>

          <label>
            Numero do WhatsApp da loja
            <input
              value={form.whatsappNumber}
              onChange={(event) => updateField('whatsappNumber', event.target.value)}
              placeholder="5575999999999"
            />
          </label>

          <label>
            Mensagem padrao ao clicar no WhatsApp
            <textarea
              value={form.whatsappDefaultMessage}
              onChange={(event) => updateField('whatsappDefaultMessage', event.target.value)}
              rows="3"
            />
          </label>

          <div className="admin-form__checks">
            <label>
              <input
                type="checkbox"
                checked={Boolean(form.whatsappFloatingButtonEnabled)}
                onChange={(event) => updateField('whatsappFloatingButtonEnabled', event.target.checked)}
              />
              Ativar botao flutuante do WhatsApp
            </label>
          </div>
        </section>

        <section className="admin-settings-section">
          <div className="admin-section-heading">
            <h2>Dashboard</h2>
          </div>

          <div className="admin-settings__check-grid">
            {dashboardIndicatorOptions.map((indicator) => (
              <label key={indicator.id}>
                <input
                  type="checkbox"
                  checked={(form.dashboardIndicators || []).includes(indicator.id)}
                  onChange={() => toggleDashboardIndicator(indicator.id)}
                />
                {indicator.label}
              </label>
            ))}
          </div>
        </section>

        <div className="admin-form__actions admin-settings-form__actions">
          <button className="button" type="submit" disabled={saving}>
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar configuracoes'}
          </button>
          {message && <p className="admin-message">{message}</p>}
        </div>
      </form>
    </AdminLayout>
  );
}
