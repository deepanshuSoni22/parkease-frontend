import React, { useEffect, useState } from 'react';
import { Badge, Button, Card, Modal, Table } from 'react-bootstrap';
import { api } from '../services/api';
import { formatDurationMinutes } from '../utils/formatters';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

  const refresh = async () => {
    const data = await api.get('/api/v1/bookings');
    setBookings(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const loadBooking = async (id) => {
    const data = await api.get(`/api/v1/bookings/${id}`);
    setSelectedBooking(data);
  };

  const completeBooking = async (id) => {
    await api.put(`/api/v1/bookings/${id}/complete`);
    setSelectedBooking(null);
    refresh();
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-1">All Bookings</h1>
        <p className="text-secondary mb-0">View and manage bookings across the system.</p>
      </div>

      <Card className="shadow-sm border-0">
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0 align-middle">
            <thead>
              <tr>
                <th>ID</th>
                <th>Lot</th>
                <th>Slot</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Booked by</th>
                <th>Booked at</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {bookings.length ? bookings.map((booking) => (
                <tr key={booking.id}>
                  <td className="font-monospace">{booking.id}</td>
                  <td>{booking.parkingLotName || '—'}</td>
                  <td>{booking.slotNumber || booking.slotId}</td>
                  <td>{booking.slotType || '—'}</td>
                  <td>{formatDurationMinutes(booking.durationMinutes)}</td>
                  <td><Badge bg={booking.status === 'ACTIVE' ? 'success' : 'secondary'}>{booking.status}</Badge></td>
                  <td>{booking.bookedByUsername || '—'}</td>
                  <td>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleString() : '—'}</td>
                  <td className="text-end d-flex gap-2 justify-content-end">
                    <Button size="sm" variant="outline-dark" onClick={() => loadBooking(booking.id)}>View</Button>
                    {booking.status === 'ACTIVE' ? <Button size="sm" variant="dark" onClick={() => completeBooking(booking.id)}>Complete</Button> : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="9" className="text-center text-secondary py-5">No bookings found.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      <Modal show={Boolean(selectedBooking)} onHide={() => setSelectedBooking(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Booking details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedBooking ? (
            <div className="detail-list">
              <div><strong>ID:</strong> <span className="font-monospace">{selectedBooking.id}</span></div>
              <div><strong>Lot:</strong> {selectedBooking.parkingLotName || '—'}</div>
              <div><strong>Slot:</strong> {selectedBooking.slotNumber || selectedBooking.slotId}</div>
              <div><strong>Type:</strong> {selectedBooking.slotType || '—'}</div>
              <div><strong>Duration:</strong> {formatDurationMinutes(selectedBooking.durationMinutes)}</div>
              <div><strong>Status:</strong> {selectedBooking.status}</div>
              <div><strong>Booked by:</strong> {selectedBooking.bookedByUsername || '—'}</div>
              <div><strong>Booked at:</strong> {selectedBooking.bookedAt ? new Date(selectedBooking.bookedAt).toLocaleString() : '—'}</div>
            </div>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setSelectedBooking(null)}>Close</Button>
          {selectedBooking?.status === 'ACTIVE' ? <Button variant="dark" onClick={() => completeBooking(selectedBooking.id)}>Complete</Button> : null}
        </Modal.Footer>
      </Modal>
    </div>
  );
}
