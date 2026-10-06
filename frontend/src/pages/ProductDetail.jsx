import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, reserveInventory } from '../api/api';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product,  setProduct]  = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading,  setLoading]  = useState(true);
  const [reserving, setReserving] = useState(false);
  const [error,    setError]    = useState('');

  const userId = localStorage.getItem('userId');

  useEffect(() => {
    getProduct(id)
      .then((res) => setProduct(res.data.data))
      .catch(() => setError('Product not found.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleReserve = async () => {
    if (!userId) {
      setError('Please set your User ID in the navbar first.');
      return;
    }
    const available = product?.inventory?.availableQuantity ?? 0;
    if (available === 0) { setError('Out of stock.'); return; }
    if (quantity > available) { setError(`Only ${available} units available.`); return; }

    setReserving(true);
    setError('');
    try {
      const idempotencyKey = `reserve-${userId}-${id}-${Date.now()}`;
      const res = await reserveInventory(id, { userId, quantity, idempotencyKey });
      const reservation = res.data.data;
      navigate('/checkout', { state: { reservation, product, quantity } });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Reservation failed.');
    } finally {
      setReserving(false);
    }
  };

  if (loading) return <p className="text-center mt-20 text-gray-500">Loading…</p>;
  if (!product && !loading) return <p className="text-center mt-20 text-red-500">{error || 'Product not found.'}</p>;

  const available = product?.inventory?.availableQuantity ?? 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <button onClick={() => navigate(-1)} className="text-sm text-indigo-600 hover:underline mb-6 block">← Back</button>

      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
        {product.description && <p className="text-gray-500 mt-2">{product.description}</p>}

        <div className="mt-6 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Price</span>
            <span className="font-bold text-indigo-600 text-lg">₹{product.price.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Available Stock</span>
            <span className={`font-medium ${available > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {available > 0 ? `${available} units` : 'Out of Stock'}
            </span>
          </div>
        </div>

        {available > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 font-bold"
              >−</button>
              <span className="text-lg font-semibold w-6 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(available, q + 1))}
                className="w-8 h-8 rounded-full border border-gray-300 text-gray-600 hover:border-indigo-400 hover:text-indigo-600 font-bold"
              >+</button>
            </div>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-500 bg-red-50 rounded p-2">{error}</p>}

        <button
          onClick={handleReserve}
          disabled={reserving || available === 0}
          className="mt-6 w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {reserving ? 'Reserving…' : available === 0 ? 'Out of Stock' : 'Reserve & Checkout'}
        </button>
      </div>
    </div>
  );
}
