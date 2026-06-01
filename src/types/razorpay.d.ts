interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayModalOptions {
  ondismiss?: () => void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string; contact?: string };
  handler?: (response: RazorpayPaymentResponse) => void;
  modal?: RazorpayModalOptions;
}

interface RazorpayConstructor {
  new (options: RazorpayOptions): { open: () => void };
}

interface Window {
  Razorpay?: RazorpayConstructor;
}
