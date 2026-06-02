import React, { useState } from 'react';
import { Alert, Button, ListGroup, Row, Col, Form } from 'react-bootstrap';

const TEST_CARDS = [
  { brand: 'VISA', number: '4100 2800 0000 1007' },
  { brand: 'Mastercard', number: '5500 6700 0000 1002' },
  { brand: 'RuPay', number: '6527 6589 0000 1005' },
  { brand: 'Diners', number: '3608 2800 0910 07' },
  { brand: 'Amex', number: '3402 5600 0401 007' },
];

export function DemoTestCards({ onSelect }) {
  const [selected, setSelected] = useState(TEST_CARDS[0].number);

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
  };

  const handleSelect = (card) => {
    setSelected(card.number);
    if (onSelect) onSelect(card);
  };

  return (
    <div className="mb-3">
      <Alert variant="info" className="py-2">
        <div className="fw-semibold small">Demo test cards (Razorpay test mode)</div>
        <div className="small text-muted">These are demo card details for testing only. Use any future expiry and any CVV. You may choose success or failure in the Razorpay test checkout.</div>
      </Alert>

      <ListGroup as="ul" className="mb-2">
        {TEST_CARDS.map((c) => {
          const safeId = `demo-${c.number.replace(/\s+/g, '-')}`;
          return (
            <ListGroup.Item
              key={c.number}
              as="li"
              action
              active={selected === c.number}
              onClick={() => handleSelect(c)}
              className="py-2"
              style={{ cursor: 'pointer' }}
            >
              <Row className="align-items-center">
                <Col xs="auto">
                  <Form.Check
                    type="radio"
                    name="demoCard"
                    id={safeId}
                    checked={selected === c.number}
                    onChange={() => handleSelect(c)}
                  />
                </Col>
                <Col>
                  <div className="fw-semibold">{c.brand}</div>
                  <div className="small text-monospace">{c.number}</div>
                </Col>
                <Col xs="auto">
                  <Button size="sm" variant="outline-secondary" onClick={(e) => { e.stopPropagation(); copy(c.number); }}>Copy</Button>
                </Col>
              </Row>
            </ListGroup.Item>
          );
        })}
      </ListGroup>
    </div>
  );
}

export default DemoTestCards;
