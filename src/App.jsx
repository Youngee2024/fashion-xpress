import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { CartDrawer } from './components/CartDrawer'
import { Layout } from './components/Layout'
import { RouteMeta } from './components/RouteMeta'
import { normalizeCart, readCart, writeCart } from './data/cartStorage'
import { removeCompletedFromCart } from './data/demoCheckout'
import { productById } from './data/products'
import { About } from './pages/About'
import { ARTryOn } from './pages/ARTryOn'
import { Collections } from './pages/Collections'
import { Checkout, CheckoutComplete } from './pages/Checkout'
import { Community } from './pages/Community'
import { Discussion } from './pages/Discussion'
import { DemoVault } from './pages/DemoVault'
import { AuthPage, RequireAuth, VerifyOtpPage } from './pages/AuthPage'
import { ProfileForm, ProfilePage } from './pages/Profile'
import { Contact } from './pages/Contact'
import { GetStarted } from './pages/GetStarted'
import { Home } from './pages/Home'
import { AccessibilityStatement, CommunityGuidelines, Licensing, Privacy, RefundPolicy, Terms } from './pages/InformationPages'
import { Mint, MintComplete } from './pages/Mint'
import { NotFound } from './pages/NotFound'
import { NewsletterConfirm, NewsletterUnsubscribe } from './pages/NewsletterAction'
import { ProductDetail } from './pages/ProductDetail'

export default function App() {
  const [cart, setCart] = useState(() => readCart())
  const [cartOpen, setCartOpen] = useState(false)
  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const removeFromCart = useCallback((id) => setCart((current) => current.filter(({ product }) => product.id !== id)), [])
  const changeQuantity = useCallback((id, change) => setCart((current) => current.flatMap((entry) => {
    if (entry.product.id !== id) return [entry]
    const quantity = Math.min(99, entry.quantity + change)
    return quantity > 0 ? [{ ...entry, quantity }] : []
  })), [])

  useEffect(() => { writeCart(cart) }, [cart])
  const cartCount = cart.reduce((sum, entry) => sum + entry.quantity, 0)

  function add(product) {
    setCart((current) => current.some((entry) => entry.product.id === product.id)
      ? current.map((entry) => entry.product.id === product.id ? { ...entry, quantity: Math.min(99, entry.quantity + 1) } : entry)
      : [...current, { product, quantity: 1 }])
    setCartOpen(true)
  }

  function completeDemoItems(items) {
    setCart((current) => removeCompletedFromCart(current, items))
  }

  function restartDemoItems(items) {
    setCart((current) => normalizeCart([...current, ...items.flatMap((item) => {
      const id = item.productId ?? item.id
      return productById[id] ? [{ id, quantity: item.quantity }] : []
    })]))
  }

  return <AuthProvider>
    <RouteMeta />
    <Layout cartCount={cartCount} onCartOpen={openCart}>
      <Routes>
        <Route path="/" element={<Home onAdd={add} />} />
        <Route path="/collections" element={<Collections onAdd={add} />} />
        <Route path="/collections/:id" element={<ProductDetail onAdd={add} />} />
        <Route path="/checkout" element={<Checkout cart={cart} onQuantityChange={changeQuantity} onRemove={removeFromCart} onCompleted={completeDemoItems} />} />
        <Route path="/checkout/complete" element={<CheckoutComplete onRestart={restartDemoItems} />} />
        <Route path="/demo-collection" element={<DemoVault />} />
        <Route path="/ar-tryon" element={<ARTryOn />} />
        <Route path="/community" element={<Community />} />
        <Route path="/community/:id" element={<Discussion />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/auth/verify" element={<VerifyOtpPage />} />
        <Route path="/profile/setup" element={<RequireAuth><ProfileForm setup /></RequireAuth>} />
        <Route path="/profile/edit" element={<RequireAuth needsProfile><ProfileForm /></RequireAuth>} />
        <Route path="/profile/:handle" element={<ProfilePage />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/mint/:id" element={<Mint />} />
        <Route path="/mint/:id/complete" element={<MintComplete />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/community-guidelines" element={<CommunityGuidelines />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/licensing" element={<Licensing />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/accessibility" element={<AccessibilityStatement />} />
        <Route path="/newsletter/confirm" element={<NewsletterConfirm />} />
        <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribe />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
    <CartDrawer
      open={cartOpen}
      items={cart}
      onClose={closeCart}
      onRemove={removeFromCart}
      onQuantityChange={changeQuantity}
    />
  </AuthProvider>
}
