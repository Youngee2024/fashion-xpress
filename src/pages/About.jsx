import { Link } from 'react-router-dom'
import { Icon } from '../components/Icons'
import { SafeImage } from '../components/SafeImage'

export function About() {
  return <>
    <section className="about-hero page-shell"><span className="eyebrow">Our point of view</span><h1>African creativity,<br/><em>without borders.</em></h1><p>FashionXpress is building the bridge between traditional craftsmanship and the global digital economy.</p></section>
    <section className="about-image"><SafeImage src="/images/1.jpg" alt="Editorial African fashion portrait"/><div><span>Founded in Lagos</span><span>Designed for everywhere</span></div></section>
    <section className="page-shell story-grid"><div><span className="eyebrow">Why we exist</span></div><div><h2>The future should remember where it came from.</h2><p>Digital fashion can be more than novelty. It can preserve stories, fund independent creativity, and let people everywhere participate in culture without consuming more material.</p><p>We pair tools like AR and verified ownership with a deep respect for the hand, heritage, and imagination behind each piece.</p></div></section>
    <section className="page-shell values"><article><b>01</b><h3>Creator first</h3><p>Designers keep their voice, ownership, and a meaningful share of every sale.</p></article><article><b>02</b><h3>Progress, considered</h3><p>We use low-impact infrastructure and digital sampling to reduce physical waste.</p></article><article><b>03</b><h3>Access is power</h3><p>Great work deserves global reach, regardless of geography or gatekeepers.</p></article></section>
    <section className="page-shell about-cta">
      <div className="about-cta-visual"><SafeImage src="/images/3.jpg" alt="FashionXpress digital fashion creator"/><span>Atelier intake · 2026</span></div>
      <div className="about-cta-copy">
        <span className="eyebrow">The next chapter</span>
        <h2>Your vision<br/><em>belongs here.</em></h2>
        <p>Join a global atelier for independent designers creating what fashion becomes next. Bring the point of view—we’ll help build the world around it.</p>
        <div className="about-cta-actions"><Link className="button" to="/get-started">Apply to create <Icon name="arrow" size={16}/></Link><Link className="text-link" to="/contact">Talk to our team <Icon name="arrow" size={16}/></Link></div>
        <div className="about-cta-meta"><span><b>Now open</b>Rolling applications</span><span><b>48 hours</b>Typical review time</span></div>
      </div>
    </section>
  </>
}
