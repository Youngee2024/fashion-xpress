import { useCallback, useEffect, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/CartDrawer'
import { Layout } from './components/Layout'
import { RouteMeta } from './components/RouteMeta'
import { readCart, writeCart } from './data/cartStorage'
import { About } from './pages/About'
import { ARTryOn } from './pages/ARTryOn'
import { Collections } from './pages/Collections'
import { Community } from './pages/Community'
import { Contact } from './pages/Contact'
import { GetStarted } from './pages/GetStarted'
import { Home } from './pages/Home'
import { AccessibilityStatement, Licensing, Privacy, RefundPolicy, Terms } from './pages/InformationPages'
import { Mint } from './pages/Mint'
import { NotFound } from './pages/NotFound'
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

  return <>
    <RouteMeta />
    <Layout cartCount={cartCount} onCartOpen={openCart}>
      <Routes>
        <Route path="/" element={<Home onAdd={add} />} />
        <Route path="/collections" element={<Collections onAdd={add} />} />
        <Route path="/collections/:id" element={<ProductDetail onAdd={add} />} />
        <Route path="/ar-tryon" element={<ARTryOn />} />
        <Route path="/community" element={<Community />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/get-started" element={<GetStarted />} />
        <Route path="/mint/:id" element={<Mint />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/licensing" element={<Licensing />} />
        <Route path="/refund-policy" element={<RefundPolicy />} />
        <Route path="/accessibility" element={<AccessibilityStatement />} />
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
  </>
}
