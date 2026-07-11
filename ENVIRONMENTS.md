# Environments

## Current state (as of this writing)

MRKT has **one Supabase project** (`zkleghcsduntwonyiynb`), and it is production. There is no separate staging or local-only database. This applies to both codebases (Whoismrkt web and MRKTmobile) — they share the same project.

Practical consequence: running `npm run dev` locally, or running MRKTmobile in Expo Go / a dev client, connects to the real production database. Signups, messages, contracts, deletions — everything — happen against real data. `src/lib/envCheck.ts` prints a console warning in dev mode to make this visible; it does not block anything.

## Recommended target state

| Environment | Supabase project | Who runs it | Purpose |
|---|---|---|---|
| **Local** | Staging project (see below) | Individual engineers | Day-to-day development |
| **Staging** | Dedicated staging project | Shared, pre-production | Final verification before a release, safe place to test destructive flows (account deletion, RLS changes, migrations) |
| **Production** | `zkleghcsduntwonyiynb` | Live users | usemrkt.app / MRKT mobile app store builds |

## Setting up a staging project

1. Create a new Supabase project for staging.
2. Run every migration in `supabase/migrations/` against it in order (`supabase db push` against the staging project, or replay via the CLI) so its schema matches production exactly.
3. Set the Supabase project secrets staging needs (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `STRIPE_SECRET_KEY` in test mode, etc.) — use test/sandbox credentials where the provider supports them (Stripe test mode, a separate Higgsfield/WhatsApp sandbox if available) so staging activity never touches real billing or real end-user channels.
4. Set `VITE_STAGING_SUPABASE_URL` / `VITE_STAGING_SUPABASE_PUBLISHABLE_KEY` (web, see `.env.example`) and the mobile equivalents (see `MRKTmobile/.env.example`) to point local development at the staging project instead of production.
5. Do the same for MRKTmobile's `.env`.

Until this exists, treat every local run as if it were touching production, because it is.

## Secrets

`.env` is gitignored in both repos and was not found in git history in either — no secret rotation is required on that basis.

**One item worth the founder's manual attention:** the MRKTmobile repo's `git remote -v` output includes a GitHub personal access token embedded directly in the remote URL (`https://github.com/malekhomeissy/mrkt-mobile.git` — checked via `git remote -v`, which showed a token-embedded fetch/push URL). This was not printed or copied anywhere by this audit/fix pass, but it means the token is sitting in local git config in plaintext. Recommended: rotate that PAT and reconfigure the remote using SSH or a credential helper instead of an embedded token, so it isn't sitting in a config file that could be copied, backed up, or shared inadvertently.
