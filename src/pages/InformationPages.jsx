import { Link } from 'react-router-dom'
import { PrototypeNotice } from '../components/PrototypeUI'
import { IS_DEMO_MODE } from '../data/appMode'

function InformationPage({ eyebrow, title, intro, sections, notice = true }) {
  return <section className="info-page page-shell">
    <header><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{intro}</p>{notice && <PrototypeNotice compact>This statement describes the portfolio prototype in its current form. It is not a substitute for policies required by a live commercial service.</PrototypeNotice>}</header>
    <div className="info-sections">{sections.map((section) => <article key={section.title}><h2>{section.title}</h2>{section.copy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</article>)}</div>
    <div className="info-contact"><p>Have a question about this concept?</p><Link className="text-link" to="/contact">View contact options →</Link></div>
  </section>
}

export function Privacy() {
  return <InformationPage notice={false} eyebrow="Privacy notice" title="Privacy, in plain language." intro={IS_DEMO_MODE ? 'This portfolio is in Demo Mode. Contact, creator, newsletter, and Community journeys can be explored without real accounts or online publication.' : 'This deployment is in Live Mode. FashionXpress uses Supabase Auth for Community accounts and protected server workflows for contact, creator applications, and newsletters.'} sections={IS_DEMO_MODE ? [
    { title: 'Demo form handling', copy: ['Contact, creator-application, and newsletter entries stay in temporary page memory while you use the form. Completing the demo sends no API request, creates no database record, and sends no email. After you acknowledge the result, your entries are cleared. They are not written to localStorage, sessionStorage, cookies, logs, or analytics.', 'Newsletter confirmation and unsubscribe links are inactive in Demo Mode because no subscription is created.'] },
    { title: 'Other local experiences', copy: ['Cart identifiers and quantities persist in this browser. Digital Wardrobe checkout records use session-only storage and contain product IDs, illustrative licence choices, dates, and demo order referencesâ€”not personal information or payment credentials. Separate Demo Wallet, mint-progress, and legacy collectible records are also session-only and contain no real wallet details.', 'Virtual Try-On camera streams, selected photos, manual overlays, and captured compositions stay in temporary device memory. Nothing is uploaded, persisted, analysed, body-tracked, or measured; downloaded images exist only when you explicitly save them. Mint metadata is never uploaded or published.'] },
    { title: 'Switching to Live Mode', copy: ['A separately configured Live Mode uses protected Vercel API endpoints, Supabase storage, and Resend email for the real forms. This deployment does not silently switch modes. See the Phase 3 setup guide for Live Mode details.'] },
  ] : [
    { title: 'Community accounts and public content', copy: ['Supabase Auth stores the email used for passwordless sign-in and manages the session. The browser uses Supabase’s supported session storage; FashionXpress does not copy auth tokens into custom storage keys. Email addresses are not placed in public profiles.', 'Your handle, display name, bio, optional location, identity label, preset avatar, published discussions and replies, timestamps, and visible like counts may be read by anyone. Do not include private information in public posts. Identity labels do not grant moderator or administrator access.'] },
    { title: 'What we collect', copy: ['Contact submissions include your name, email address, enquiry type, message, consent time, submission time, status, source, and a non-sensitive reference.', 'Creator applications include your name, email address, location, portfolio URL, design practice, vision, consent time, submission time, review status, source, and reference. No portfolio files are uploaded.', 'Newsletter records include a normalized email address, consent and status timestamps, source, provider-sync status, and one-way hashes of single-use confirmation and unsubscribe tokens. Raw tokens are not stored.'] },
    { title: 'Why and who processes it', copy: ['We use contact data to respond to enquiries, creator data to review introductions, and newsletter data to record consent and deliver requested updates.', 'Supabase stores submission and consent records. Vercel runs the protected server endpoints. Resend sends transactional messages, administrative notifications, and manages confirmed newsletter contacts.'] },
    { title: 'Retention and deletion', copy: ['Contact messages and creator applications are intended to be reviewed and deleted within 12 months unless an active conversation requires longer retention. Unconfirmed newsletter requests should be removed after 30 days. Confirmed consent records are retained while subscribed; a minimal suppression record may be retained after unsubscribe to honor the request.', 'To request access or deletion, use the direct email address on the Contact page. Identity may need to be verified before a request is completed.'] },
    { title: 'Newsletter control', copy: ['Newsletter signup uses double opt-in. A subscription remains pending until its 24-hour confirmation link is used. Each confirmed subscriber receives an unsubscribe link; unsubscribing changes the local consent record first and then updates Resend.'] },
    { title: 'Reports, retention, and deletion', copy: ['Authenticated members may submit a constrained report reason and short explanation. Reports are not public and require manual administrative review in Supabase; no review or response time is guaranteed.', 'Account deletion requires signed-in confirmation and removes the Auth user and associated Community profile, discussions, replies, likes, reports, and rate-limit records through database cascades. Other contact, application, or newsletter records are separate workflows and may require a separate deletion request.'] },
    { title: 'What stays on your device', copy: ['Cart product choices and quantities are stored locally. Digital Wardrobe checkout records remain in session storage and carry no personal or payment details; they do not represent an order or legal licence. Fictional Demo Wallet, mint simulation, and legacy collectible records use separate session-only storage and have no monetary or blockchain value. Virtual Try-On camera streams, photos, overlays, and captures stay in temporary device memory and are not uploaded, measured, or persisted; a file exists only if you download it. The site does not currently operate analytics.'] },
    { title: 'Features still unavailable', copy: ['Checkout is a guided interface demo only. Payments, orders, blockchain minting, wallet connectivity, and garment tracking remain unavailable. Those prototype interfaces do not collect transaction data.'] },
  ]}/>
}

export function Terms() {
  return <InformationPage eyebrow="Prototype terms" title="Terms for exploring the concept." intro="This site demonstrates a possible digital-fashion experience. It does not offer a live marketplace or create a commercial relationship." sections={[
    { title: 'Demonstration and Community', copy: ['Prices, editions, product descriptions, and Demo Mode conversations are illustrative portfolio content. Live Mode Community posts are supplied by members and should not be treated as commercial offers.', 'Members must follow the Community guidelines. Published content can be removed by its author or hidden through administrative review.'] },
    { title: 'No transactions', copy: ['Checkout creates only a session-local Digital Wardrobe record. No payment, real order, delivered product, legal licence, NFT, token, or blockchain asset is created through checkout. Licence descriptions are illustrative and copyright remains with the creator.', 'Mint Studio and its fictional Demo Wallet are a separate optional collectible simulation. No gas charge, signature, smart-contract execution, blockchain transaction, upload, publication, scarcity, or monetary value results from a legacy collectible record.'] },
    { title: 'Respectful use', copy: ['Please treat the visual work and interface as portfolio material. A production service would publish complete ownership, acceptable-use, dispute, and jurisdiction terms before launch.'] },
  ]}/>
}

export function Licensing() {
  return <InformationPage eyebrow="Concept guide" title="Digital fashion licensing." intro="The current garments are demonstration pieces. No licence or ownership right is transferred through this prototype." sections={[
    { title: 'What a production licence would define', copy: ['A real listing would clearly distinguish personal display, avatar wear, social publishing, commercial use, modification, resale, and creator attribution rights.'] },
    { title: 'Creator rights', copy: ['Copyright remains with the creator. Creators would retain every right not explicitly granted in a final agreement. Royalties and edition rules shown in the optional collectible experience are interface concepts, not active contractual terms.'] },
    { title: 'Collector clarity', copy: ['Before any purchase, a production experience would show the exact files delivered, supported platforms, usage limits, and whether rights can be transferred.'] },
    { title: 'Checkout concept terms', copy: ['Personal-use, Creator/content, and Commercial/extended licences in checkout are illustrative structures that change only the displayed Naira demo total. Selecting one creates a session-local Digital Wardrobe record; it does not activate an agreement or transfer copyright, ownership, resale rights, or any legal licence.'] },
    { title: 'Optional collectible terms', copy: ['Mint Studio licence choices and metadata are a separate local presentation concept. Nothing is uploaded or made immutable, no asset is created on-chain, and no ownership, scarcity, resale, or licence right arises from a legacy collectible record.'] },
  ]}/>
}

export function RefundPolicy() {
  return <InformationPage eyebrow="Purchase status" title="Purchases are unavailable." intro="There is currently nothing to refund because FashionXpress does not accept payments, connect wallets, or deliver digital products." sections={[
    { title: 'Prototype checkout', copy: ['Cart and checkout demonstrate an Naira-priced licence-selection journey. Completion creates a session-local Digital Wardrobe record only. No payment, real order, delivered file, NFT, token, blockchain asset, ownership, or legal licence transfer occurs.'] },
    { title: 'Separate collectible concept', copy: ['The fictional Demo Wallet, Mint Studio, and legacy collectibles are optional interface simulations. They make no gas charge, signature, smart-contract execution, upload, or blockchain transaction. Live payment and blockchain functionality are not enabled.'] },
    { title: 'Before a commercial launch', copy: ['A live service would publish eligibility, cancellation, failed-delivery, duplicate-purchase, charge, and support procedures before enabling checkout.'] },
  ]}/>
}

export function AccessibilityStatement() {
  return <InformationPage eyebrow="Accessibility" title="Designed for more ways of navigating." intro="FashionXpress aims to make this portfolio prototype understandable and operable across keyboard, pointer, and assistive-technology use." sections={[
    { title: 'Current support', copy: ['The interface includes semantic headings, a skip link, visible keyboard focus, labelled controls, reduced-motion support, responsive layouts, and announced status feedback. Digital Wardrobe navigation, item actions, and confirmed reset controls are keyboard operable. Virtual Try-On provides labelled sliders, buttons, pointer dragging, and arrow-key garment positioning as alternatives to touch gestures. Community forms report validation and submission states; one-time-code verification is keyboard operable.'] },
    { title: 'Known limits', copy: ['Testing has focused on modern Chromium-based browsers. A production release would add formal screen-reader, Safari, Firefox, zoom, high-contrast, and real-device validation.'] },
    { title: 'Feedback', copy: ['The contact page provides both a secure submission workflow, when configured, and direct email options for accessibility feedback.'] },
  ]}/>
}

export function CommunityGuidelines() {
  return <InformationPage notice={false} eyebrow="Community guidelines" title="Make room for ideas." intro="FashionXpress Community is for constructive digital-fashion conversation. Demo Mode stays local; Live Mode publishes approved-format plain-text posts immediately, without a staffed moderation promise." sections={[
    { title: 'Be respectful', copy: ['Discuss work and ideas without harassment, hate, threats, impersonation, or targeted abuse. Critique the work, not a person’s identity.'] },
    { title: 'Keep people safe', copy: ['Do not post private contact details, credentials, sexual exploitation material, illegal content, malware, spam, unsafe links, or material you do not have permission to share. Posts and replies are plain text; links, executable markup, and embeds are not supported.'] },
    { title: 'Reports and limits', copy: ['Signed-in members can report a discussion or reply with a reason and optional short explanation. Reports are private and require manual review through Supabase until future moderation tooling exists. Reporting does not guarantee removal or a response time.', 'Authors can edit or delete their own content. Administrators may hide or remove content through privileged database operations; there is no public moderator role or dashboard.'] },
  ]}/>
}
