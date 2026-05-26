import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Table } from 'react-bootstrap';
import { api } from '../services/api';
import { roleBadgeVariant } from '../utils/formatters';

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);

  const refresh = async () => {
    const data = await api.get('/api/v1/admin/users');
    setUsers(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const deleteUser = async (id) => {
    if (!window.confirm(`Delete user #${id}?`)) return;
    await api.delete(`/api/v1/admin/users/${id}`);
    refresh();
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-1">Users</h1>
        <p className="text-secondary mb-0">All registered users.</p>
      </div>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Role</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.length ? users.map((user) => (
                <tr key={user.id}>
                  <td className="font-monospace">{user.id}</td>
                  <td className="fw-semibold">{user.username}</td>
                  <td><Badge bg={roleBadgeVariant(user.role)}>{user.role}</Badge></td>
                  <td className="text-end"><Button size="sm" variant="outline-danger" onClick={() => deleteUser(user.id)}>Delete</Button></td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="text-center text-secondary py-5">No users found.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
