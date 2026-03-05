import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { fetchCurrentUser } from './store/authSlice'
import { fetchCart } from './store/cartSlice'
import { fetchWishlist } from './store/wishlistSlice'
import Navbar from './components/layout/Navbar'
import Footer from './components/layout/Footer'
import LoadingSpinner from './components/ui/LoadingSpinner'

/* ─── Lazy-loaded Pages ─── */
const HomePage = lazy(() => import('./pages/home/HomePage'))
const ShopPage = lazy(() => import('./pages/shop/ShopPage'))
const NewArrivalsPage = lazy(() => import('./pages/shop/NewArrivalsPage'))
const ProductDetailPage = lazy(() => import('./pages/product/ProductDetailPage'))
const LoginPage = lazy(() => import('./pages/auth/LoginPage'))
const CartPage = lazy(() => import('./pages/cart/CartPage'))
const CheckoutPage = lazy(() => import('./pages/checkout/CheckoutPage'))
const WishlistPage = lazy(() => import('./pages/wishlist/WishlistPage'))
const OrdersPage = lazy(() => import('./pages/orders/OrdersPage'))
const OrderDetailPage = lazy(() => import('./pages/orders/OrderDetailPage'))
const ProfilePage = lazy(() => import('./pages/profile/ProfilePage'))
const AddressesPage = lazy(() => import('./pages/addresses/AddressesPage'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

/* ─── Protected Route Wrapper ─── */
function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useSelector((s) => s.auth)
  if (loading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'Admin') return <Navigate to="/" replace />
  return children
}

/* ─── Scroll to Top on Route Change ─── */
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

/* ─── App Component ─── */
export default function App() {
  const dispatch = useDispatch()
  const { user } = useSelector((s) => s.auth)
  const token = localStorage.getItem('token')

  // Restore user session on app load
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchCurrentUser())
    }
  }, [])

  // Fetch cart & wishlist when user is authenticated
  useEffect(() => {
    if (user) {
      dispatch(fetchCart())
      dispatch(fetchWishlist())
    }
  }, [user])

  return (
    <div className="min-h-screen flex flex-col bg-ivory">
      <ScrollToTop />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<LoadingSpinner text="Loading page..." />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/new-arrivals" element={<NewArrivalsPage />} />
            <Route path="/product/:idOrSlug" element={<ProductDetailPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Auth Required */}
            <Route path="/cart" element={<ProtectedRoute><CartPage /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><WishlistPage /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
            <Route path="/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/addresses" element={<ProtectedRoute><AddressesPage /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

            {/* Catch-all */}
            <Route path="*" element={
              <div className="text-center py-20">
                <h1 className="text-6xl font-display font-bold text-primary mb-4">404</h1>
                <p className="text-gray-500 text-lg mb-6">Page not found</p>
                <a href="/" className="bg-primary text-white px-6 py-2.5 rounded-full font-medium hover:bg-primary-dark transition">Go Home</a>
              </div>
            } />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
