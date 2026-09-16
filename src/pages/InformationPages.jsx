import { Link } from 'react-router-dom'
import { PrototypeNotice } from '../components/PrototypeUI'

function InformationPage({ eyebrow, title, intro, sections, notice = true }) {
  return <section className="info-page page-shell">
    <header><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p>{notice && <PrototypeNotice compact>This statement describes the portfolio prototype in its current form. It is not a substitute for policies required by a live commercial service.</PrototypeNotice>}</header>
    <div className="info-sections">{sections.map((section) => <article key={section.title}><h2>{section.title}</h2>{section.copy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>)}</div>
    <div className="info-contact"><p>Have a question about this concept?</p><Link className="text-link" to="/contact">View contact options →</Link></div>
  </section>
}

export function Privacy() {
  return <InformationPage notice={false} eyebrow="Privacy notice" title="Privacy, in plain language." intro="FashionXpress uses limited personal information for its contact, creator-application, and consent-based newsletter workflows. The remaining commerce and community experiences are still portfolio prototypes." sections={[
    { title: 'What we collect', copy: ['Contact submissions include your name, email address, enquiry type, message, consent time, submission time, status, source, and a non-sensitive reference.', 'Creator applications include your name, email address, location, portfolio URL, design practice, vision, consent time, submission time, review status, source, and reference. No portfolio files are uploaded.', 'Newsletter records include a normalized email address, consent and status timestamps, source, provider-sync status, and one-way hashes of single-use confirmation and unsubscribe tokens. Raw tokens are not stored.'] },
    { title: 'Why and who processes it', copy: ['We use contact data to respond to enquiries, creator data to review introductions, and newsletter data to record consent and deliver requested updates.', 'Supabase stores submission and consent records. Vercel runs the protected server endpoints. Resend sends transactional messages, administrative notifications, and manages confirmed newsletter contacts.'] },
    { title: 'Retention and deletion', copy: ['Contact messages and creator applications are intended to be reviewed and deleted within 12 months unless an active conversation requires longer retention. Unconfirmed newsletter requests should be removed after 30 days. Confirmed consent records are retained while subscribed; a minimal suppression record may be retained after unsubscribe to honor the request.', 'To request access or deletion, use the direct email address on the Contact page. Identity may need to be verified before a request is completed.'] },
    { title: 'Newsletter control', copy: ['Newsletter signup uses double opt-in. A subscription remains pending until its 24-hour confirmation link is used. Each confirmed subscriber receives an unsubscribe link; unsubscribing changes the local consent record first and then updates Resend.'] },
    { title: 'What stays on your device', copy: ['Cart selections are stored locally in your browser. Camera frames remain on your device unless you choose to download one. The site does not currently operate user accounts or analytics.'] },
    { title: 'Features still unavailable', copy: ['Checkout, payments, Community accounts and persistence, blockchain minting, wallet connectivity, and garment tracking remain unavailable. Those prototype interfaces do not collect transaction or account data.'] },
  ]}/>
}

export function Terms() {
  return <InformationPage eyebrow="Prototype terms" title="Terms for exploring the concept." intro="This site demonstrates a possible digital-fashion experience. It does not offer a live marketplace or create a commercial relationship." sections={[
    { title: 'Demonstration only', copy: ['Prices, editions, creators, community posts, dates, and product descriptions are illustrative portfolio content. They are not offers to sell.'] },
    { title: 'No transactions', copy: ['Checkout and minting experiences are non-transactional. No payment, token, ownership record, or delivery is created.'] },
    { title: 'Respectful use', copy: ['Please treat the visual work and interface as portfolio material. A production service would publish complete ownership, acceptable-use, dispute, and jurisdiction terms before launch.'] },
  ]}/>
}

export function Licensing() {
  return <InformationPage eyebrow="Concept guide" title="Digital fashion licensing." intro="The current garments are demonstration pieces. No license or ownership right is transferred through this prototype." sections={[
    { title: 'What a production license would define', copy: ['A real listing would clearly distinguish personal display, avatar wear, social publishing, commercial use, modification, resale, and creator attribution rights.'] },
    { title: 'Creator rights', copy: ['Creators would retain all rights not explicitly granted. Royalties and edition rules shown elsewhere are interface concepts, not active contractual terms.'] },
    { title: 'Collector clarity', copy: ['Before any purchase, a production experience would show the exact files delivered, supported platforms, usage limits, and whether rights can be transferred.'] },
  ]}/>
}

export function RefundPolicy() {
  return <InformationPage eyebrow="Purchase status" title="Purchases are unavailable." intro="There is currently nothing to refund because FashionXpress does not accept payments, connect wallets, or deliver digital products." sections={[
    { title: 'Prototype checkout', copy: ['Cart and mint screens demonstrate interface states only. Buttons that could imply a transaction are labelled as prototypes or disabled.'] },
    { title: 'Before a commercial launch', copy: ['A live service would publish eligibility, cancellation, failed-delivery, duplicate-purchase, charge, and support procedures before enabling checkout.'] },
  ]}/>
}

export function AccessibilityStatement() {
  return <InformationPage eyebrow="Accessibility" title="Designed for more ways of navigating." intro="FashionXpress aims to make this portfolio prototype understandable and operable across keyboard, pointer, and assistive-technology use." sections={[
    { title: 'Current support', copy: ['The interface includes semantic headings, a skip link, visible keyboard focus, labelled controls, reduced-motion support, responsive layouts, and announced status feedback.'] },
    { title: 'Known limits', copy: ['Testing has focused on modern Chromium-based browsers. A production release would add formal screen-reader, Safari, Firefox, zoom, high-contrast, and real-device validation.'] },
    { title: 'Feedback', copy: ['The contact page provides both a secure submission workflow, when configured, and direct email options for accessibility feedback.'] },
  ]}/>
}
