import axios from 'axios'

const API = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 and try refresh token
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const refreshToken = localStorage.getItem('refreshToken')
      if (refreshToken) {
        try {
          const { data } = await axios.post('/api/auth/refresh-token', { refreshToken })
          if (data.success) {
            localStorage.setItem('token', data.data.token)
            localStorage.setItem('refreshToken', data.data.refreshToken)
            originalRequest.headers.Authorization = `Bearer ${data.data.token}`
            return API(originalRequest)
          }
        } catch {
          localStorage.removeItem('token')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

// ──────── Auth API ────────
export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  logout: (refreshToken) => API.post('/auth/logout', { refreshToken }),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
}

// ──────── Products API ────────
export const productsAPI = {
  getAll: (params) => API.get('/products', { params }),
  getById: (id) => API.get(`/products/${id}`),
  getBySlug: (slug) => API.get(`/products/slug/${slug}`),
  getFeatured: (count = 8) => API.get('/products/featured', { params: { count } }),
  getSpecialOffers: (count = 12) => API.get('/products/special-offers', { params: { count } }),
  getNewArrivals: (count = 12) => API.get('/products/new-arrivals', { params: { count } }),
  getRelated: (id, count = 6) => API.get(`/products/${id}/related`, { params: { count } }),
  getFilterOptions: () => API.get('/products/filter-options'),
}

// ──────── Categories API ────────
export const categoriesAPI = {
  getAll: () => API.get('/categories'),
  getById: (id) => API.get(`/categories/${id}`),
  getBySlug: (slug) => API.get(`/categories/slug/${slug}`),
}

// ──────── Cart API ────────
export const cartAPI = {
  get: () => API.get('/cart'),
  add: (data) => API.post('/cart', data),
  update: (itemId, data) => API.put(`/cart/${itemId}`, data),
  remove: (itemId) => API.delete(`/cart/${itemId}`),
  clear: () => API.delete('/cart/clear'),
}

// ──────── Wishlist API ────────
export const wishlistAPI = {
  get: () => API.get('/wishlist'),
  add: (productId) => API.post(`/wishlist/${productId}`),
  remove: (productId) => API.delete(`/wishlist/${productId}`),
}

// ──────── Orders API ────────
export const ordersAPI = {
  create: (data) => API.post('/orders', data),
  getAll: () => API.get('/orders'),
  getById: (orderId) => API.get(`/orders/${orderId}`),
  cancel: (orderId) => API.post(`/orders/${orderId}/cancel`),
}

// ──────── Addresses API ────────
export const addressesAPI = {
  getAll: () => API.get('/addresses'),
  add: (data) => API.post('/addresses', data),
  update: (id, data) => API.put(`/addresses/${id}`, data),
  delete: (id) => API.delete(`/addresses/${id}`),
}

// ──────── Reviews API ────────
export const reviewsAPI = {
  getForProduct: (productId) => API.get(`/reviews/product/${productId}`),
  add: (data) => API.post('/reviews', data),
}

// ──────── Admin API ────────
export const adminAPI = {
  getDashboard: () => API.get('/admin/dashboard'),
  getProducts: (params) => API.get('/admin/products', { params }),
  createProduct: (data) => API.post('/admin/products', data),
  updateProduct: (id, data) => API.put(`/admin/products/${id}`, data),
  checkProductOrders: (id) => API.get(`/admin/products/${id}/has-orders`),
  deleteProduct: (id, permanent = false) => API.delete(`/admin/products/${id}?permanent=${permanent}`),
  updateStock: (id, quantity) => API.patch(`/admin/products/${id}/stock`, quantity),
  uploadProductImage: (productId, file, isPrimary = false) => {
    const formData = new FormData()
    formData.append('file', file)
    return API.post(`/admin/products/${productId}/images?isPrimary=${isPrimary}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteProductImage: (imageId) => API.delete(`/admin/products/images/${imageId}`),
  getAllOrders: (params) => API.get('/admin/orders', { params }),
  updateOrderStatus: (orderId, data) => API.put(`/admin/orders/${orderId}/status`, data),
  createCategory: (data) => API.post('/admin/categories', data),
  updateCategory: (id, data) => API.put(`/admin/categories/${id}`, data),
  deleteCategory: (id) => API.delete(`/admin/categories/${id}`),
  uploadCategoryImage: (categoryId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return API.post(`/admin/categories/${categoryId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  bulkCreateProducts: (rows) => API.post('/admin/products/bulk', rows),
  approveReview: (reviewId) => API.put(`/admin/reviews/${reviewId}/approve`),
  deleteReview: (reviewId) => API.delete(`/admin/reviews/${reviewId}`),
}

export default API
