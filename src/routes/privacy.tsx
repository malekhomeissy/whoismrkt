import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — MRKT" },
      { name: "description", content: "MRKT Privacy Policy. How we collect, use, and protect your data." },
    ],
  }),
  component: Privacy,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const h3    = { color: "oklch(1 0 0 / 72%)", fontSize: "13px", fontWeight: 600, marginTop: "1.25rem", marginBottom: "0.35rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function Privacy() {
  const updated = "June 29, 2026";

  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          Privacy Policy
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: {updated}
        </p>

        <p style={p}>
          MRKT ("we", "us", "our") is committed to protecting your personal data. This Privacy Policy explains what data we collect, how we use it, who we share it with, and what rights you have. It applies to all users of usemrkt.app and the MRKT mobile application worldwide.
        </p>
        <p style={p}>
          <strong style={{ color: "oklch(1 0 0 / 72%)" }}>Data controller:</strong> MRKT. Our registered legal entity and jurisdiction of incorporation are finalized as part of our company registration process; the confirmed entity name and address will be published here once registration is complete. In the meantime, contact <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a> for the current controller details or any privacy request.
        </p>

        <h2 style={h2}>1. Data We Collect</h2>

        <h3 style={h3}>1.1 Account Data</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Email address and authentication credentials</li>
          <li style={li}>Name and display name</li>
          <li style={li}>Account type (Creator or Business) and onboarding responses</li>
          <li style={li}>Profile image (uploaded directly or synced from Instagram)</li>
          <li style={li}>Country and city — provided voluntarily</li>
        </ul>

        <h3 style={h3}>1.2 Creator Profile Data</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Social media handles (Instagram, TikTok, YouTube)</li>
          <li style={li}>Follower counts synced from connected social accounts</li>
          <li style={li}>Content categories, bio, and media kit content</li>
          <li style={li}>Instagram account ID, access token (stored server-side and never exposed to other users), and profile picture</li>
          <li style={li}>Creator verification status and tier</li>
        </ul>

        <h3 style={h3}>1.3 Business Profile Data</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Company name, industry, and website</li>
          <li style={li}>Brand knowledge (description, voice, products, target audience) — provided voluntarily</li>
          <li style={li}>Campaign briefs and creator applications</li>
        </ul>

        <h3 style={h3}>1.4 Platform Activity</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Messages sent through the Platform</li>
          <li style={li}>Contracts and deliverable submissions</li>
          <li style={li}>Content calendar entries</li>
          <li style={li}>AI conversation history (messages sent to MRKT AI Strategist)</li>
          <li style={li}>Saved creators, projects, and saved AI outputs</li>
          <li style={li}>Notification preferences</li>
        </ul>

        <h3 style={h3}>1.5 Technical Data</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>IP address (logged on contract signing for legal audit purposes)</li>
          <li style={li}>Browser user agent (logged on contract signing)</li>
          <li style={li}>Mobile device push notification token (if you enable push notifications in the mobile app)</li>
          <li style={li}>Session tokens (stored in secure browser cookies or device secure storage)</li>
          <li style={li}>Anonymous analytics events (e.g., page views, feature usage)</li>
        </ul>

        <h2 style={h2}>2. How We Use Your Data</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>To operate the Platform and provide its features</li>
          <li style={li}>To match creators with relevant campaigns using our algorithm</li>
          <li style={li}>To personalise AI Strategist responses based on your profile and activity</li>
          <li style={li}>To send notifications (in-app, email, or WhatsApp if you have enabled them)</li>
          <li style={li}>To improve matching accuracy, platform performance, and AI models</li>
          <li style={li}>To investigate abuse reports and enforce our Terms of Service</li>
          <li style={li}>To comply with legal obligations</li>
        </ul>
        <p style={p}>
          We do not sell your personal data to third parties. We do not use your data to train third-party AI models.
        </p>

        <h3 style={h3}>2.1 Legal Basis for Processing (GDPR Article 6)</h3>
        <p style={p}>If you are located in the European Economic Area, the United Kingdom, or another jurisdiction with an equivalent requirement, we rely on the following legal bases for each purpose above:</p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Performance of a contract</strong> — operating the Platform, matching, messaging, contracting, and payment processing (the services you signed up for)</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Consent</strong> — AI Strategist processing of your conversations, non-essential analytics cookies, and marketing communications (each withdrawable at any time, see §3 and §10)</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Legitimate interests</strong> — improving matching accuracy and platform performance, sending service notifications, and investigating abuse reports — balanced against your right to object (see §9)</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Legal obligation</strong> — retaining contract/payment records and responding to lawful requests from authorities</li>
        </ul>

        <h2 style={h2}>3. AI Processing Disclosure</h2>
        <p style={p}>
          <strong style={{ color: "oklch(1 0 0 / 72%)" }}>Your data is processed by AI providers.</strong> MRKT uses third-party AI providers — currently Anthropic and OpenAI for text-based features (AI Strategist, content planning, growth advice, campaign matching) and Higgsfield for AI image/video generation in MRKT Studio — to power these features. When you use them, your messages and relevant profile context (such as your niche, follower counts, and recent activity), or your generation prompts for Studio, are sent to these providers to generate responses.
        </p>
        <p style={p}>
          Data sent to AI providers is subject to their respective privacy policies. We contractually prohibit providers from using your data to train their foundational models. AI outputs may be generated based on patterns in your personal data.
        </p>
        <p style={p}>
          AI-generated content is labelled within the Platform. You are not subject to legally significant automated decision-making solely on the basis of AI — a human review is always available for consequential decisions. You may <strong style={{ color: "oklch(1 0 0 / 72%)" }}>opt out of AI-assisted matching</strong> by contacting <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>.
        </p>

        <h2 style={h2}>4. Instagram / Meta Data</h2>
        <p style={p}>
          When you connect your Instagram account, we receive and store: your Instagram user ID, username, follower count, profile picture URL, and media count. This data is used to verify your creator profile and improve campaign matching. We do not post to Instagram on your behalf. You may disconnect Instagram at any time from Profile → Settings, which removes your Instagram access tokens from our systems within 24 hours.
        </p>

        <h2 style={h2}>5. Cookies and Tracking</h2>
        <p style={p}>
          We use strictly necessary cookies for authentication (session management). We may also use analytics cookies to understand how the Platform is used. See our <a href="/cookies" style={a}>Cookie Policy</a> for full details. You can manage your cookie preferences via the cookie consent banner or by emailing <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>.
        </p>

        <h2 style={h2}>6. Data Storage and Security</h2>
        <p style={p}>
          Your data is stored with Supabase (PostgreSQL hosted in the United States). We implement row-level security policies ensuring users can only access their own data. OAuth tokens are stored server-side and inaccessible to other users. We use TLS/HTTPS for all data in transit.
        </p>
        <p style={p}>
          While we implement industry-standard security measures, no platform can guarantee absolute security. In the event of a data breach that poses a risk to your rights, we will notify you and relevant authorities within 72 hours of becoming aware.
        </p>

        <h2 style={h2}>7. International Data Transfers</h2>
        <p style={p}>
          Your data is stored and processed on infrastructure in the United States (Supabase/AWS) and processed by third-party providers operating globally, including Anthropic (US), OpenAI (US), Higgsfield (AI image/video generation), and Meta (WhatsApp Business API, if you enable WhatsApp notifications, and Instagram integration). By using MRKT, you acknowledge this international transfer.
        </p>
        <p style={p}>
          We ensure appropriate safeguards are in place for such transfers, including standard contractual clauses with our data processors where applicable. If you are located in the European Economic Area, the United Kingdom, or another jurisdiction with data transfer restrictions, these safeguards form the legal basis for the transfer.
        </p>

        <h2 style={h2}>8. Data Retention</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Account data:</strong> Retained for the duration of your account. Deleted within 30 days of an account deletion request.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>AI request logs:</strong> Retained for 90 days, then automatically deleted.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Analytics events:</strong> Retained for up to 2 years in anonymised form.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Contract and payment records:</strong> Retained for 7 years in compliance with legal obligations, even after account deletion.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Abuse reports:</strong> Retained for 3 years for safety and legal purposes.</li>
        </ul>

        <h2 style={h2}>9. Your Rights</h2>
        <p style={p}>Depending on your location, you have the following rights over your personal data:</p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Access:</strong> Request a copy of all personal data we hold about you (data export)</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Correction:</strong> Update inaccurate or incomplete data via your profile settings</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Deletion:</strong> Request deletion of your account and personal data</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Portability:</strong> Receive a structured, machine-readable copy of your data</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Objection:</strong> Object to processing for certain purposes, including AI-assisted matching</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Restriction:</strong> Request restriction of processing in certain circumstances</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Withdraw consent:</strong> Withdraw consent for marketing emails and push notifications at any time via Settings</li>
        </ul>
        <p style={p}>
          You can exercise your <strong style={{ color: "oklch(1 0 0 / 72%)" }}>right to access and right to deletion</strong> directly within the Platform via Account Settings → Privacy. For any other rights request, email <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>. We will respond within 30 days.
        </p>

        <h2 style={h2}>10. Marketing Communications</h2>
        <p style={p}>
          We may send you email notifications about platform activity (applications, messages, contract updates) and, if you have opted in, platform updates and product announcements. You can manage all email preferences in Account Settings → Notifications. You can unsubscribe at any time via the unsubscribe link in any email we send. Withdrawing consent does not affect the lawfulness of processing before withdrawal.
        </p>

        <h2 style={h2}>11. Children's Privacy</h2>
        <p style={p}>
          MRKT is not intended for persons under 18. We do not knowingly collect personal data from children. If we become aware that a user is under 18, we will delete their account and associated data promptly. If you believe a minor has created an account, please contact <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>.
        </p>

        <h2 style={h2}>12. Changes to This Policy</h2>
        <p style={p}>
          We may update this Policy. Material changes will be notified via email or in-app notification at least 14 days before taking effect. The date at the top of this page reflects the most recent update. Continued use after the effective date constitutes acceptance.
        </p>

        <h2 style={h2}>13. Contact</h2>
        <p style={p}>
          For all privacy-related questions, rights requests, or complaints:<br />
          <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
