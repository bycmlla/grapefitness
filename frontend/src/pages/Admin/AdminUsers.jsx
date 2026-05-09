import { useEffect, useState } from 'react';
import AdminLayout from '../../components/AdminLayout/AdminLayout.jsx';
import { api } from '../../services/api.js';
import './Admin.css';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    api.get('/admin/users')
      .then(({ data }) => setUsers(data.users || []))
      .catch(() => setUsers([]));
  }, []);

  return (
    <AdminLayout title="Usuarios">
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Telefone</th>
              <th>Tipo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>
                <td>{user.phone || '-'}</td>
                <td>{user.role === 'admin' ? 'Administrador' : 'Cliente'}</td>
                <td>{user.active ? 'Ativo' : 'Inativo'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
