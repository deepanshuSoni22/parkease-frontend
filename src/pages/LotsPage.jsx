import React, { useCallback, useEffect, useState } from 'react';
import { Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../state/AuthContext';
import { statusBadgeVariant } from '../utils/formatters';

function useLotsList(role) {
  const [lots, setLots] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const lotsPath = role === 'OWNER' ? '/api/v1/parking-lots/my' : '/api/v1/parking-lots';
      const lotsResult = await api.get(lotsPath);
      setLots(lotsResult);
    } catch {
      setLots([]);
    } finally {
      setLoading(false);
    }
  }, [role]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { lots, loading, refresh };
}

function LotsListView() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const { lots, loading, refresh } = useLotsList(session?.role);
  const [showLotModal, setShowLotModal] = useState(false);
  const [lotForm, setLotForm] = useState({ name: '', location: '', hourlyRate: '', totalSlots: '', active: true });

  const createLot = async (event) => {
    event.preventDefault();
    await api.post('/api/v1/parking-lots', {
      name: lotForm.name,
      location: lotForm.location,
      hourlyRate: parseFloat(lotForm.hourlyRate),
      totalSlots: parseInt(lotForm.totalSlots, 10),
      active: lotForm.active,
    });
    setShowLotModal(false);
    setLotForm({ name: '', location: '', hourlyRate: '', totalSlots: '', active: true });
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
          <h1 className="h3 fw-semibold mb-1">Parking Lots</h1>
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
                  <th>Rate/hr</th>
                  <th>Slots</th>
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
                    <td>₹{lot.hourlyRate}</td>
                    <td>{lot.totalSlots}</td>
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
            <Form.Group className="mb-3"><Form.Label>Hourly rate (₹)</Form.Label><Form.Control type="number" min="0" step="0.5" value={lotForm.hourlyRate} onChange={(e) => setLotForm((current) => ({ ...current, hourlyRate: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-3"><Form.Label>Total slots</Form.Label><Form.Control type="number" min="1" value={lotForm.totalSlots} onChange={(e) => setLotForm((current) => ({ ...current, totalSlots: e.target.value }))} /></Form.Group>
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

function LotSlotsView() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [lot, setLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({ slotNumber: '', slotType: 'STANDARD', isAvailable: true });
  const [bookingForm, setBookingForm] = useState({ durationPreset: '60', customMinutes: '' });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lotData, slotsData] = await Promise.all([
        api.get(`/api/v1/parking-lots/${lotId}`),
        api.get(`/api/v1/parking-lots/${lotId}/slots`),
      ]);
      setLot(lotData);
      setSlots(slotsData);
    } catch (e) {
      setLot(null);
      setSlots([]);
      setError(e.message || 'Failed to load parking lot.');
    } finally {
      setLoading(false);
    }
  }, [lotId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener('parkease:slots-refresh', handleRefresh);
    return () => window.removeEventListener('parkease:slots-refresh', handleRefresh);
  }, [refresh]);

  const openBooking = (slot) => {
    setBookingSlot(slot);
    setBookingForm({ durationPreset: '60', customMinutes: '' });
  };

  const createSlot = async (event) => {
    event.preventDefault();
    await api.post('/api/v1/parking-slots', {
      slotNumber: parseInt(slotForm.slotNumber, 10),
      slotType: slotForm.slotType,
      isAvailable: slotForm.isAvailable,
    });
    setShowSlotModal(false);
    setSlotForm({ slotNumber: '', slotType: 'STANDARD', isAvailable: true });
    refresh();
  };

  const createBooking = async (event) => {
    event.preventDefault();
    const minutes = bookingForm.durationPreset === 'custom'
      ? parseInt(bookingForm.customMinutes, 10)
      : parseInt(bookingForm.durationPreset, 10);
    await api.post('/api/v1/bookings', { slotId: bookingSlot.id, durationMinutes: minutes });
    setBookingSlot(null);
    refresh();
  };

  const deleteSlot = async (id) => {
    if (!window.confirm(`Delete slot #${id}?`)) return;
    await api.delete(`/api/v1/parking-slots/${id}`);
    refresh();
  };

  if (loading) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" />
      </div>
    );
  }

  if (error || !lot) {
    return (
      <div>
        <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/lots')}>
          ← Back to lots
        </Button>
        <div className="alert alert-danger mb-0">{error || 'Parking lot not found.'}</div>
      </div>
    );
  }

  return (
    <div>
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/lots')}>
        ← Back to lots
      </Button>

      <div className="d-flex justify-content-between align-items-end mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="h3 fw-semibold mb-1">{lot.name}</h1>
          <p className="text-secondary mb-0">
            {lot.location} · ₹{lot.hourlyRate}/hr · {lot.totalSlots} slots capacity
          </p>
        </div>
        {session?.role !== 'USER' ? (
          <Button variant="primary" onClick={() => setShowSlotModal(true)}>+ New slot</Button>
        ) : null}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-body fw-semibold">Parking slots</Card.Header>
        <Card.Body className="p-0">
          {slots.length ? (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Slot #</th>
                  <th>Type</th>
                  <th>Available</th>
                  <th>Booked By</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {slots.map((slot) => (
                  <tr key={slot.id}>
                    <td className="font-monospace">{slot.id}</td>
                    <td className="fw-semibold">{slot.slotNumber}</td>
                    <td>{slot.slotType}</td>
                    <td>
                      <Badge bg={slot.available ? 'success' : 'danger'}>
                        {slot.available ? 'Available' : 'Occupied'}
                      </Badge>
                    </td>
                    <td>{slot.available ? '—' : slot.bookedByUsername || '—'}</td>
                    <td className="text-end">
                      <div className="d-flex gap-2 justify-content-end">
                        {session?.role === 'USER' && slot.available ? (
                          <Button size="sm" variant="primary" onClick={() => openBooking(slot)}>Book</Button>
                        ) : null}
                        {session?.role === 'OWNER' ? (
                          <Button size="sm" variant="outline-danger" onClick={() => deleteSlot(slot.id)}>Delete</Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <div className="py-5 text-center text-secondary">No parking slots in this lot yet.</div>
          )}
        </Card.Body>
      </Card>

      <Modal show={showSlotModal} onHide={() => setShowSlotModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create parking slot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createSlot}>
          <Modal.Body>
            <p className="text-secondary small">Slot will be added to {lot.name}.</p>
            <Form.Group className="mb-3"><Form.Label>Slot number</Form.Label><Form.Control type="number" min="1" value={slotForm.slotNumber} onChange={(e) => setSlotForm((current) => ({ ...current, slotNumber: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Slot type</Form.Label>
              <Form.Select value={slotForm.slotType} onChange={(e) => setSlotForm((current) => ({ ...current, slotType: e.target.value }))}>
                <option value="STANDARD">Standard</option>
                <option value="COMPACT">Compact</option>
                <option value="LARGE">Large</option>
                <option value="HANDICAPPED">Handicapped</option>
                <option value="EV">EV</option>
              </Form.Select>
            </Form.Group>
            <Form.Check label="Available" checked={slotForm.isAvailable} onChange={(e) => setSlotForm((current) => ({ ...current, isAvailable: e.target.checked }))} />
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowSlotModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary">Create</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      <Modal show={Boolean(bookingSlot)} onHide={() => setBookingSlot(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Book a slot</Modal.Title>
        </Modal.Header>
        <Form onSubmit={createBooking}>
          <Modal.Body>
            <div className="mb-3 p-2 border rounded bg-light small">
              {bookingSlot ? `${lot.name} · Slot #${bookingSlot.slotNumber}` : 'No slot selected'}
            </div>
            <Form.Group className="mb-3">
              <Form.Label>Duration</Form.Label>
              <Form.Select value={bookingForm.durationPreset} onChange={(e) => setBookingForm((current) => ({ ...current, durationPreset: e.target.value }))}>
                <option value="15">15 min</option>
                <option value="30">30 min</option>
                <option value="60">1 hr</option>
                <option value="custom">Custom</option>
              </Form.Select>
            </Form.Group>
            {bookingForm.durationPreset === 'custom' ? (
              <Form.Group>
                <Form.Label>Custom duration (minutes)</Form.Label>
                <Form.Control type="number" min="1" value={bookingForm.customMinutes} onChange={(e) => setBookingForm((current) => ({ ...current, customMinutes: e.target.value }))} />
              </Form.Group>
            ) : null}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setBookingSlot(null)}>Cancel</Button>
            <Button type="submit" variant="primary">Book</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}

export default function LotsPage() {
  return (
    <Routes>
      <Route index element={<LotsListView />} />
      <Route path=":lotId" element={<LotSlotsView />} />
    </Routes>
  );
}
