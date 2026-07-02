# MRKT Incident Response Runbook

**Owner:** Malek Homeissy — malekhomeissy@gmail.com  
**Last updated:** July 1, 2026

---

## Severity Levels

| Level | Definition | Response time |
|-------|-----------|--------------|
| P0 | Platform fully down / data breach | Immediate |
| P1 | Core feature broken for all users | < 1 hour |
| P2 | Feature broken for subset of users | < 4 hours |
| P3 | Degraded performance / cosmetic | Next business day |

---

## P0: Platform Down

**Signs:** Cloudflare returns 5xx, Supabase health check fails, all auth fails.

1. Check [Cloudflare Status](https://www.cloudflarestatus.com) — if their outage, wait.
2. Check [Supabase Status](https://status.supabase.com) — if their outage, wait.
3. If MRKT-side: run `wrangler tail` to stream live Worker logs.
4. Roll back last deploy: `wrangler rollback --env production` (or redeploy previous commit).
5. If Supabase DB is up but Worker is broken: edge functions still work directly at `zkleghcsduntwonyiynb.supabase.co/functions/v1/*`.

---

## P0: Suspected Data Breach

1. **Immediately rotate** Supabase service role key in Supabase dashboard → Settings → API.
2. Rotate `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `META_APP_SECRET` in all secret stores.
3. Go to Supabase → Auth → Users → export user list.
4. Disable all edge functions in Supabase dashboard (toggle off).
5. Review `admin_action_log` table for unauthorized admin actions.
6. Review `ai_requests` table for spikes in usage (indicates API key abuse).
7. Notify affected users within 72 hours (GDPR requirement even under Lebanese law).
8. File report with relevant Lebanese data protection authority if user PII exposed.

---

## P1: Authentication Broken

1. Check Supabase Auth logs: Dashboard → Auth → Logs.
2. Verify `supabase/config.toml` `site_url` and `additional_redirect_urls` are correct.
3. Check Google OAuth app credentials in Google Cloud Console (client ID / secret).
4. If Google OAuth revoked: users can still sign in via email magic link as fallback.

---

## P1: AI Features Down (Anthropic API)

1. Check [Anthropic Status](https://status.anthropic.com).
2. Check `ANTHROPIC_API_KEY` is still valid: `curl https://api.anthropic.com/v1/models -H "x-api-key: $KEY"`.
3. Check `ai_requests` table — if `success = false` rows spiking, key may be rate-limited or suspended.
4. Fallback: the AI router (`_shared/router.ts`) will try OpenAI if configured. Set `OPENAI_API_KEY` in Supabase secrets as backup.

---

## P1: Instagram OAuth Broken

1. Check Meta developer console — app may be in review, suspended, or rate-limited.
2. Verify `META_APP_ID` and `META_APP_SECRET` in Supabase secrets.
3. Check that redirect URIs in Meta app settings match `https://usemrkt.app/instagram-callback`.
4. Token refresh failures: creators will see "Instagram connection expired" — they can reconnect manually.

---

## P2: Edge Function Errors

```bash
# Stream live logs for a specific function
supabase functions logs generate-intelligence --tail

# Redeploy a single function
supabase functions deploy generate-intelligence
```

---

## P2: High AI Credit Usage / Cost Spike

1. Query `ai_requests` table for top consumers:
   ```sql
   SELECT user_id, COUNT(*) as calls, SUM(prompt_tokens) as tokens
   FROM ai_requests
   WHERE created_at > now() - interval '24 hours'
   GROUP BY user_id ORDER BY calls DESC LIMIT 20;
   ```
2. If abuse: use `admin_set_pro_status(user_id, false)` to cut credits, or block via RLS.
3. Rate limits are enforced in `_shared/security.ts` — `STRICT_AI_RATE` = 10 req/min per user.

---

## Contacts & Credentials

| Service | Where to find credentials |
|---------|--------------------------|
| Supabase | dashboard.supabase.com → project `zkleghcsduntwonyiynb` |
| Cloudflare | cloudflare.com → Workers → usemrkt |
| Anthropic | console.anthropic.com |
| Meta (Instagram) | developers.facebook.com → MRKT app |
| Sentry | sentry.io → MRKT project |

---

## Post-Incident

After resolving any P0/P1:
1. Write a brief post-mortem (what happened, root cause, fix, prevention).
2. Update this runbook if a new failure mode was discovered.
3. Add a migration or code fix to prevent recurrence.
