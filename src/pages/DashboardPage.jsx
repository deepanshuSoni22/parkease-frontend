import React, { useEffect, useState } from 'react';
import { Badge, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { api } from '../services/api';
import { useAuth } from '../state/AuthContext';
import { formatDurationMinutes } from '../utils/formatters';

function BookingRows({ bookings }) {
  if (!bookings.length) {
    return <div className="text-secondary py-4 text-center">No bookings yet.</div>;
  }

  return (
    <Table responsive hover className="align-middle mb-0">
      <thead>
        <tr>
          <th>ID</th>
          <th>Lot</th>
          <th>Slot</th>
          <th>Type</th>
          <th>Duration</th>
          <th>Status</th>
          <th>Booked at</th>
        </tr>
      </thead>
      <tbody>
        {bookings.map((booking) => (
          <tr key={booking.id}>
            <td className="font-monospace">{booking.id}</td>
            <td>{booking.parkingLotName || '—'}</td>
            <td>{booking.slotNumber || booking.slotId}</td>
            <td>{booking.slotType || '—'}</td>
            <td>{formatDurationMinutes(booking.durationMinutes)}</td>
            <td>
              <Badge bg={booking.status === 'ACTIVE' ? 'success' : 'secondary'}>{booking.status}</Badge>
            </td>
            <td>{booking.bookedAt ? new Date(booking.bookedAt).toLocaleString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export default function DashboardPage() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ lots: '—', slots: '—', bookings: '—' });
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const [lotsResult, slotsResult] = await Promise.allSettled([
          api.get('/api/v1/parking-lots'),
          api.get('/api/v1/parking-slots'),
        ]);

        const nextStats = {
          lots: lotsResult.status === 'fulfilled' ? lotsResult.value.length : '—',
          slots: slotsResult.status === 'fulfilled' ? slotsResult.value.length : '—',
          bookings: '—',
        };

        let nextBookings = [];
        if (session?.role === 'USER') {
          const myBookings = await api.get('/api/v1/bookings/my');
          nextStats.bookings = myBookings.length;
          nextBookings = myBookings.slice(0, 5);
        }

        if (active) {
          setStats(nextStats);
          setBookings(nextBookings);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.role]);

  return (
    <div>
      <div className="page-title-block mb-4">
        <h1 className="h3 fw-semibold mb-1">Dashboard</h1>
        <p className="text-secondary mb-0">Overview of your parking system.</p>
        <div className="small fw-semibold mt-2">Logged in as {session?.username} ({session?.role})</div>
      </div>

      <Card className="mb-4 border-0 shadow-sm">
        <Card.Body className="d-flex align-items-center gap-2">
          <span className="status-dot" />
          <span className="text-secondary">Connected to backend API</span>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        <Col xs={12} sm={6} md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body>
              <div className="text-uppercase text-secondary small fw-semibold mb-2">Lots</div>
              <div className="display-6 fw-semibold mb-0">{loading ? <Spinner animation="border" size="sm" /> : stats.lots}</div>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card className="h-100 shadow-sm border-0">
            <Card.Body>
              <div className="text-uppercase text-secondary small fw-semibold mb-2">Slots</div>
              <div className="display-6 fw-semibold mb-0">{loading ? <Spinner animation="border" size="sm" /> : stats.slots}</div>
            </Card.Body>
          </Card>
        </Col>
        {session?.role === 'USER' ? (
          <Col xs={12} sm={6} md={4}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <div className="text-uppercase text-secondary small fw-semibold mb-2">My Bookings</div>
                <div className="display-6 fw-semibold mb-0">{loading ? <Spinner animation="border" size="sm" /> : stats.bookings}</div>
              </Card.Body>
            </Card>
          </Col>
        ) : null}
      </Row>

      {session?.role === 'USER' ? (
        <Card className="shadow-sm border-0">
          <Card.Header className="bg-white fw-semibold">Recent bookings</Card.Header>
          <Card.Body className="p-0">
            <BookingRows bookings={bookings} />
          </Card.Body>
        </Card>
      ) : null}
    </div>
  );
}
