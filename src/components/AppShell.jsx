import React, { useState } from 'react';
import { Badge, Button, Nav, Navbar, Offcanvas } from 'react-bootstrap';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';
import { SIDEBAR_GROUPS } from '../constants/navigation';
import SlotAvailabilityToasts from './SlotAvailabilityToasts';
import { APP_CONFIG } from '../config/env';

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <path d="M2 4h12" />
      <path d="M2 8h12" />
      <path d="M2 12h12" />
    </svg>
  );
}

function SidebarIcon({ name, size = 16 }) {
  const icons = {
    grid: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="1" width="6" height="6" rx="1" />
        <rect x="9" y="1" width="6" height="6" rx="1" />
        <rect x="1" y="9" width="6" height="6" rx="1" />
        <rect x="9" y="9" width="6" height="6" rx="1" />
      </svg>
    ),
    lot: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="1" y="4" width="14" height="10" rx="1" />
        <path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1" />
        <path d="M1 8h14" />
      </svg>
    ),
    calendar: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="2" y="2" width="12" height="12" rx="1" />
        <path d="M5 2V0M11 2V0M2 6h12" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="8" cy="5" r="3" />
        <path d="M1 14c0-3.314 3.134-6 7-6s7 2.686 7 6" />
      </svg>
    ),
    stack: (
      <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M1 12L5 4l3 5 2-3 4 6H1z" />
      </svg>
    ),
  };

  const icon = icons[name] || null;
  if (!icon) return null;

  return (
    <span className="d-inline-flex flex-shrink-0" style={{ width: size, height: size }}>
      {icon}
    </span>
  );
}

function SidebarNav({ items, onNavigate }) {
  return (
    <Nav className="flex-column nav-pills gap-1">
      {items.map((item) => (
        <Nav.Item key={item.to}>
          <Nav.Link
            as={NavLink}
            to={item.to}
            end={item.to === '/'}
            onClick={onNavigate}
            className="d-flex align-items-center gap-2"
          >
            <SidebarIcon name={item.icon} size={18} />
            {item.label}
          </Nav.Link>
        </Nav.Item>
      ))}
    </Nav>
  );
}

function UserFooter({ session, onLogout }) {
  return (
    <div className="border-top pt-3 mt-auto">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div
          className="rounded-circle bg-secondary-subtle text-secondary-emphasis d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ width: 36, height: 36, fontSize: '0.72rem', fontWeight: 700 }}
        >
          {session?.username?.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="fw-semibold text-truncate">{session?.username}</div>
          <div className="text-secondary text-uppercase small">{session?.role}</div>
        </div>
      </div>
      <Button variant="outline-danger" size="sm" className="w-100" onClick={onLogout}>
        Sign out
      </Button>
    </div>
  );
}

function pageLabel(pathname, navItems) {
  if (pathname === '/') return 'Dashboard';
  const match = navItems.find((item) => item.to !== '/' && pathname.startsWith(item.to));
  if (match) return match.label;
  const segment = pathname.split('/').filter(Boolean).pop();
  return segment ? segment.replace(/-/g, ' ') : 'Page';
}

export default function AppShell() {
  const { session, logout } = useAuth();
  const location = useLocation();
  const navItems = SIDEBAR_GROUPS[session?.role || 'USER'];
  const [showMobile, setShowMobile] = useState(false);
  const currentPage = pageLabel(location.pathname, navItems);

  const closeMobile = () => setShowMobile(false);

  return (
    <div className="d-flex min-vh-100">
      <aside
        className="d-none d-lg-flex flex-column flex-shrink-0 border-end bg-body position-sticky top-0 vh-100 p-3"
        style={{ width: '16rem' }}
      >
        <div className="pb-3 mb-2 border-bottom">
          <div className="fw-bold">⬡ ParkEase</div>
          <div className="text-secondary small">Management Console</div>
        </div>
        <div className="flex-grow-1 overflow-auto py-2">
          <SidebarNav items={navItems} />
        </div>
        <UserFooter session={session} onLogout={logout} />
      </aside>

      <div className="flex-grow-1 d-flex flex-column" style={{ minWidth: 0 }}>
        <Navbar bg="body" expand="lg" className="border-bottom px-3">
          <div className="d-flex align-items-center gap-2 flex-grow-1 min-w-0">
            <Button
              variant="outline-secondary"
              size="sm"
              className="d-lg-none flex-shrink-0"
              onClick={() => setShowMobile(true)}
              aria-label="Open menu"
            >
              <MenuIcon />
            </Button>
            <Navbar.Brand className="mb-0 min-w-0">
              <div className="fw-bold lh-sm">ParkEase</div>
              <div className="text-secondary small text-truncate">Connected to {APP_CONFIG.apiBase}</div>
            </Navbar.Brand>
          </div>
          <Badge bg="secondary" className="text-uppercase flex-shrink-0 d-none d-sm-inline">
            {currentPage}
          </Badge>
        </Navbar>

        <main className="flex-grow-1 p-3 p-md-4">
          <Outlet />
        </main>
      </div>

      <SlotAvailabilityToasts />

      <Offcanvas show={showMobile} onHide={closeMobile} placement="start">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>ParkEase</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body className="d-flex flex-column">
          <div className="flex-grow-1">
            <SidebarNav items={navItems} onNavigate={closeMobile} />
          </div>
          <UserFooter session={session} onLogout={logout} />
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}
