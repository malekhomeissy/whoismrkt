import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/ai-disclosure")({
  head: () => ({
    meta: [
      { title: "AI Disclosure — MRKT" },
      { name: "description", content: "How MRKT uses artificial intelligence and what it means for you." },
    ],
  }),
  component: AIDisclosure,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function AIDisclosure() {
  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          AI Disclosure
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: June 29, 2026
        </p>

        <p style={p}>
          MRKT integrates artificial intelligence into several core features. This page explains what AI does on the Platform, which providers we use, what data is involved, and what your rights are.
        </p>

        <h2 style={h2}>AI-Powered Features</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>MRKT AI Strategist</strong> — A conversational AI assistant that provides marketing strategy, content ideas, growth advice, and campaign analysis personalised to your profile and activity data.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Content Planner</strong> — AI-generated posting schedules and content suggestions based on your niche, platform, location, and audience.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Campaign Matching</strong> — An algorithmic score that ranks the relevance of campaigns to creator profiles (and vice versa), based on categories, audience size, location, and collaboration preferences.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Growth Advice</strong> — AI-generated growth recommendations tailored to your creator stage and platform metrics.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Outreach Drafts</strong> — AI-generated first-draft outreach messages for businesses reaching out to creators.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Weekly Intelligence Reports</strong> — Automatically generated summaries of your platform activity, opportunities, and recommended next steps.</li>
        </ul>

        <h2 style={h2}>AI Providers</h2>
        <p style={p}>
          MRKT routes AI requests through an internal AI router. The underlying providers currently used are:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Anthropic</strong> (Claude models) — used for strategic, consultative, and long-form tasks</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>OpenAI</strong> (GPT models) — used for fast, creative, and time-sensitive tasks</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Higgsfield</strong> — used for AI image and video generation in MRKT Studio</li>
        </ul>
        <p style={p}>
          All AI responses are presented as "MRKT AI" to provide a consistent experience. The underlying provider is not disclosed in the interface, but is disclosed here in accordance with applicable transparency requirements.
        </p>

        <h2 style={h2}>What Data Is Sent to AI Providers</h2>
        <p style={p}>
          When you use an AI feature, the following data may be sent to AI providers:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Your messages and conversation history within the AI Strategist</li>
          <li style={li}>Profile data relevant to your request (e.g., your niche, follower counts, campaign activity, content calendar)</li>
          <li style={li}>Brand knowledge you have provided (for Business accounts)</li>
        </ul>
        <p style={p}>
          We do not send: your passwords, payment information, full message history with other users, or government identification.
        </p>

        <h2 style={h2}>AI Accuracy and Limitations</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>AI outputs may be inaccurate, incomplete, or outdated.</li>
          <li style={li}>AI-generated content is labelled in the Platform interface with an AI badge.</li>
          <li style={li}>You are solely responsible for reviewing AI outputs before publishing or relying on them commercially.</li>
          <li style={li}>AI does not provide legal, financial, medical, or professional advice. Outputs in these areas should be independently verified.</li>
          <li style={li}>Match scores and recommendations are algorithmic suggestions, not guarantees of success or compatibility.</li>
        </ul>

        <h2 style={h2}>Automated Decision-Making</h2>
        <p style={p}>
          MRKT uses AI-assisted matching to rank creators and campaigns. This affects which campaigns creators see prominently and which creators appear in business search results. These are <strong style={{ color: "oklch(1 0 0 / 72%)" }}>recommendations only</strong> — all final decisions about who to hire or which campaign to apply to are made by human users.
        </p>
        <p style={p}>
          If you believe a match score or recommendation is incorrect or unfair, you may: contact us at <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a> to request a review; or opt out of algorithmic matching by contacting us at the same address.
        </p>

        <h2 style={h2}>Your Rights</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Opt out of AI matching:</strong> Email <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a></li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Request deletion of AI logs:</strong> Automatically deleted after 90 days; earlier deletion on request</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Human review of AI decisions:</strong> Available for any consequential AI recommendation upon request</li>
        </ul>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          For questions about AI use: <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
