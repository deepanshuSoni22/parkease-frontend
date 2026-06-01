import { api } from './api';

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/**
 * @typedef {{ bookingId: number; orderId: string; amount: number; key: string }} RazorpayCreateOrderResponse
 */

/**
 * @typedef {{ razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }} RazorpayPaymentResponse
 */

/**
 * @typedef {{
 *   key: string;
 *   amount: number;
 *   currency: string;
 *   order_id: string;
 *   name?: string;
 *   description?: string;
 *   notes?: Record<string, string>;
 *   prefill?: { name?: string; email?: string; contact?: string };
 *   handler?: (response: RazorpayPaymentResponse) => void;
 *   modal?: { ondismiss?: () => void };
 * }} RazorpayOptions
 */

/**
 * @typedef {new (options: RazorpayOptions) => { open: () => void }} RazorpayConstructor
 */

let cachedRazorpayPromise = null;

export async function loadRazorpayCheckout() {
  if (typeof window === 'undefined') {
    throw new Error('Razorpay checkout can only be loaded in the browser.');
  }

  if (window.Razorpay) {
    return window.Razorpay;
  }

  if (!cachedRazorpayPromise) {
    cachedRazorpayPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) {
          resolve(window.Razorpay);
        } else {
          reject(new Error('Razorpay loaded but did not expose window.Razorpay.'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load Razorpay checkout script.'));
      document.body.appendChild(script);
    });
  }

  return cachedRazorpayPromise;
}

export async function createPaymentOrder(bookingId) {
  return api.post(`/api/v1/payments/create-order/${bookingId}`);
}

export async function retryPaymentOrder(bookingId) {
  return api.post(`/api/v1/payments/retry/${bookingId}`);
}

export async function verifyPayment({ bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  return api.post('/api/v1/payments/verify', {
    bookingId,
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });
}
