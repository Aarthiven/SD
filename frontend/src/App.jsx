import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar        from './components/Navbar';
import Home          from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Checkout      from './pages/Checkout';
import Payment       from './pages/Payment';
import Orders        from './pages/Orders';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/"              element={<Home />} />
          <Route path="/products/:id"  element={<ProductDetail />} />
          <Route path="/checkout"      element={<Checkout />} />
          <Route path="/payment"       element={<Payment />} />
          <Route path="/orders"        element={<Orders />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
