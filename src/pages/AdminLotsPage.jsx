import React, { useEffect, useState } from 'react';
import { Badge, Card, Table } from 'react-bootstrap';
import { api } from '../services/api';
import { statusBadgeVariant } from '../utils/formatters';

export default function AdminLotsPage() {
  const [lots, setLots] = useState([]);

  useEffect(() => {
    api.get('/api/v1/admin/parking-lots').then(setLots);
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-1">All Parking Lots</h1>
        <p className="text-secondary mb-0">Admin view of every lot.</p>
      </div>
      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Location</th>
                <th>Rate/hr</th>
                <th>Slots</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lots.length ? lots.map((lot) => (
                <tr key={lot.id}>
                  <td className="font-monospace">{lot.id}</td>
                  <td className="fw-semibold">{lot.name}</td>
                  <td className="text-secondary">{lot.location}</td>
                  <td>₹{lot.hourlyRate}</td>
                  <td>{lot.totalSlots}</td>
                  <td>{lot.ownerName || '—'}</td>
                  <td><Badge bg={statusBadgeVariant(lot.active ? 'ACTIVE' : 'INACTIVE')}>{lot.active ? 'Active' : 'Inactive'}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan="7" className="text-center text-secondary py-5">No lots found.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
