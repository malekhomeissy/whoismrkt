import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(req) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Detect role
    const { data: profile } = await supabase
      .from("profiles")
      .select("name, account_type, onboarding_path, niche, platforms")
      .eq("id", user.id)
      .single();

    const role = profile?.account_type ?? profile?.onboarding_path ?? "creator";
    const isCreator = role === "creator";
    const today = new Date().toISOString().slice(0, 10);

    const contextParts: string[] = [];
    contextParts.push(`User: ${profile?.name ?? "Unknown"}`);
    contextParts.push(`Role: ${isCreator ? "Creator" : "Business"}`);
    contextParts.push(`Today: ${today}`);

    if (isCreator) {
      // ── Creator profile ────────────────────────────────────────────────────

      const { data: cp } = await supabase
        .from("creator_profiles")
        .select("display_name, niche, platforms, follower_count, instagram_followers, instagram_connected, location, bio, rate_min, rate_max")
        .eq("user_id", user.id)
        .single();

      if (cp) {
        contextParts.push(`Niche: ${(cp.niche ?? []).join(", ") || "not set"}`);
        contextParts.push(`Platforms: ${(cp.platforms ?? []).join(", ") || "not set"}`);
        contextParts.push(`Location: ${cp.location ?? "not set"}`);
        const followers = cp.instagram_connected && (cp.instagram_followers ?? 0) > 0
          ? `${cp.instagram_followers.toLocaleString()} (verified Instagram)`
          : (cp.follower_count ?? 0) > 0
            ? `${cp.follower_count.toLocaleString()} (self-reported)`
            : "not set";
        contextParts.push(`Followers: ${followers}`);
        if (cp.rate_min || cp.rate_max) {
          contextParts.push(`Rate: $${cp.rate_min ?? "?"}–$${cp.rate_max ?? "?"} per campaign`);
        }
        // Missing profile fields
        const missing: string[] = [];
        if (!cp.bio) missing.push("bio");
        if (!(cp.niche ?? []).length) missing.push("niche");
        if (!(cp.platforms ?? []).length) missing.push("platforms");
        if (!cp.location) missing.push("location");
        if (!cp.rate_min && !cp.rate_max) missing.push("rate");
        if (!cp.instagram_connected) missing.push("Instagram verification");
        if (missing.length) {
          contextParts.push(`Missing profile fields: ${missing.join(", ")} — completing these increases visibility`);
        }
      }

      // ── Trust score ────────────────────────────────────────────────────────

      const { data: trust } = await supabase
        .from("creator_trust_scores")
        .select("score, tier, total_campaigns, avg_rating, completion_rate, avg_response_time_hours, revision_rate")
        .eq("user_id", user.id)
        .single();

      if (trust) {
        contextParts.push(`Trust tier: ${trust.tier} (score: ${trust.score}/100)`);
        contextParts.push(`Campaigns completed: ${trust.total_campaigns}`);
        if (trust.avg_rating) contextParts.push(`Average rating: ${trust.avg_rating.toFixed(1)}/5`);
        if (trust.completion_rate != null) contextParts.push(`Completion rate: ${Math.round(trust.completion_rate * 100)}%`);
        // Trust improvement suggestions
        const suggestions: string[] = [];
        if ((trust.score ?? 0) < 40) suggestions.push("complete your first campaign to build a track record");
        if ((trust.avg_rating ?? 5) < 4.0 && trust.total_campaigns > 0) suggestions.push("focus on quality to improve your rating");
        if ((trust.avg_response_time_hours ?? 0) > 24) suggestions.push("respond to messages faster to improve your response score");
        if ((trust.revision_rate ?? 0) > 0.3) suggestions.push("discuss deliverable expectations upfront to reduce revision requests");
        if (suggestions.length) contextParts.push(`Trust improvement: ${suggestions.join("; ")}`);
      } else {
        contextParts.push("Trust: New on MRKT — not enough campaign history yet");
      }

      // ── Applications ───────────────────────────────────────────────────────

      const { data: apps } = await supabase
        .from("campaign_applications")
        .select("id, status, created_at, campaigns(title)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (apps?.length) {
        const pending = apps.filter(a => a.status === "pending");
        const shortlisted = apps.filter(a => a.status === "shortlisted");
        const accepted = apps.filter(a => a.status === "accepted");
        const rejected = apps.filter(a => a.status === "rejected");

        if (pending.length) contextParts.push(`Pending applications: ${pending.length} awaiting review`);
        if (shortlisted.length) contextParts.push(`Shortlisted: ${shortlisted.map(a => (a.campaigns as { title?: string } | null)?.title ?? "Untitled").join(", ")}`);
        if (accepted.length) contextParts.push(`Accepted campaigns: ${accepted.map(a => (a.campaigns as { title?: string } | null)?.title ?? "Untitled").join(", ")}`);
        if (rejected.length) contextParts.push(`Rejected applications: ${rejected.length} (review feedback if available)`);
      }

      // ── Best matched opportunities ─────────────────────────────────────────

      const { data: topOpps } = await supabase
        .from("match_score_cache")
        .select("campaign_id, score, campaigns(title, budget_min, budget_max)")
        .eq("creator_id", user.id)
        .gte("expires_at", new Date().toISOString())
        .gte("score", 60)
        .order("score", { ascending: false })
        .limit(5);

      if (topOpps?.length) {
        const oppList = topOpps.map(o => {
          const c = o.campaigns as { title?: string; budget_min?: number; budget_max?: number } | null;
          const budget = c?.budget_min ? `$${c.budget_min}–$${c.budget_max ?? "?"}` : "";
          return `${c?.title ?? "Untitled"} (${o.score}% match${budget ? ", " + budget : ""})`;
        }).join("; ");
        contextParts.push(`Best matched opportunities: ${oppList}`);
      }

      // ── Content planner gaps ───────────────────────────────────────────────

      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const { data: planned } = await supabase
        .from("content_plans")
        .select("id, title, scheduled_for, status")
        .eq("user_id", user.id)
        .gte("scheduled_for", today)
        .lte("scheduled_for", nextWeek.toISOString().slice(0, 10))
        .order("scheduled_for")
        .limit(7);

      if (planned?.length) {
        contextParts.push(`Upcoming content (7d): ${planned.map(p => `${p.title} on ${p.scheduled_for} (${p.status})`).join("; ")}`);
      } else {
        contextParts.push("Content planner: nothing scheduled for next 7 days — a gap in your content calendar");
      }

      // ── Visibility score ───────────────────────────────────────────────────

      const { data: vis } = await supabase
        .from("creator_visibility_scores")
        .select("score, weekly_change, recent_views, recent_appearances, profile_completeness, activity_score, response_score")
        .eq("user_id", user.id)
        .single();

      if (vis) {
        contextParts.push(`Visibility score: ${vis.score}/100 (${vis.weekly_change >= 0 ? "+" : ""}${vis.weekly_change} this week)`);
        contextParts.push(`Profile views (7d): ${vis.recent_views ?? 0}, Match appearances (7d): ${vis.recent_appearances ?? 0}`);
        // Biggest improvement lever
        const scores = [
          { name: "profile completeness", val: vis.profile_completeness },
          { name: "activity", val: vis.activity_score },
          { name: "response rate", val: vis.response_score },
        ];
        const lowest = scores.sort((a, b) => a.val - b.val)[0];
        if (lowest.val < 60) {
          contextParts.push(`Top visibility improvement: focus on ${lowest.name} (currently ${lowest.val}/100)`);
        }
      }

      // ── Unread messages ────────────────────────────────────────────────────

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);

      if ((unread ?? 0) > 0) contextParts.push(`Unread messages: ${unread}`);

      // ── Active opportunities count ─────────────────────────────────────────

      const { count: oppCount } = await supabase
        .from("campaigns")
        .select("id", { count: "exact", head: true })
        .eq("status", "active");

      if (oppCount !== null) contextParts.push(`Active opportunities on platform: ${oppCount}`);

    } else {
      // ── Business context ───────────────────────────────────────────────────

      const { data: biz } = await supabase
        .from("business_profiles")
        .select("company_name, industry, description")
        .eq("user_id", user.id)
        .single();

      if (biz) {
        contextParts.push(`Company: ${biz.company_name ?? "Unknown"}`);
        contextParts.push(`Industry: ${biz.industry ?? "not set"}`);
      }

      // ── Trust score ────────────────────────────────────────────────────────

      const { data: trust } = await supabase
        .from("business_trust_scores")
        .select("score, tier, total_campaigns, payment_rate, avg_rating")
        .eq("user_id", user.id)
        .single();

      if (trust) {
        contextParts.push(`Trust tier: ${trust.tier} (score: ${trust.score}/100)`);
        contextParts.push(`Total campaigns run: ${trust.total_campaigns}`);
        if (trust.avg_rating) contextParts.push(`Creator satisfaction: ${trust.avg_rating.toFixed(1)}/5`);
      } else {
        contextParts.push("Trust: New business on MRKT — no campaign history yet");
      }

      // ── Campaigns with per-campaign application counts ─────────────────────

      const { data: allCampaigns } = await supabase
        .from("campaigns")
        .select("id, title, status, budget_min, budget_max, created_at")
        .eq("user_id", user.id)
        .in("status", ["active", "reviewing", "paused"])
        .order("created_at", { ascending: false })
        .limit(10);

      const activeCampaignIds = (allCampaigns ?? []).map(c => c.id);

      if (allCampaigns?.length) {
        // Get per-campaign application breakdown
        const { data: allApps } = await supabase
          .from("campaign_applications")
          .select("campaign_id, status, created_at, profiles(name), creator_profiles(display_name)")
          .in("campaign_id", activeCampaignIds);

        const staleThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

        for (const c of allCampaigns) {
          const cApps = (allApps ?? []).filter(a => a.campaign_id === c.id);
          const pending = cApps.filter(a => a.status === "pending");
          const shortlisted = cApps.filter(a => a.status === "shortlisted");
          const accepted = cApps.filter(a => a.status === "accepted");
          const budget = c.budget_min ? `$${c.budget_min}–$${c.budget_max ?? "?"}` : "budget TBD";

          let campLine = `Campaign "${c.title}" (${c.status}, ${budget}): ${cApps.length} total applications`;
          if (pending.length) campLine += `, ${pending.length} pending review`;
          if (shortlisted.length) campLine += `, ${shortlisted.length} shortlisted`;
          if (accepted.length) campLine += `, ${accepted.length} accepted`;
          if (cApps.length === 0) campLine += " — no applications yet, consider promoting this campaign";
          contextParts.push(campLine);

          // Stale pending applications (>72h)
          const stale = pending.filter(a => a.created_at < staleThreshold);
          if (stale.length > 0) {
            contextParts.push(`  ↳ ${stale.length} application(s) have been pending for over 72 hours — review recommended`);
          }
        }

        // Summary counts
        const totalPending = (allApps ?? []).filter(a => a.status === "pending").length;
        if (totalPending > 0) contextParts.push(`Total pending applications across all campaigns: ${totalPending}`);

        const zeroCampaigns = allCampaigns.filter(c => !(allApps ?? []).some(a => a.campaign_id === c.id));
        if (zeroCampaigns.length > 0) {
          contextParts.push(`Campaigns with zero applications: ${zeroCampaigns.map(c => c.title).join(", ")}`);
        }
      } else {
        contextParts.push("Active campaigns: none — create a campaign to start receiving applications");
      }

      // ── Pipeline stage breakdown ───────────────────────────────────────────

      const { data: pipelineApps } = await supabase
        .from("campaign_applications")
        .select(`
          id, status, updated_at,
          creator_profiles(display_name, user_id),
          campaigns!inner(user_id, title)
        `)
        .eq("campaigns.user_id", user.id)
        .in("status", ["shortlisted", "accepted", "contract_sent", "in_progress"])
        .order("updated_at", { ascending: false })
        .limit(20);

      if (pipelineApps?.length) {
        const stages: Record<string, string[]> = {};
        for (const a of pipelineApps) {
          const creatorName = (a.creator_profiles as { display_name?: string } | null)?.display_name ?? "Creator";
          const stage = a.status;
          if (!stages[stage]) stages[stage] = [];
          stages[stage].push(creatorName);
        }
        const stageSummary = Object.entries(stages)
          .map(([stage, names]) => `${stage}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3} more` : ""}`)
          .join("; ");
        contextParts.push(`Pipeline breakdown: ${stageSummary}`);
      }

      // ── Deliverables awaiting approval ─────────────────────────────────────

      const { data: deliverables } = await supabase
        .from("campaign_deliverable_submissions")
        .select("id, status, submitted_at, campaign_id")
        .eq("business_id", user.id)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: true })
        .limit(10);

      if (deliverables?.length) {
        contextParts.push(`Deliverables awaiting your approval: ${deliverables.length} — review and approve or request revisions`);
        const oldest = deliverables[0];
        if (oldest.submitted_at) {
          const daysAgo = Math.floor((Date.now() - new Date(oldest.submitted_at).getTime()) / 86400000);
          if (daysAgo >= 2) {
            contextParts.push(`  ↳ Oldest submission has been waiting ${daysAgo} day(s) — timely review builds creator trust`);
          }
        }
      }

      // ── Unread messages ────────────────────────────────────────────────────

      const { count: unread } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .eq("read", false);

      if ((unread ?? 0) > 0) contextParts.push(`Unread messages: ${unread}`);
    }

    const context = contextParts.join("\n");

    return new Response(JSON.stringify({ context, role: isCreator ? "creator" : "business" }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("build-mrkt-context error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
