import { useCallback, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { CartDrawer } from './components/CartDrawer'
import { Layout } from './components/Layout'
import { RouteMeta } from './components/RouteMeta'
import { About } from './pages/About'
import { ARTryOn } from './pages/ARTryOn'
import { Collections } from './pages/Collections'
import { Community } from './pages/Community'
import { Contact } from './pages/Contact'
import { GetStarted } from './pages/GetStarted'
import { Home } from './pages/Home'
import { Mint } from './pages/Mint'
import { NotFound } from './pages/NotFound'
import { ProductDetail } from './pages/ProductDetail'

export default function App() {
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const removeFromCart = useCallback((index) => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index)), [])

  function add(product) {
    setCart((current) => [...current, product])
    setCartOpen(true)
  }

  return <>
    <RouteMeta />
    <Layout cartCount={cart.length} onCartOpen={openCart}>
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
    <CartDrawer
      open={cartOpen}
      items={cart}
      onClose={closeCart}
      onRemove={removeFromCart}
    />
  </>
}
