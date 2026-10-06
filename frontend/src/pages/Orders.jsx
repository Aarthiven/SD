import { useEffect, useState } from 'react';
import { getOrder } from '../api/api';

const STATUS_COLORS = {
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-700',
  CONFIRMED:       'bg-green-100 text-green-700',
  CANCELLED:       'bg-red-100 text-red-500',
};

const PAY_COLORS = {
  SUCCESS: 'bg-green-100 text-green-700',
  FAILED:  'bg-red-100 text-red-500',
  TIMEOUT: 'bg-yellow-100 text-yellow-700',
};

export default function Orders() {
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ids = JSON.parse(localStorage.getItem('orderIds') || '[]');
    if (!ids.length) { setLoading(false); return; }

    Promise.all(ids.map((id) => getOrder(id).then((r) => r.data.data).catch(() => null)))
      .then((results) => setOrders(results.filter(Boolean)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-20 text-gray-500">Loading orders…</p>;

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">My Orders</h1>

      {!orders.length ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-4xl mb-3">📦</p>
          <p>No orders yet. Go buy something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-xs text-gray-400 font-mono mb-1">Order ID: {order.id}</p>
                  <p className="text-lg font-bold text-indigo-600">₹{order.totalPrice?.toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Placed: {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-500'}`}>
                    Order: {order.status}
                  </span>
                  {order.payment && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PAY_COLORS[order.payment.status] || 'bg-gray-100 text-gray-500'}`}>
                      Payment: {order.payment.status}
                    </span>
                  )}
                </div>
              </div>

              {/* Items */}
              {order.items?.length > 0 && (
                <div className="mt-3 pt-3 border-t text-sm space-y-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="flex justify-between text-gray-600">
                      <span>{item.product?.name} × {item.quantity}</span>
                      <span>₹{(item.unitPrice * item.quantity).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
