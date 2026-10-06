import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getProducts } from '../api/api';

export default function Home() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    getProducts()
      .then((res) => setProducts(res.data.data))
      .catch(() => setError('Failed to load products. Is the backend running?'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center mt-20 text-gray-500">Loading products…</p>;
  if (error)   return <p className="text-center mt-20 text-red-500">{error}</p>;
  if (!products.length) return <p className="text-center mt-20 text-gray-400">No products found.</p>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Flash Sale Products</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-3">
              <h2 className="text-lg font-semibold text-gray-800">{p.name}</h2>
              {p.description && <p className="text-sm text-gray-500 mt-1">{p.description}</p>}
            </div>
            <div className="flex items-center justify-between mt-4">
              <span className="text-xl font-bold text-indigo-600">₹{p.price.toLocaleString()}</span>
            </div>
            <button
              onClick={() => navigate(`/products/${p.id}`)}
              className="mt-4 w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
