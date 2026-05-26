import React, { useEffect, useRef, useState } from 'react';
import { Toast, ToastContainer } from 'react-bootstrap';
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

export default function SlotAvailabilityToasts() {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const toastCacheRef = useRef(new Map());
  const clientRef = useRef(null);

  useEffect(() => {
    if (!session || session.role !== 'USER') return undefined;

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
              title: 'Slot available',
              message: `Slot #${slotData.slotNumber} is now available.`,
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
    <ToastContainer position="bottom-end" className="p-3">
      {notifications.map((item) => (
        <Toast
          key={item.id}
          bg="light"
          onClose={() => setNotifications((current) => current.filter((toast) => toast.id !== item.id))}
          delay={3500}
          autohide
          show
        >
          <Toast.Header>
            <strong className="me-auto">{item.title}</strong>
          </Toast.Header>
          <Toast.Body>{item.message}</Toast.Body>
        </Toast>
      ))}
    </ToastContainer>
  );
}
