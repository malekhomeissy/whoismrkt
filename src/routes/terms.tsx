import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — MRKT" },
      { name: "description", content: "MRKT Terms of Service. Read before using the platform." },
    ],
  }),
  component: Terms,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const h3    = { color: "oklch(1 0 0 / 72%)", fontSize: "13px", fontWeight: 600, marginTop: "1.25rem", marginBottom: "0.35rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function Terms() {
  const updated = "June 29, 2026";

  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          Terms of Service
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: {updated}
        </p>

        <p style={p}>
          These Terms of Service ("Terms") govern your access to and use of MRKT ("Platform"), a creator-brand marketplace and marketing intelligence platform. By creating an account or using the Platform, you agree to be bound by these Terms. If you do not agree, you must not use the Platform.
        </p>

        <h2 style={h2}>1. Who We Are</h2>
        {/* TODO(legal): confirm this matches the entity/jurisdiction actually being
            registered this week — update here and in the governing-law clause
            below (and privacy.tsx §"Data controller" + international-transfer
            paragraph) if the registered entity differs from Lebanon. */}
        <p style={p}>
          MRKT is operated by MRKT ("Company", "we", "us", "our"), a company incorporated in Lebanon and serving users globally. Legal and privacy correspondence should be directed to <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a>.
        </p>

        <h2 style={h2}>2. Eligibility</h2>
        <p style={p}>
          You must be at least 18 years old to use MRKT. By registering, you confirm that you meet this requirement, that all information you provide is accurate, and that you have the legal capacity to enter into a binding agreement. MRKT does not knowingly collect data from persons under 18.
        </p>

        <h2 style={h2}>3. Account Types and Responsibilities</h2>
        <p style={p}>
          MRKT provides two account types:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Creator accounts</strong> — for individuals producing content for brand collaborations</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Business accounts</strong> — for brands, agencies, and marketing teams running creator campaigns</li>
        </ul>
        <p style={p}>
          You are responsible for maintaining the confidentiality of your credentials and for all activity under your account. You must notify us immediately at <a href="mailto:security@usemrkt.app" style={a}>security@usemrkt.app</a> if you suspect unauthorised access.
        </p>

        <h2 style={h2}>4. MRKT Is a Platform — Not a Party, Employer, or Agency</h2>
        <p style={p}>
          MRKT is a technology platform that facilitates connections between Creators and Businesses. MRKT is not a party to any agreement, contract, or collaboration between Creators and Businesses. MRKT is not an employment agency, talent agency, advertising agency, or employer. Neither Creators nor Businesses are employees, contractors, or agents of MRKT.
        </p>
        <p style={p}>
          Creators and Businesses are solely responsible for: negotiating and fulfilling their collaboration terms; the quality, accuracy, and legality of content created; compliance with applicable advertising disclosure laws (e.g., FTC guidelines, ASA rules, local influencer marketing regulations); and any tax obligations arising from payments received.
        </p>

        <h2 style={h2}>5. Campaigns and Collaborations</h2>
        <p style={p}>
          Businesses post campaign briefs. Creators apply. MRKT facilitates matching, messaging, contracting, and (when payment features are enabled) payment processing. MRKT does not review, endorse, or guarantee the accuracy of campaign briefs or creator profiles.
        </p>
        <p style={p}>
          Businesses are responsible for ensuring that campaign briefs comply with all applicable advertising, competition, and consumer protection laws. Creators are responsible for disclosing paid partnerships in accordance with applicable regulations in their jurisdiction.
        </p>

        <h2 style={h2}>6. Contracts</h2>
        <p style={p}>
          Contract templates provided within MRKT are for convenience only. They do not constitute legal advice. MRKT recommends that both parties have contracts reviewed by qualified legal counsel. MRKT is not liable for the enforceability or outcome of any contract entered into between users.
        </p>
        <p style={p}>
          When you accept a contract on the Platform, your acceptance is recorded with a timestamp, user ID, and IP address as evidence of your agreement.
        </p>

        <h2 style={h2}>7. Payments</h2>
        <p style={p}>
          Payment features are currently disabled pending business registration and payment rail setup. When payment features are enabled, the following will apply:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Payments will be processed by Stripe. MRKT is not a bank or payment processor.</li>
          <li style={li}>MRKT will collect a platform fee as described in the applicable fee schedule published at the time payments are enabled.</li>
          <li style={li}>Creators will receive payouts after campaign deliverables are approved, subject to Stripe's payout timelines.</li>
          <li style={li}>MRKT is not responsible for payment failures, chargebacks, or disputes between users.</li>
        </ul>
        <p style={p}>
          Any current fee percentages shown on the Platform are illustrative placeholders only and are not binding until payment features are formally launched.
        </p>

        <h2 style={h2}>8. AI-Powered Features</h2>
        <p style={p}>
          MRKT uses artificial intelligence to provide: campaign matching and recommendations; AI Strategist conversations; content planning suggestions; growth advice; and outreach drafts. AI-generated content is clearly labelled within the Platform.
        </p>
        <p style={p}>
          <strong style={{ color: "oklch(1 0 0 / 72%)" }}>AI Disclosure:</strong> All AI outputs are generated by third-party AI providers (including Anthropic and OpenAI) and presented under the MRKT AI brand. AI outputs are for guidance and inspiration only. MRKT does not guarantee accuracy, completeness, or fitness for purpose. You must review all AI outputs before relying on or publishing them. You are solely responsible for content you publish based on AI suggestions.
        </p>
        <p style={p}>
          You may opt out of AI-assisted matching by contacting <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>.
        </p>

        <h2 style={h2}>9. User Content</h2>
        <h3 style={h3}>9.1 Your Ownership</h3>
        <p style={p}>
          You retain full ownership of all content you create and submit to MRKT ("User Content"). By submitting User Content, you grant MRKT a limited, non-exclusive, royalty-free, worldwide licence to store, display, and process your User Content solely for the purpose of operating the Platform.
        </p>
        <h3 style={h3}>9.2 Prohibited Content</h3>
        <p style={p}>
          You may not submit User Content that: is unlawful, fraudulent, defamatory, obscene, or abusive; infringes any third party's intellectual property rights; contains malware, spam, or deceptive material; impersonates any person or entity; relates to the sexual exploitation of minors; or violates our <a href="/acceptable-use" style={a}>Acceptable Use Policy</a>.
        </p>
        <p style={p}>
          MRKT may remove content that violates these Terms without notice and may suspend or terminate accounts responsible for violations.
        </p>
        <h3 style={h3}>9.3 Copyright and DMCA</h3>
        <p style={p}>
          If you believe User Content on MRKT infringes your copyright, please follow the process described in our <a href="/dmca" style={a}>Copyright and DMCA Policy</a>.
        </p>

        <h2 style={h2}>10. Prohibited Conduct</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Creating fake profiles, inflating follower counts, or misrepresenting your identity or reach</li>
          <li style={li}>Using the Platform to conduct fraud, scams, or deceptive practices</li>
          <li style={li}>Harassing, threatening, or abusing other users</li>
          <li style={li}>Attempting to reverse-engineer, scrape, or exploit the Platform</li>
          <li style={li}>Using automated tools to access the Platform without our written consent</li>
          <li style={li}>Attempting to bypass authentication or security controls</li>
          <li style={li}>Listing or promoting products or services that are illegal in the applicable jurisdiction</li>
        </ul>

        <h2 style={h2}>11. Instagram / Meta Integration</h2>
        <p style={p}>
          When you connect your Instagram account, MRKT accesses only the data you explicitly authorise (username, follower count, profile image, post count) via Meta's official OAuth process. MRKT does not post on your behalf without your explicit action. You may revoke access at any time from Profile → Settings. Upon revocation, your Instagram tokens are removed from our systems.
        </p>

        <h2 style={h2}>12. Limitation of Liability</h2>
        <p style={p}>
          To the maximum extent permitted by applicable law:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>MRKT's total aggregate liability for any claim arising from these Terms or use of the Platform shall not exceed the greater of (a) USD 100 or (b) fees paid by you to MRKT in the 12 months preceding the claim.</li>
          <li style={li}>MRKT is not liable for indirect, incidental, special, punitive, or consequential damages of any kind.</li>
          <li style={li}>MRKT does not guarantee that the Platform will be uninterrupted, error-free, or secure.</li>
          <li style={li}>MRKT does not guarantee that campaigns will result in specific outcomes, revenue, follower growth, or brand deals.</li>
          <li style={li}>MRKT is not liable for the actions, content, or representations of any user.</li>
        </ul>

        <h2 style={h2}>13. Indemnification</h2>
        <p style={p}>
          You agree to indemnify and hold MRKT, its directors, employees, and agents harmless from any claims, losses, liabilities, and expenses (including reasonable legal fees) arising from: your use of the Platform; your User Content; your breach of these Terms; or your violation of any third party's rights.
        </p>

        <h2 style={h2}>14. Termination</h2>
        <p style={p}>
          You may delete your account at any time through Account Settings or by emailing <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a>. Upon deletion, your personal data will be processed in accordance with our <a href="/privacy" style={a}>Privacy Policy</a>.
        </p>
        <p style={p}>
          MRKT may suspend or terminate your account at any time for violation of these Terms, suspected fraud, or for any reason at our sole discretion. We will provide reasonable notice where possible.
        </p>

        <h2 style={h2}>15. Dispute Resolution</h2>
        <p style={p}>
          If you have a dispute with another user, we encourage you to resolve it directly. MRKT may, at its discretion, facilitate dispute resolution but is not obligated to do so and makes no guarantees as to outcomes. MRKT is not an arbitrator or mediator of user disputes.
        </p>

        <h2 style={h2}>16. Governing Law</h2>
        {/* TODO(legal): verify against actual registration jurisdiction — see §1 note. */}
        <p style={p}>
          These Terms are governed by the laws of the Republic of Lebanon, without regard to its conflict of law provisions. Nothing in these Terms limits mandatory consumer protection rights you may have under the laws of your country of residence.
        </p>

        <h2 style={h2}>17. Changes to These Terms</h2>
        <p style={p}>
          We may update these Terms from time to time. Material changes will be communicated by email or in-app notification at least 14 days before taking effect. Your continued use of the Platform after the effective date of any changes constitutes acceptance of the updated Terms.
        </p>

        <h2 style={h2}>18. Contact</h2>
        <p style={p}>
          For legal matters or Terms-related questions: <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a><br />
          For abuse or content reports: <a href="mailto:abuse@usemrkt.app" style={a}>abuse@usemrkt.app</a><br />
          For privacy and data requests: <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>
        </p>

        {/* Related policies */}
        <div style={{ marginTop: "3rem", paddingTop: "2rem", borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
          <p style={{ ...p, color: "oklch(1 0 0 / 36%)" }}>Related policies:</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {[
              { label: "Privacy Policy", href: "/privacy" },
              { label: "Cookie Policy", href: "/cookies" },
              { label: "Acceptable Use", href: "/acceptable-use" },
              { label: "DMCA & Copyright", href: "/dmca" },
              { label: "AI Disclosure", href: "/ai-disclosure" },
            ].map(({ label, href }) => (
              <a
                key={href}
                href={href}
                style={{
                  ...p,
                  marginBottom: 0,
                  color: "oklch(0.82 0.005 0)",
                  textDecoration: "none",
                  padding: "4px 12px",
                  borderRadius: "100px",
                  border: "1px solid oklch(1 0 0 / 12%)",
                  fontSize: "12px",
                }}
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
