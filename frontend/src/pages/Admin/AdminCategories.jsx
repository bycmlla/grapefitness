import { Pencil, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import { api, getApiMessage } from '../../services/api.js';
import './Admin.css';

const initialForm = {
  name: '',
  description: '',
  displayOrder: 0,
  showOnHome: false,
  showAsFeaturedCategory: false,
  showInNavbar: false,
  active: true
};

const notifyCategoriesUpdated = () => {
  window.dispatchEvent(new Event('uva:categories-updated'));
};

function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="admin-modal__box">
        <h2 id="confirm-title">{message}</h2>
        <div className="admin-modal__actions">
          <button className="button button--secondary" type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button className="button" type="button" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const loadCategories = () => {
    api.get('/categories', { params: { includeInactive: 'true' } })
      .then(({ data }) => setCategories(data.categories || []))
      .catch(() => setCategories([]));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingCategory(null);
  };

  const startEdit = (category) => {
    setEditingCategory(category);
    setForm({
      name: category.name || '',
      description: category.description || '',
      displayOrder: category.displayOrder || 0,
      showOnHome: Boolean(category.showOnHome),
      showAsFeaturedCategory: Boolean(category.showAsFeaturedCategory),
      showInNavbar: Boolean(category.showInNavbar),
      active: Boolean(category.active)
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');

    const payload = {
      ...form,
      displayOrder: Number(form.displayOrder || 0)
    };

    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, payload);
        setMessage('Categoria atualizada com sucesso.');
      } else {
        await api.post('/categories', payload);
        setMessage('Categoria cadastrada com sucesso.');
      }

      resetForm();
      loadCategories();
      notifyCategoriesUpdated();
    } catch (error) {
      setMessage(getApiMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) {
      return;
    }

    try {
      await api.delete(`/categories/${categoryToDelete.id}`);

      if (editingCategory?.id === categoryToDelete.id) {
        resetForm();
      }

      setMessage('Categoria excluida com sucesso. Produtos vinculados ficaram sem categoria.');
      setCategoryToDelete(null);
      loadCategories();
      notifyCategoriesUpdated();
    } catch (error) {
      setMessage(getApiMessage(error));
      setCategoryToDelete(null);
    }
  };

  return (
    <AdminLayout title="Categorias">
      <form className="admin-form" onSubmit={submitCategory}>
        <label>
          Nome
          <input
            value={form.name}
            onChange={(event) => updateField('name', event.target.value)}
            required
          />
        </label>

        <label>
          Descricao
          <textarea
            value={form.description}
            onChange={(event) => updateField('description', event.target.value)}
            rows="3"
          />
        </label>

        <label>
          Ordem na home
          <input
            type="number"
            value={form.displayOrder}
            onChange={(event) => updateField('displayOrder', event.target.value)}
          />
        </label>

        <div className="admin-form__checks">
          <label>
            <input
              type="checkbox"
              checked={form.showOnHome}
              onChange={(event) => updateField('showOnHome', event.target.checked)}
            />
            Exibir na home
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.showAsFeaturedCategory}
              onChange={(event) => updateField('showAsFeaturedCategory', event.target.checked)}
            />
            Exibir como categoria em destaque
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.showInNavbar}
              onChange={(event) => updateField('showInNavbar', event.target.checked)}
            />
            Exibir no menu de categorias
          </label>
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateField('active', event.target.checked)}
            />
            Ativa
          </label>
        </div>

        <div className="admin-form__actions">
          <button className="button" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : editingCategory ? 'Salvar categoria' : 'Cadastrar categoria'}
          </button>
          {editingCategory && (
            <button className="button button--secondary" type="button" onClick={resetForm}>
              <X size={18} />
              Cancelar
            </button>
          )}
        </div>
        {message && <p className="admin-message">{message}</p>}
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Descricao</th>
              <th>Ordem</th>
              <th>Home</th>
              <th>Categoria destaque</th>
              <th>Navbar</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <td>{category.name}</td>
                <td>{category.description || '-'}</td>
                <td>{category.displayOrder ?? 0}</td>
                <td>{category.showOnHome ? 'Sim' : 'Nao'}</td>
                <td>{category.showAsFeaturedCategory ? 'Sim' : 'Nao'}</td>
                <td>{category.showInNavbar ? 'Sim' : 'Nao'}</td>
                <td>{category.active ? 'Ativa' : 'Inativa'}</td>
                <td>
                  <div className="admin-actions">
                    <button
                      className="admin-icon-button"
                      type="button"
                      onClick={() => startEdit(category)}
                      aria-label={`Editar ${category.name}`}
                      title="Editar"
                    >
                      <Pencil size={17} />
                    </button>
                    <button
                      className="admin-icon-button admin-icon-button--danger"
                      type="button"
                      onClick={() => setCategoryToDelete(category)}
                      aria-label={`Excluir ${category.name}`}
                      title="Excluir"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categoryToDelete && (
        <ConfirmModal
          message="Deseja apagar categoria?"
          onCancel={() => setCategoryToDelete(null)}
          onConfirm={confirmDeleteCategory}
        />
      )}
    </AdminLayout>
  );
}
