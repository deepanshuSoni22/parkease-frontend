import { useCallback, useState } from 'react';
import { createPaymentOrder, retryPaymentOrder, loadRazorpayCheckout, verifyPayment } from '../services/payments';

/**
 * @typedef {Object} UseRazorpayPaymentOptions
 * @property {() => void} [onSuccess]
 * @property {(message: string) => void} [onFailure]
 * @property {() => void} [onCancel]
 */

/**
 * @typedef {Object} StartPaymentOptions
 * @property {number} bookingId
 * @property {string} name
 * @property {string} description
 * @property {{ name?: string; email?: string; contact?: string }} [prefill]
 */

export function useRazorpayPayment({ onSuccess, onFailure, onCancel } = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryError, setRetryError] = useState('');

  const startPayment = useCallback(
    async ({ bookingId, name, description, prefill }) => {
      setError('');
      setSuccessMessage('');
      setLoading(true);

      try {
        const order = await createPaymentOrder(bookingId);
        const Razorpay = await loadRazorpayCheckout();

        const options = {
          key: order.key,
          amount: order.amount,
          currency: 'INR',
          order_id: order.orderId,
          name,
          description,
          notes: { bookingId: String(order.bookingId) },
          prefill,
          handler: async (response) => {
            try {
              await verifyPayment({
                bookingId: order.bookingId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              const message = 'Payment completed successfully. Your booking is confirmed.';
              setSuccessMessage(message);
              onSuccess?.();
            } catch (verifyError) {
              const message = verifyError?.message || 'Payment verification failed. Please try again.';
              setError(message);
              onFailure?.(message);
            } finally {
              setLoading(false);
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
              const message = 'Payment was cancelled. You can try again from your bookings page.';
              setError(message);
              onCancel?.();
            },
          },
        };

        const checkout = new Razorpay(options);
        checkout.open();
      } catch (startError) {
        const message = startError?.message || 'Unable to start payment. Please try again later.';
        setError(message);
        setLoading(false);
        onFailure?.(message);
        throw startError;
      }
    },
    [onCancel, onFailure, onSuccess]
  );

  const retryPayment = useCallback(
    async ({ bookingId, name, description, prefill }) => {
      setRetryError('');
      setSuccessMessage('');
      setIsRetrying(true);

      try {
        const order = await retryPaymentOrder(bookingId);
        const Razorpay = await loadRazorpayCheckout();

        const options = {
          key: order.key,
          amount: order.amount,
          currency: 'INR',
          order_id: order.orderId,
          name,
          description,
          notes: { bookingId: String(order.bookingId) },
          prefill,
          handler: async (response) => {
            try {
              await verifyPayment({
                bookingId: order.bookingId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              const message = 'Payment completed successfully. Your booking is confirmed.';
              setSuccessMessage(message);
              onSuccess?.();
            } catch (verifyError) {
              const message = verifyError?.message || 'Payment verification failed. Please try again.';
              setRetryError(message);
              onFailure?.(message);
            } finally {
              setIsRetrying(false);
            }
          },
          modal: {
            ondismiss: () => {
              setIsRetrying(false);
              const message = 'Payment was cancelled. You can try again from your bookings page.';
              setRetryError(message);
              onCancel?.();
            },
          },
        };

        const checkout = new Razorpay(options);
        checkout.open();
      } catch (startError) {
        const message = startError?.message || 'Unable to start retry payment. Please try again later.';
        setRetryError(message);
        setIsRetrying(false);
        onFailure?.(message);
        throw startError;
      }
    },
    [onCancel, onFailure, onSuccess]
  );

  return {
    loading,
    error,
    successMessage,
    startPayment,
    isRetrying,
    retryError,
    retryPayment,
    setError,
    setSuccessMessage,
  };
}
