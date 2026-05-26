import React, { useState } from 'react';
import { Button, Card, Col, Container, Form, Modal, Row, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [showRegister, setShowRegister] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', role: 'USER' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (event) => {
    event.preventDefault();
    try {
      setError('');
      await login(loginForm.username.trim(), loginForm.password);
      navigate('/', { replace: true });
    } catch (e) {
      setError(e.message || 'Login failed. Check credentials.');
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    try {
      setError('');
      await register(registerForm);
      setMessage('Registered. Sign in now.');
      setShowRegister(false);
      setLoginForm((current) => ({ ...current, username: registerForm.username }));
    } catch (e) {
      setError(e.message || 'Registration failed.');
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center bg-body py-4">
      <Container>
        <Row className="justify-content-center w-100">
          <Col xl={4} lg={5} md={7} sm={10}>
            <Card className="shadow-sm rounded-3">
              <Card.Body className="p-4 p-md-5">
                <div className="fw-bold mb-4">⬡ ParkEase</div>
                <h1 className="h3 fw-semibold mb-2">Sign in</h1>
                <p className="text-secondary mb-4">Enter your credentials to continue.</p>
                {error ? <Alert variant="danger">{error}</Alert> : null}
                {message ? <Alert variant="success">{message}</Alert> : null}
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>Username</Form.Label>
                    <Form.Control
                      value={loginForm.username}
                      onChange={(e) => setLoginForm((current) => ({ ...current, username: e.target.value }))}
                      placeholder="username"
                    />
                  </Form.Group>
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((current) => ({ ...current, password: e.target.value }))}
                      placeholder="••••••••"
                    />
                  </Form.Group>
                  <Button type="submit" className="w-100" variant="primary">
                    Sign in
                  </Button>
                </Form>
                <div className="text-center mt-3">
                  <span className="text-secondary small">No account? </span>
                  <Button variant="outline-secondary" size="sm" onClick={() => setShowRegister(true)}>
                    Register
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <Modal show={showRegister} onHide={() => setShowRegister(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Create account</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleRegister}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Username</Form.Label>
              <Form.Control
                value={registerForm.username}
                onChange={(e) => setRegisterForm((current) => ({ ...current, username: e.target.value }))}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Password</Form.Label>
              <Form.Control
                type="password"
                value={registerForm.password}
                onChange={(e) => setRegisterForm((current) => ({ ...current, password: e.target.value }))}
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Role</Form.Label>
              <Form.Select
                value={registerForm.role}
                onChange={(e) => setRegisterForm((current) => ({ ...current, role: e.target.value }))}
              >
                <option value="USER">USER</option>
                <option value="OWNER">OWNER</option>
                <option value="ADMIN">ADMIN</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowRegister(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </div>
  );
}
