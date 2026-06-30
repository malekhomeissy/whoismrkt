import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookie Policy — MRKT" },
      { name: "description", content: "MRKT Cookie Policy. What cookies we use and why." },
    ],
  }),
  component: CookiePolicy,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function CookiePolicy() {
  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          Cookie Policy
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: June 29, 2026
        </p>

        <p style={p}>
          This Cookie Policy explains what cookies are, which ones MRKT uses, and how you can control them.
        </p>

        <h2 style={h2}>What Are Cookies?</h2>
        <p style={p}>
          Cookies are small text files placed on your device when you visit a website. They help websites function correctly, remember preferences, and understand how people use the site.
        </p>

        <h2 style={h2}>Cookies We Use</h2>

        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ background: "oklch(1 0 0 / 3%)", border: "1px solid oklch(1 0 0 / 8%)", borderRadius: "12px", overflow: "hidden" }}>
            {[
              {
                name: "Strictly Necessary",
                tag: "Always active",
                tagColor: "oklch(0.72 0.14 152)",
                items: [
                  "supabase-auth-token — Stores your session so you remain logged in. Required for the Platform to function. Expires when you log out or after 7 days of inactivity.",
                  "MRKT session cookie — Used to maintain your authenticated session across page loads.",
                ],
              },
              {
                name: "Analytics (Optional)",
                tag: "Requires consent",
                tagColor: "oklch(0.70 0.08 68)",
                items: [
                  "PostHog — Anonymised analytics to understand how features are used and improve the Platform. We configure PostHog to not fingerprint users across devices and to anonymise IP addresses.",
                  "No advertising or tracking pixels are used.",
                ],
              },
            ].map((section) => (
              <div key={section.name} style={{ padding: "16px 20px", borderBottom: "1px solid oklch(1 0 0 / 6%)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "oklch(1 0 0 / 85%)" }}>{section.name}</span>
                  <span style={{ fontSize: "10px", padding: "2px 8px", borderRadius: "100px", color: section.tagColor, background: `${section.tagColor}18`, border: `1px solid ${section.tagColor}30` }}>
                    {section.tag}
                  </span>
                </div>
                <ul style={{ paddingLeft: "1.25rem", marginBottom: 0 }}>
                  {section.items.map((item) => <li key={item} style={li}>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <h2 style={h2}>Third-Party Cookies</h2>
        <p style={p}>
          We do not use advertising networks, social media tracking pixels, or third-party retargeting cookies. Our only third-party cookie use is analytics (PostHog) and authentication (Supabase). Neither service is used for advertising.
        </p>

        <h2 style={h2}>How to Control Cookies</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Cookie banner:</strong> When you first visit, we ask for consent for optional analytics cookies. You can change your choice at any time by clicking "Cookie Preferences" in the page footer.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Browser settings:</strong> You can block or delete cookies through your browser settings. Blocking strictly necessary cookies will prevent login from working.</li>
          <li style={li}><strong style={{ color: "oklch(1 0 0 / 72%)" }}>Email:</strong> Contact <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a> to opt out of analytics.</li>
        </ul>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          For questions about our use of cookies: <a href="mailto:privacy@usemrkt.app" style={a}>privacy@usemrkt.app</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
