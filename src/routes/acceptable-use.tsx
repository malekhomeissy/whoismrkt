import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/acceptable-use")({
  head: () => ({
    meta: [
      { title: "Acceptable Use Policy — MRKT" },
      { name: "description", content: "MRKT Acceptable Use Policy. What is and is not permitted on the platform." },
    ],
  }),
  component: AcceptableUse,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const h3    = { color: "oklch(1 0 0 / 72%)", fontSize: "13px", fontWeight: 600, marginTop: "1.25rem", marginBottom: "0.35rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function AcceptableUse() {
  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          Acceptable Use Policy
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: June 29, 2026
        </p>

        <p style={p}>
          This Acceptable Use Policy ("AUP") applies to all users of MRKT and supplements the <a href="/terms" style={a}>Terms of Service</a>. It defines what is and is not permitted on the Platform. Violations may result in content removal, account suspension, or permanent termination.
        </p>

        <h2 style={h2}>Prohibited Content</h2>
        <p style={p}>You may not create, post, share, or facilitate any content that:</p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Is sexually explicit, obscene, or involves the sexual exploitation of minors in any form</li>
          <li style={li}>Promotes, glorifies, or incites violence, terrorism, or self-harm</li>
          <li style={li}>Is defamatory, harassing, threatening, or abusive toward any individual or group</li>
          <li style={li}>Constitutes hate speech targeting individuals or groups based on race, religion, gender, sexual orientation, disability, nationality, or ethnicity</li>
          <li style={li}>Infringes intellectual property rights (copyright, trademark, trade secrets)</li>
          <li style={li}>Is false, misleading, or deceptive — including fake follower counts, fabricated engagement metrics, or false claims about products or services</li>
          <li style={li}>Promotes illegal products or services in the applicable jurisdiction</li>
          <li style={li}>Contains malware, viruses, or other malicious code</li>
        </ul>

        <h2 style={h2}>Prohibited Conduct</h2>
        <h3 style={h3}>Identity and Authenticity</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Creating fake creator profiles, fake business accounts, or impersonating any person or entity</li>
          <li style={li}>Artificially inflating follower counts, engagement rates, or reach metrics</li>
          <li style={li}>Using purchased followers, bots, or engagement pods to misrepresent reach</li>
          <li style={li}>Providing false information during verification</li>
        </ul>

        <h3 style={h3}>Fraud and Scams</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Accepting payment or gifts for a campaign without intending to deliver agreed content</li>
          <li style={li}>Posting campaigns without genuine intent to compensate creators</li>
          <li style={li}>Misrepresenting brand identity or campaign terms to creators</li>
          <li style={li}>Operating multi-account schemes to game matching or visibility systems</li>
        </ul>

        <h3 style={h3}>Platform Abuse</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Sending unsolicited commercial messages (spam) via the messaging system</li>
          <li style={li}>Attempting to move negotiations off-platform to avoid platform protections</li>
          <li style={li}>Scraping, crawling, or using automated tools to access the Platform without written permission</li>
          <li style={li}>Attempting to reverse-engineer or exploit Platform features, APIs, or security controls</li>
          <li style={li}>Creating multiple accounts to circumvent suspensions or feature restrictions</li>
        </ul>

        <h3 style={h3}>Advertising Compliance</h3>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Creators must disclose paid partnerships in all content produced through MRKT campaigns, in compliance with applicable advertising regulations (FTC, ASA, and local equivalents)</li>
          <li style={li}>Businesses may not instruct creators to conceal the commercial nature of content</li>
          <li style={li}>Businesses may not make false or unsubstantiated product claims in campaign briefs</li>
        </ul>

        <h2 style={h2}>AI Features</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>You may not use AI features to generate content that violates this AUP</li>
          <li style={li}>You may not attempt to manipulate the AI Strategist through prompt injection or jailbreak techniques</li>
          <li style={li}>You are responsible for all content you publish that was generated or assisted by MRKT AI</li>
        </ul>

        <h2 style={h2}>Reporting Violations</h2>
        <p style={p}>
          If you encounter content or conduct that violates this AUP, please report it:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>In-app: Use the Report button on any profile, campaign, or message</li>
          <li style={li}>Email: <a href="mailto:abuse@usemrkt.app" style={a}>abuse@usemrkt.app</a></li>
        </ul>
        <p style={p}>
          All reports are reviewed by our moderation team. We aim to respond within 48 business hours. You may appeal a moderation decision by emailing <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a> with the subject line "Moderation Appeal".
        </p>

        <h2 style={h2}>Enforcement</h2>
        <p style={p}>
          MRKT reserves the right to take the following actions in response to AUP violations, at its sole discretion:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Remove content without notice</li>
          <li style={li}>Issue a warning</li>
          <li style={li}>Temporarily restrict account features</li>
          <li style={li}>Suspend the account</li>
          <li style={li}>Permanently terminate the account</li>
          <li style={li}>Report to relevant law enforcement or regulatory authorities where required</li>
        </ul>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          Questions about this AUP: <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a><br />
          Abuse reports: <a href="mailto:abuse@usemrkt.app" style={a}>abuse@usemrkt.app</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
