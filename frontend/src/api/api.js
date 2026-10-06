import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Products
export const getProducts = () => api.get('/products');
export const getProduct  = (id) => api.get(`/products/${id}`);

// Inventory
export const reserveInventory = (productId, data) =>
  api.post(`/inventory/${productId}/reserve`, data);

// Reservation
export const getReservation   = (id) => api.get(`/reservations/${id}`);
export const releaseReservation = (id) => api.post(`/reservations/${id}/release`);

// Checkout
export const checkout = (data) => api.post('/checkout', data);

// Payment
export const processPayment = (data) => api.post('/payments', data);

// Orders
export const getOrder = (id) => api.get(`/orders/${id}`);
