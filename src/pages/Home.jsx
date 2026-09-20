import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { Newsletter, SectionHeading } from '../components/Layout'
import { PrototypeNotice } from '../components/PrototypeUI'
import { ProductCard } from '../components/ProductCard'
import { SafeImage } from '../components/SafeImage'
import { products } from '../data/products'

const features = ['Creator-led', 'Limited concepts', 'Camera exploration', 'Global perspective']

export function Home({ onAdd }) {
  return <>
    <section className="hero page-shell"><div className="hero-copy"><span className="eyebrow"><Icon name="spark" size={15}/> Digital fashion, made human</span><h1>Wear the<br/><em>impossible.</em></h1><p>Explore a portfolio concept for African digital couture—designed around expression, creator ownership, and new ways to experience fashion.</p><div className="button-row"><Link className="button" to="/collections">Explore the collection <Icon name="arrow" size={17}/></Link><Link className="text-link" to="/about">Discover the concept <Icon name="arrow" size={16}/></Link></div><div className="brand-values" aria-label="FashionXpress concept values">{features.slice(0, 3).map((feature, index) => <div key={feature}><b>0{index + 1}</b><span>{feature}</span></div>)}</div></div><div className="hero-art"><div className="hero-frame"><SafeImage priority width="860" height="1160" src="/images/hero-model.jpg" alt="Digital couture model"/></div><span className="floating-note note-one">01 / Genesis concept</span><span className="floating-note note-two">Made beyond matter</span></div></section>
    <section className="marquee" aria-label="FashionXpress values"><div>{features.map((feature) => <span key={feature}>{feature}<i aria-hidden="true">✦</i></span>)}</div></section>

    <section className="page-shell section journey home-journey"><SectionHeading eyebrow="One world, many doors" title="Choose your experience." copy="Start with the part of the concept that matters to you." align="center"/><div className="journey-grid"><Link to="/ar-tryon" className="journey-card"><SafeImage src="/images/ar.jpg" alt="Augmented reality fashion concept"/><span>For collectors</span><h3>Try on a new reality.</h3><i><Icon name="arrow"/></i></Link><Link to="/get-started" className="journey-card"><SafeImage src="/images/build.jpg" alt="Digital fashion creator"/><span>For creators</span><h3>Build the new fashion house.</h3><i><Icon name="arrow"/></i></Link><Link to="/community" className="journey-card"><SafeImage src="/images/community.jpg" alt="Fashion community"/><span>For community</span><h3>Find your people.</h3><i><Icon name="arrow"/></i></Link></div></section>

    <section className="page-shell section featured-section"><SectionHeading eyebrow="New expressions" title="The Genesis collection." copy="A consistent featured edit of the first three concept pieces, followed by the complete nine-piece collection."/><p className="swipe-hint">Swipe to explore all featured pieces →</p><div className="product-grid featured-products">{products.slice(0, 3).map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd}/>)}</div><Link className="text-link section-link" to="/collections">View the full collection <Icon name="arrow" size={16}/></Link></section>

    <section className="manifesto"><div className="manifesto-image"><SafeImage src="/images/creators.jpg" alt="Fashion creator at work" width="1000" height="1200"/></div><div className="manifesto-copy"><span className="eyebrow">The concept</span><h2>Culture is our source code.</h2><p>FashionXpress imagines tools that could give independent designers more room to build lasting worlds around their work—without flattening their voice.</p><div className="mini-grid"><div><b>01</b><h3>Create freely</h3><p>Digital tools designed to expand craft and experimentation.</p></div><div><b>02</b><h3>Explain clearly</h3><p>Prototype ownership and edition language without pretending transactions are live.</p></div></div><Link className="button ghost" to="/about">Read our point of view <Icon name="arrow" size={16}/></Link></div></section>

    <section className="page-shell section home-community"><div className="home-community-copy"><span className="eyebrow">Local prototype community</span><h2>Ideas look better in company.</h2><p>Explore demonstration conversations, test local reactions, and preview how a creator community could feel.</p><PrototypeNotice compact>Discussions and likes exist only in your current browser session.</PrototypeNotice><Link className="button" to="/community">Enter the community <Icon name="arrow" size={16}/></Link></div><SafeImage src="/images/community.jpg" alt="Creative fashion community" width="1000" height="760"/></section>

    <div className="page-shell"><Newsletter/></div>

    <section className="page-shell home-creator-cta"><div><span className="eyebrow">For independent creators</span><h2>Bring the point of view.</h2><p>Explore the creator-application concept and learn what a future FashionXpress atelier could offer.</p><Link className="button" to="/get-started">View creator atelier <Icon name="arrow" size={16}/></Link></div><SafeImage src="/images/build.jpg" alt="Digital fashion designer building a collection" width="900" height="1100"/></section>
  </>
}
