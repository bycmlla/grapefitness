import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import './Admin.css';

export default function AdminPlaceholder({ title }) {
  return (
    <AdminLayout title={title}>
      <div className="admin-placeholder">
        <strong>{title}</strong>
        <span>Modulo reservado na estrutura administrativa.</span>
      </div>
    </AdminLayout>
  );
}

