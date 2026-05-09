import { MapPin } from 'lucide-react';
import './Addresses.css';

export default function Addresses() {
  return (
    <main className="page-shell addresses-page">
      <div className="page-title">
        <div>
          <h1>Enderecos</h1>
          <p>Cadastre os dados usados nas entregas.</p>
        </div>
      </div>

      <section className="addresses-page__panel">
        <MapPin size={28} />
        <form className="form-grid form-grid--two">
          <label className="field">
            <span>CEP</span>
            <input name="zipCode" />
          </label>
          <label className="field">
            <span>Rua</span>
            <input name="street" />
          </label>
          <label className="field">
            <span>Numero</span>
            <input name="number" />
          </label>
          <label className="field">
            <span>Complemento</span>
            <input name="complement" />
          </label>
          <label className="field">
            <span>Bairro</span>
            <input name="district" />
          </label>
          <label className="field">
            <span>Cidade</span>
            <input name="city" defaultValue="Feira de Santana" />
          </label>
          <label className="field">
            <span>Estado</span>
            <input name="state" defaultValue="BA" maxLength="2" />
          </label>
          <label className="field">
            <span>Referencia</span>
            <input name="reference" />
          </label>
        </form>
      </section>
    </main>
  );
}

