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
    // Trigger slide-in on mount
    const show = requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 4 s
    const timer = setTimeout(() => handleClose(), 4000);
    return () => {
      cancelAnimationFrame(show);
      clearTimeout(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300); // wait for slide-out animation
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        minWidth: '18rem',
        maxWidth: '22rem',
        padding: '0.85rem 1rem',
        borderRadius: '0.625rem',
        background: 'rgba(255,255,255,0.97)',
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
        border: '1px solid rgba(22,163,74,0.25)',
        borderLeft: '4px solid #16a34a',
        transform: visible ? 'translateX(0)' : 'translateX(110%)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease',
        marginTop: '0.5rem',
        position: 'relative',
      }}
    >
      {/* Parking icon */}
      <span
        style={{
          flexShrink: 0,
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(22,163,74,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
        </svg>
      </span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#15803d', marginBottom: '0.15rem' }}>
          {item.title}
        </div>
        <div style={{ fontSize: '0.825rem', color: '#374151', lineHeight: 1.4 }}>
          {item.message}
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        aria-label="Dismiss notification"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px',
          color: '#9ca3af',
          lineHeight: 1,
          alignSelf: 'flex-start',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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
      onDisconnect: () => {},
    });

    if (!client) return undefined;
    clientRef.current = client;
    client.connect().catch(() => {});

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
