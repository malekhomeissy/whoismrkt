import { createFileRoute } from "@tanstack/react-router";
import { Nav } from "@/components/site/Nav";
import { Footer } from "@/components/site/Footer";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "Copyright & DMCA Policy — MRKT" },
      { name: "description", content: "MRKT Copyright and DMCA takedown policy." },
    ],
  }),
  component: DMCA,
});

const prose = { color: "oklch(1 0 0 / 60%)", lineHeight: "1.75" };
const h2    = { color: "oklch(1 0 0 / 88%)", fontSize: "15px", fontWeight: 700, marginTop: "2rem", marginBottom: "0.5rem" };
const p     = { ...prose, fontSize: "13px", marginBottom: "0.85rem" };
const li    = { ...prose, fontSize: "13px", marginBottom: "0.35rem" };
const a     = { color: "oklch(0.82 0.005 0)" };

function DMCA() {
  return (
    <div style={{ background: "oklch(0.06 0 0)", minHeight: "100vh" }}>
      <Nav />
      <main className="max-w-2xl mx-auto px-6 py-20">
        <p style={{ color: "oklch(1 0 0 / 30%)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.3em", marginBottom: "1rem" }}>
          Legal
        </p>
        <h1 style={{ color: "oklch(1 0 0 / 92%)", fontSize: "28px", fontWeight: 800, marginBottom: "0.5rem" }}>
          Copyright & DMCA Policy
        </h1>
        <p style={{ color: "oklch(1 0 0 / 36%)", fontSize: "12px", marginBottom: "2.5rem" }}>
          Last updated: June 29, 2026
        </p>

        <p style={p}>
          MRKT respects intellectual property rights and expects users to do the same. If you believe that content on MRKT infringes your copyright, you may submit a takedown notice as described below.
        </p>

        <h2 style={h2}>What We Respond To</h2>
        <p style={p}>
          We respond to notices of alleged copyright infringement that include all of the information listed below. We do not process incomplete notices. We also reserve the right to remove content that is clearly infringing even without a formal notice.
        </p>

        <h2 style={h2}>How to Submit a Takedown Notice</h2>
        <p style={p}>Send your notice by email to <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a> with the subject line: <strong style={{ color: "oklch(1 0 0 / 72%)" }}>Copyright Takedown Request</strong>. Your notice must include:</p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Your full legal name, organisation (if applicable), and contact information</li>
          <li style={li}>A description of the copyrighted work you claim has been infringed</li>
          <li style={li}>The specific URL(s) on MRKT where the infringing content appears</li>
          <li style={li}>A statement that you have a good faith belief that the use is not authorised by the copyright owner, its agent, or applicable law</li>
          <li style={li}>A statement that the information in the notice is accurate and, under penalty of perjury, that you are the copyright owner or are authorised to act on their behalf</li>
          <li style={li}>Your electronic or physical signature</li>
        </ul>

        <h2 style={h2}>What Happens After You Submit</h2>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>We will review your notice within 5 business days</li>
          <li style={li}>If valid, we will remove or disable access to the infringing content</li>
          <li style={li}>We will notify the user who posted the content of the takedown</li>
          <li style={li}>Users with repeated copyright violations will have their accounts terminated</li>
        </ul>

        <h2 style={h2}>Counter-Notice</h2>
        <p style={p}>
          If your content was removed and you believe this was done in error or as a result of misidentification, you may submit a counter-notice to <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a> with:
        </p>
        <ul style={{ paddingLeft: "1.25rem", marginBottom: "0.85rem" }}>
          <li style={li}>Your full legal name and contact information</li>
          <li style={li}>Identification of the content that was removed and its location prior to removal</li>
          <li style={li}>A statement under penalty of perjury that you have a good faith belief the content was removed in error</li>
          <li style={li}>Your consent to the jurisdiction of the appropriate court in Lebanon</li>
          <li style={li}>Your signature (electronic or physical)</li>
        </ul>
        <p style={p}>
          If we receive a valid counter-notice, we may restore the content unless the original complainant obtains a court order preventing restoration.
        </p>

        <h2 style={h2}>Misrepresentation</h2>
        <p style={p}>
          Submitting a false or bad-faith takedown notice may expose you to liability for damages, including legal costs incurred by MRKT or the affected user.
        </p>

        <h2 style={h2}>Contact</h2>
        <p style={p}>
          Copyright Agent: <a href="mailto:legal@usemrkt.app" style={a}>legal@usemrkt.app</a>
        </p>
      </main>
      <Footer />
    </div>
  );
}
