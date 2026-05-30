import React, { useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../state/AuthContext';
import { statusBadgeVariant } from '../utils/formatters';
import { useLotsList } from '../hooks/useLotsList';

export function LotsListView() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { lots, loading, refresh } = useLotsList(session?.role);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({ name: '', location: '', active: true });

  const createLot = async (event) => {
    event.preventDefault();
    await api.post('/api/v1/parking-lots', {
      name: lotForm.name,
      location: lotForm.location,
      active: lotForm.active,
    });
    setShowLotModal(false);
    setLotForm({ name: '', location: '', active: true });
    refresh();
  };

  const deleteLot = async (id) => {
    if (!window.confirm(`Delete lot #${id}?`)) return;
    await api.delete(`/api/v1/parking-lots/${id}`);
    refresh();
  };

  const openLot = (lot) => {
    navigate(`/lots/${lot.id}`);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-end mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="h3 fw-semibold mb-1">Parking Lot</h1>
          <p className="text-secondary mb-0">Select a lot to view and manage its parking slots.</p>
        </div>
        {session?.role !== 'USER' ? (
          <Button variant="primary" onClick={() => setShowLotModal(true)}>+ New lot</Button>
        ) : null}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          {loading ? (
            <div className="py-5 text-center"><Spinner animation="border" /></div>
          ) : lots.length ? (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} role="button" onClick={() => openLot(lot)} style={{ cursor: 'pointer' }}>
                    <td className="font-monospace">{lot.id}</td>
                    <td className="fw-semibold">{lot.name}</td>
                    <td className="text-secondary">{lot.location}</td>
                    <td>{lot.ownerName || '—'}</td>
                    <td>
                      <Badge bg={statusBadgeVariant(lot.active ? 'ACTIVE' : 'INACTIVE')}>
                        {lot.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLot(lot);
                          }}
                        >
                          View slots
                        </Button>
                        {session?.role === 'OWNER' ? (
                          <Button
                            size="sm"
                            variant="outline-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteLot(lot.id);
                            }}
                          >
                            Delete
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="py-5 text-center text-secondary">No lots found.</div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showLotModal} onHide={() => setShowLotModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create parking lot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createLot}>
          <Modal.Body>
            <Form.Group className="mb-3"><Form.Label>Name</Form.Label><Form.Control value={lotForm.name} onChange={(e) => setLotForm((current) => ({ ...current, name: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Location</Form.Label><Form.Control value={lotForm.location} onChange={(e) => setLotForm((current) => ({ ...current, location: e.target.value }))} /></Form.Group>
            <Form.Check label="Active" checked={lotForm.active} onChange={(e) => setLotForm((current) => ({ ...current, active: e.target.checked }))} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowLotModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
