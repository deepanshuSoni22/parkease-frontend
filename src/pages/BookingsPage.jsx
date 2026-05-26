import React, { useEffect, useState } from 'react';
import { Badge, Card, Button, Table } from 'react-bootstrap';
import { api } from '../services/api';
import { useAuth } from '../state/AuthContext';
import { formatDurationMinutes } from '../utils/formatters';

export default function BookingsPage() {
  const { session } = useAuth();
  const [bookings, setBookings] = useState([]);

  const refresh = async () => {
    const data = await api.get('/api/v1/bookings/my');
    setBookings(data);
  };

  useEffect(() => {
    refresh();
  }, []);

  const completeBooking = async (id) => {
    await api.put(`/api/v1/bookings/${id}/complete`);
    refresh();
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="h3 fw-semibold mb-1">My Bookings</h1>
        <p className="text-secondary mb-0">Your active and completed bookings.</p>
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
                  <td>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleString() : '—'}</td>
                  <td className="text-end">
                    {(session?.role === 'USER' || session?.role === 'ADMIN') && booking.status === 'ACTIVE' ? (
                      <Button size="sm" variant="outline-dark" onClick={() => completeBooking(booking.id)}>Complete</Button>
                    ) : null}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="8" className="text-center text-secondary py-5">No bookings yet.</td></tr>
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>
    </div>
  );
}
