import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkout } from '../api/api';

export default function Checkout() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const userId = localStorage.getItem('userId');

  if (!state?.reservation || !state?.product) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12 text-center">
        <p className="text-gray-500">No checkout session found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-indigo-600 hover:underline text-sm">← Go to Products</button>
      </div>
    );
  }

  const { reservation, product, quantity } = state;
  const total = product.price * quantity;

  const handlePlaceOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await checkout({ reservationId: reservation.id, userId });
      const order = res.data.data;

      // Save order ID locally for My Orders
      const stored = JSON.parse(localStorage.getItem('orderIds') || '[]');
      stored.unshift(order.id);
      localStorage.setItem('orderIds', JSON.stringify([...new Set(stored)]));

      navigate('/payment', { state: { order, product, total } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Checkout</h1>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        {/* Reservation badge */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-700">
          ✅ Reservation confirmed — expires at {new Date(reservation.expiresAt).toLocaleTimeString()}
        </div>

        {/* Order summary */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{product.name}</span>
              <span className="text-gray-800">₹{product.price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Quantity</span>
              <span className="text-gray-800">{quantity}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold">
              <span>Total</span>
              <span className="text-indigo-600">₹{total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

        <button
          onClick={handlePlaceOrder}
          disabled={loading}
          className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'Placing Order…' : 'Place Order →'}
        </button>
      </div>
    </div>
  );
}
