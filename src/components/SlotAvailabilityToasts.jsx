import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../state/AuthContext';
import { createSlotAvailabilityClient } from '../services/slotAvailability';

function extractSlotAvailabilityEvent(payload) {
  const slotId = payload?.slotId ?? payload?.id ?? payload?.slot?.id;
  const slotNumber = payload?.slotNumber ?? payload?.slot?.slotNumber ?? slotId ?? 'unknown';
  let isAvailable = true;

  if (Object.prototype.hasOwnProperty.call(payload || {}, 'available')) {
    isAvailable = Boolean(payload.available);
  } else if (Object.prototype.hasOwnProperty.call(payload || {}, 'currentAvailable')) {
    isAvailable = Boolean(payload.currentAvailable);
  } else if (Object.prototype.hasOwnProperty.call(payload || {}, 'isAvailable')) {
    isAvailable = Boolean(payload.isAvailable);
  } else if (typeof payload?.status === 'string') {
    isAvailable = payload.status.toUpperCase() === 'AVAILABLE';
  }

  return {
    cacheKey: slotId == null ? null : String(slotId),
    slotNumber,
    isAvailable,
  };
}

function SlotToast({ item, onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => handleClose(), 4000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.65rem',
        minWidth: '17rem',
        maxWidth: '21rem',
        padding: '0.75rem 0.875rem',
        borderRadius: 'var(--bs-border-radius)',
        background: 'var(--bs-body-bg)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)',
        border: '1px solid var(--bs-border-color)',
        borderLeft: '3px solid var(--bs-success)',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.28s cubic-bezier(0.34,1.4,0.64,1), opacity 0.25s ease',
        marginTop: '0.5rem',
        fontFamily: 'var(--bs-body-font-family)',
        fontSize: 'var(--bs-body-font-size)',
      }}
    >
      {/* Icon */}
      <span
        style={{
          flexShrink: 0,
          width: 32,
          height: 32,
          borderRadius: 'var(--bs-border-radius)',
          background: 'rgba(var(--bs-success-rgb), 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--bs-success)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--bs-success)', marginBottom: '0.1rem', lineHeight: 1.3 }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--bs-secondary-color, var(--bs-body-color))', lineHeight: 1.4 }}>
          {item.message}
        </div>
      </div>

      {/* Close */}
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: 'var(--bs-secondary-color, #6c757d)',
          lineHeight: 1,
          alignSelf: 'flex-start',
          opacity: 0.6,
        }}
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M2 2l10 10M12 2L2 12" />
        </svg>
      </button>
    </div>
  );
}

export default function SlotAvailabilityToasts() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const toastCacheRef = useRef(new Map());
  const clientRef = useRef(null);

  useEffect(() => {
    // Show toasts for ALL authenticated roles (USER, ADMIN, OPERATOR, etc.)
    if (!session) return undefined;

    let cancelled = false;
    const client = createSlotAvailabilityClient({
      onMessage: (rawMessage) => {
        let payload = rawMessage;
        if (typeof rawMessage === 'string') {
          try {
            payload = JSON.parse(rawMessage);
          } catch {
            payload = { slotNumber: rawMessage };
          }
        }

        const slotData = extractSlotAvailabilityEvent(payload);
        if (!slotData.isAvailable) return;

        const cacheKey = slotData.cacheKey || String(slotData.slotNumber);
        const lastToastAt = toastCacheRef.current.get(cacheKey) || 0;
        if (Date.now() - lastToastAt < 4000) return;

        toastCacheRef.current.set(cacheKey, Date.now());
        if (!cancelled) {
          setNotifications((current) => [
            ...current,
            {
              id: `${cacheKey}-${Date.now()}`,
              title: '🅿 Slot Now Available',
              message: `Slot #${slotData.slotNumber} just became available — grab it while you can!`,
            },
          ]);
        }

        if (window.location.pathname === '/lots') {
          window.dispatchEvent(new Event('parkease:slots-refresh'));
        }
      },
      onDisconnect: () => { },
    });

    if (!client) return undefined;
    clientRef.current = client;
    client.connect().catch(() => { });

    return () => {
      cancelled = true;
      toastCacheRef.current.clear();
      clientRef.current?.disconnect?.();
      clientRef.current = null;
    };
  }, [session]);

  return (
    <div
      aria-label="Slot availability notifications"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 1080,
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      {notifications.map((item) => (
        <div key={item.id} style={{ pointerEvents: 'auto' }}>
          <SlotToast
            item={item}
            onClose={() =>
              setNotifications((current) => current.filter((n) => n.id !== item.id))
            }
          />
        </div>
      ))}
    </div>
  );
}