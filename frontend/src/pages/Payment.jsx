import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { processPayment } from '../api/api';

const STATUS_CONFIG = {
  SUCCESS: {
    label:  'Pay & Confirm',
    style:  'bg-green-600 hover:bg-green-700',
    icon:   '✅',
    desc:   'Simulates a successful payment',
  },
  FAILED: {
    label:  'Simulate Failure',
    style:  'bg-red-500 hover:bg-red-600',
    icon:   '❌',
    desc:   'Payment declined — reservation will be released',
  },
  TIMEOUT: {
    label:  'Simulate Timeout',
    style:  'bg-yellow-500 hover:bg-yellow-600',
    icon:   '⏱️',
    desc:   'Payment timed out — order stays recoverable',
  },
};

export default function Payment() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');

  if (!state?.order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">No payment session found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:underline text-sm">← Home</button>
      </div>
    );
  }

  const { order, product, total } = state;

  const handlePay = async (status) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const idempotencyKey = `pay-${order.id}-${status}-${Date.now()}`;
      const res = await processPayment({
        orderId: order.id,
        amount:  total,
        status,
        idempotencyKey,
      });
      setResult({ status, payment: res.data.data });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Payment request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Mock Payment</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        {/* Summary */}
        <div className="border-b pb-4 mb-5 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Product</span>
            <span className="text-gray-800 font-medium">{product?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Order ID</span>
            <span className="text-gray-600 font-mono text-xs">{order.id.slice(0, 16)}…</span>
          </div>
          <div className="flex justify-between font-bold text-base mt-2">
            <span>Amount</span>
            <span className="text-indigo-600">₹{total?.toLocaleString()}</span>
          </div>
        </div>

        {!result ? (
          <>
            <p className="text-xs text-gray-400 mb-4 text-center">Choose a payment outcome to simulate:</p>
            <div className="space-y-3">
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                <button
                  key={status}
                  onClick={() => handlePay(status)}
                  disabled={loading}
                  className={`w-full text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 ${cfg.style}`}
                >
                  {loading ? 'Processing…' : `${cfg.icon} ${cfg.label}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              {Object.values(STATUS_CONFIG).map(c => c.desc).join(' · ')}
            </p>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className={`text-5xl`}>
              {result.status === 'SUCCESS' ? '🎉' : result.status === 'FAILED' ? '💔' : '⏳'}
            </div>
            <h2 className={`text-lg font-bold ${
              result.status === 'SUCCESS' ? 'text-green-600' :
              result.status === 'FAILED'  ? 'text-red-500'   : 'text-yellow-600'
            }`}>
              Payment {result.status}
            </h2>
            <p className="text-sm text-gray-500">
              {result.status === 'SUCCESS' && 'Order confirmed! Stock has been updated.'}
              {result.status === 'FAILED'  && 'Payment declined. Reservation released, stock restored.'}
              {result.status === 'TIMEOUT' && 'Payment timed out. Order is still recoverable.'}
            </p>
            <div className="flex gap-3 justify-center mt-4">
              <button
                onClick={() => navigate(`/orders`)}
                className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700"
              >
                View My Orders
              </button>
              <button
                onClick={() => navigate('/')}
                className="border border-gray-300 text-gray-600 text-sm px-5 py-2 rounded-lg hover:border-indigo-400 hover:text-indigo-600"
              >
                Back to Products
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500 bg-red-50 rounded p-2 text-center">{error}</p>}
      </div>
    </div>
  );
}
