import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Button, Card, Form, Modal, Spinner, Table } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../state/AuthContext';
import { useRazorpayPayment } from '../hooks/useRazorpayPayment';

export function LotSlotsView() {
  const { lotId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [lot, setLot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showSlotModal, setShowSlotModal] = useState(false);
  const [bookingSlot, setBookingSlot] = useState(null);
  const [slotForm, setSlotForm] = useState({ slotNumber: '', slotType: 'STANDARD', available: true, pricePerMinute: '' });
  const [bookingForm, setBookingForm] = useState({ durationPreset: '60', customMinutes: '' });
  const [now, setNow] = useState(Date.now());

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

  const { startPayment, loading: paymentLoading, error: paymentError, successMessage } = useRazorpayPayment({
    onSuccess: () => {
      refresh();
      window.dispatchEvent(new Event('parkease:slots-refresh'));
      navigate('/bookings');
    },
    onFailure: () => {
      refresh();
      window.dispatchEvent(new Event('parkease:slots-refresh'));
    },
    onCancel: () => {
      window.dispatchEvent(new Event('parkease:slots-refresh'));
    },
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => refresh();
    window.addEventListener('parkease:slots-refresh', handleRefresh);
    return () => window.removeEventListener('parkease:slots-refresh', handleRefresh);
  }, [refresh]);

  // Live clock used to render countdowns
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const openBooking = (slot) => {
    setBookingSlot(slot);
    setBookingForm({ durationPreset: '60', customMinutes: '' });
  };

  const createSlot = async (event) => {
    event.preventDefault();
    await api.post('/api/v1/parking-slots', {
      slotNumber: parseInt(slotForm.slotNumber, 10),
      slotType: slotForm.slotType,
      available: slotForm.available,
      pricePerMinute: parseFloat(slotForm.pricePerMinute),
    });
    setShowSlotModal(false);
    setSlotForm({ slotNumber: '', slotType: 'STANDARD', available: true, pricePerMinute: '' });
    refresh();
  };

  const createBooking = async (event) => {
    event.preventDefault();
    setError('');
    const minutes = bookingForm.durationPreset === 'custom'
      ? parseInt(bookingForm.customMinutes, 10)
      : parseInt(bookingForm.durationPreset, 10);

    if (!bookingSlot) {
      setError('Please select a slot before booking.');
      return;
    }

    try {
      const booking = await api.post('/api/v1/bookings', { slotId: bookingSlot.id, durationMinutes: minutes });
      const selectedSlot = bookingSlot;
      setBookingSlot(null);

      if (booking?.status === 'PENDING_PAYMENT') {
        const bookingId = booking.id ?? booking.bookingId;
        if (!bookingId) {
          throw new Error('Booking created but no booking ID was returned. Payment cannot proceed.');
        }
        await startPayment({
          bookingId,
          name: `Parking booking for ${lot?.name ?? 'ParkEase'}`,
          description: `Slot #${selectedSlot.slotNumber} · ${minutes} min`,
          prefill: {
            name: session?.username,
          },
        });
      } else {
        refresh();
      }
    } catch (e) {
      setError(e?.message || 'Failed to place booking. Please try again.');
    }
  };

  const bookingDurationMinutes = bookingForm.durationPreset === 'custom'
    ? parseInt(bookingForm.customMinutes, 10)
    : parseInt(bookingForm.durationPreset, 10);

  const bookingAmount = bookingSlot?.pricePerMinute != null && bookingDurationMinutes > 0
    ? bookingDurationMinutes * parseFloat(bookingSlot.pricePerMinute)
    : null;

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
      {paymentError ? <Alert variant="danger">{paymentError}</Alert> : null}
      {successMessage ? <Alert variant="success">{successMessage}</Alert> : null}
      <Button variant="outline-secondary" size="sm" className="mb-3" onClick={() => navigate('/lots')}>
        ← Back to lots
      </Button>

      <div className="d-flex justify-content-between align-items-end mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="h3 fw-semibold mb-1">Parking Slots</h1>
        </div>
        {session?.role !== 'USER' ? (
          <Button variant="primary" onClick={() => setShowSlotModal(true)}>+ New slot</Button>
        ) : null}
      </div>

      <Card className="shadow-sm border-0">
        <Card.Header className="bg-body fw-semibold">Location: {lot.location}</Card.Header>
        <Card.Body className="p-0">
          {slots.length ? (
            <Table responsive hover className="mb-0 align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Slot #</th>
                  <th>Type</th>
                  <th>Ends in</th>
                  <th>Price/min</th>
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
                      {(() => {
                        const endsAt = slot.bookedUntil
                          ? new Date(slot.bookedUntil)
                          : slot.bookedAt && slot.bookedDurationMinutes
                          ? new Date(new Date(slot.bookedAt).getTime() + (slot.bookedDurationMinutes * 60000))
                          : null;
                        if (!endsAt) return '—';
                        const secondsLeft = Math.max(0, Math.ceil((endsAt.getTime() - now) / 1000));
                        if (secondsLeft <= 0) return 'Due';
                        const h = Math.floor(secondsLeft / 3600);
                        const m = Math.floor((secondsLeft % 3600) / 60);
                        const s = secondsLeft % 60;
                        if (h > 0) return `${h}h ${m}m`;
                        if (m > 0) return `${m}m ${s}s`;
                        return `${s}s`;
                      })()}
                    </td>
                    <td>{slot.pricePerMinute != null ? slot.pricePerMinute.toFixed(2) : '—'}</td>
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
            <Form.Group className="mb-3">
              <Form.Label>Price per minute</Form.Label>
              <Form.Control
                type="number"
                min="0"
                step="0.01"
                value={slotForm.pricePerMinute}
                onChange={(e) => setSlotForm((current) => ({ ...current, pricePerMinute: e.target.value }))}
              />
            </Form.Group>
            <Form.Check label="Available" checked={slotForm.available} onChange={(e) => setSlotForm((current) => ({ ...current, available: e.target.checked }))} />
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
            {bookingAmount != null ? (
              <div className="mb-3 fw-semibold">
                Amount: ₹{bookingAmount.toFixed(2)}
              </div>
            ) : null}
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
            <Button type="submit" variant="primary" disabled={paymentLoading}>
              {paymentLoading ? (
                <><Spinner animation="border" size="sm" className="me-2" />Pay</>
              ) : 'Book'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
