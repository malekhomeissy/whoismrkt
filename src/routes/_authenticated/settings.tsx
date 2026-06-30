import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  Bell, Mail, MessageCircle, Megaphone, FileText,
  CalendarDays, BarChart2, Shield, Smartphone,
  ShieldCheck, ChevronRight, Receipt, Download, Trash2, AlertTriangle,
} from "lucide-react";
import { C } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — MRKT" }] }),
  component: SettingsPage,
});

interface NotificationPrefs {
  in_app_enabled:    boolean;
  email_enabled:     boolean;
  whatsapp_enabled:  boolean;
  campaign_updates:  boolean;
  messages:          boolean;
  contracts:         boolean;
  deliverables:      boolean;
  weekly_reports:    boolean;
  marketing_updates: boolean;
}

interface PhoneFields {
  phone_number:    string;
  whatsapp_number: string;
}

const DEFAULT_PREFS: NotificationPrefs = {
  in_app_enabled:    true,
  email_enabled:     true,
  whatsapp_enabled:  false,
  campaign_updates:  true,
  messages:          true,
  contracts:         true,
  deliverables:      true,
  weekly_reports:    true,
  marketing_updates: false,
};

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({
  checked, onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none"
      style={{
        background: checked ? C.green : "oklch(1 0 0 / 12%)",
        border: `1px solid ${checked ? C.green : "oklch(1 0 0 / 16%)"}`,
      }}
    >
      <span
        className="pointer-events-none absolute top-[1px] left-[1px] h-[17px] w-[17px] rounded-full transition-transform duration-200"
        style={{
          background: checked ? "#000" : "oklch(1 0 0 / 45%)",
          transform: checked ? "translateX(16px)" : "translateX(0)",
        }}
      />
    </button>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="text-[9.5px] uppercase tracking-[0.32em] font-semibold mb-3"
        style={{ color: C.faint }}
      >
        {title}
      </div>
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: C.surface, border: `1px solid ${C.border}` }}
      >
        {children}
      </div>
    </div>
  );
}

function Row({
  icon: Icon, label, sub, checked, onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sub?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-4"
      style={{ borderBottom: `1px solid ${C.border}` }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}` }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: C.muted }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-medium truncate" style={{ color: C.text }}>{label}</div>
          {sub && <div className="text-[11px] mt-0.5 truncate" style={{ color: C.faint }}>{sub}</div>}
        </div>
      </div>
      <div className="ml-4 shrink-0">
        <Toggle checked={checked} onChange={onChange} />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function SettingsPage() {
  const { user } = useAuth();
  const [prefs,      setPrefs]      = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [phones,     setPhones]     = useState<PhoneFields>({ phone_number: "", whatsapp_number: "" });
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [exporting,      setExporting]      = useState(false);
  const [deleteConfirm,  setDeleteConfirm]  = useState(false);
  const [deletePhrase,   setDeletePhrase]   = useState("");
  const [deleting,       setDeleting]       = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [prefsRes, profileRes] = await Promise.all([
        (supabase as any)
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("profiles")
          .select("phone_number, whatsapp_number")
          .eq("id", user.id)
          .maybeSingle(),
      ]);

      if (prefsRes.data) {
        setPrefs({ ...DEFAULT_PREFS, ...prefsRes.data });
      }
      if (profileRes.data) {
        setPhones({
          phone_number:    profileRes.data.phone_number    ?? "",
          whatsapp_number: profileRes.data.whatsapp_number ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user]);

  async function updatePref<K extends keyof NotificationPrefs>(key: K, value: boolean) {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);

    try {
      await (supabase as any)
        .from("notification_preferences")
        .upsert({ user_id: user.id, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    } catch {
      toast.error("Could not save preference.");
      setPrefs(prefs);
    }
  }

  async function savePhones() {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("profiles")
        .update({
          phone_number:    phones.phone_number.trim()    || null,
          whatsapp_number: phones.whatsapp_number.trim() || null,
        })
        .eq("id", user.id);
      if (error) throw error;
      toast.success("Contact details updated.");
    } catch {
      toast.error("Could not update contact details.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDataExport() {
    if (!user) return;
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/data-export`,
        { method: "POST", headers: { Authorization: `Bearer ${session.access_token}` } },
      );
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `mrkt-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data has been downloaded.");
    } catch {
      toast.error("Export failed. Please email privacy@usemrkt.app.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    if (!user || deletePhrase.toLowerCase() !== "delete my account") {
      toast.error("Please type 'delete my account' to confirm.");
      return;
    }
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/account-delete`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: deletePhrase }),
        },
      );
      if (!res.ok) throw new Error(await res.text());

      await supabase.auth.signOut();
      window.location.href = "/";
    } catch {
      toast.error("Deletion failed. Please contact legal@usemrkt.app.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ color: C.faint }}>
        <div className="text-[13px]">Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#000" }}>
      <div className="max-w-xl mx-auto px-5 py-10 space-y-8">

        {/* Header */}
        <div>
          <h1 className="font-display text-[1.5rem] font-bold tracking-tight" style={{ color: C.text }}>
            Settings
          </h1>
          <p className="text-[13px] mt-1" style={{ color: C.faint }}>
            Manage notifications and contact preferences.
          </p>
        </div>

        {/* Verification */}
        <Section title="Verification">
          <Link
            to="/verification"
            className="flex items-center gap-3 px-5 py-4 transition-colors group"
            style={{ borderBottom: "none" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "oklch(1 0 0 / 4%)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = ""; }}
          >
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.72 0.14 152 / 10%)", border: "1px solid oklch(0.72 0.14 152 / 24%)" }}
            >
              <ShieldCheck className="h-3.5 w-3.5" style={{ color: C.green }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium" style={{ color: C.text }}>Creator Verification</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                Instagram connection, follower verification, MRKT badge status
              </div>
            </div>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" style={{ color: C.faint }} />
          </Link>
        </Section>

        {/* Channels */}
        <Section title="Notification channels">
          <Row
            icon={Bell}
            label="In-app notifications"
            sub="Activity feed and badges inside MRKT"
            checked={prefs.in_app_enabled}
            onChange={(v) => updatePref("in_app_enabled", v)}
          />
          <Row
            icon={Mail}
            label="Email notifications"
            sub="Campaign updates, messages, and weekly reports"
            checked={prefs.email_enabled}
            onChange={(v) => updatePref("email_enabled", v)}
          />
          <div
            className="flex items-center justify-between px-5 py-4"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}` }}
              >
                <MessageCircle className="h-3.5 w-3.5" style={{ color: C.muted }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium truncate" style={{ color: C.text }}>WhatsApp notifications</div>
                <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                  Requires a WhatsApp number below
                </div>
              </div>
            </div>
            <div className="ml-4 shrink-0">
              <Toggle
                checked={prefs.whatsapp_enabled}
                onChange={(v) => updatePref("whatsapp_enabled", v)}
              />
            </div>
          </div>
        </Section>

        {/* Categories */}
        <Section title="Notification categories">
          <Row
            icon={Megaphone}
            label="Campaign updates"
            sub="Application status changes and shortlist alerts"
            checked={prefs.campaign_updates}
            onChange={(v) => updatePref("campaign_updates", v)}
          />
          <Row
            icon={Mail}
            label="Messages"
            sub="New messages from brands and creators"
            checked={prefs.messages}
            onChange={(v) => updatePref("messages", v)}
          />
          <Row
            icon={FileText}
            label="Contracts"
            sub="Contract creation, signing, and updates"
            checked={prefs.contracts}
            onChange={(v) => updatePref("contracts", v)}
          />
          <Row
            icon={Shield}
            label="Deliverables"
            sub="Approval, revision requests, and completion"
            checked={prefs.deliverables}
            onChange={(v) => updatePref("deliverables", v)}
          />
          <Row
            icon={BarChart2}
            label="Weekly reports"
            sub="Performance summary delivered every Monday"
            checked={prefs.weekly_reports}
            onChange={(v) => updatePref("weekly_reports", v)}
          />
          <div style={{ borderBottom: "none" }}>
            <Row
              icon={CalendarDays}
              label="Platform updates"
              sub="Product announcements and new features"
              checked={prefs.marketing_updates}
              onChange={(v) => updatePref("marketing_updates", v)}
            />
          </div>
        </Section>

        {/* Contact details */}
        <Section title="Contact details">
          <div className="p-5 space-y-4">
            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.28em] font-medium mb-2"
                style={{ color: C.faint }}
              >
                Phone number
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}` }}
              >
                <Smartphone className="h-4 w-4 ml-3.5 shrink-0" style={{ color: C.faint }} />
                <input
                  type="tel"
                  value={phones.phone_number}
                  onChange={(e) => setPhones((p) => ({ ...p, phone_number: e.target.value }))}
                  placeholder="+971 50 000 0000"
                  className="flex-1 bg-transparent px-3 py-3 text-[13px] outline-none"
                  style={{ color: C.text }}
                />
              </div>
            </div>

            <div>
              <label
                className="block text-[10px] uppercase tracking-[0.28em] font-medium mb-2"
                style={{ color: C.faint }}
              >
                WhatsApp number
              </label>
              <div
                className="flex items-center rounded-xl overflow-hidden"
                style={{ background: "oklch(1 0 0 / 4%)", border: `1px solid ${C.border}` }}
              >
                <MessageCircle className="h-4 w-4 ml-3.5 shrink-0" style={{ color: C.faint }} />
                <input
                  type="tel"
                  value={phones.whatsapp_number}
                  onChange={(e) => setPhones((p) => ({ ...p, whatsapp_number: e.target.value }))}
                  placeholder="+971 50 000 0000"
                  className="flex-1 bg-transparent px-3 py-3 text-[13px] outline-none"
                  style={{ color: C.text }}
                />
              </div>
              <p className="text-[10.5px] mt-1.5" style={{ color: C.faint }}>
                Must include country code. Used for WhatsApp notifications when enabled.
              </p>
            </div>

            <button
              onClick={savePhones}
              disabled={saving}
              className="btn-primary rounded-full h-9 px-6 text-[13px]"
            >
              {saving ? "Saving…" : "Save contact details"}
            </button>
          </div>
        </Section>

        {/* Payments — coming soon placeholder */}
        <Section title="Payments">
          <div className="flex items-center gap-3 px-5 py-4">
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(1 0 0 / 5%)", border: `1px solid ${C.border}` }}
            >
              <Receipt className="h-3.5 w-3.5" style={{ color: C.faint }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium" style={{ color: C.muted }}>Payments & Payouts</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                Coming in a future release
              </div>
            </div>
            <span
              className="text-[9.5px] uppercase tracking-[0.2em] font-semibold px-2.5 py-1 rounded-full"
              style={{ color: "oklch(0.70 0.08 68)", background: "oklch(0.70 0.08 68 / 10%)", border: "1px solid oklch(0.70 0.08 68 / 20%)" }}
            >
              Soon
            </span>
          </div>
        </Section>

        {/* Data & Privacy */}
        <Section title="Data & Privacy">
          {/* Export data */}
          <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div
              className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "oklch(0.72 0.14 152 / 10%)", border: "1px solid oklch(0.72 0.14 152 / 20%)" }}
            >
              <Download className="h-3.5 w-3.5" style={{ color: "oklch(0.72 0.14 152)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-medium" style={{ color: C.text }}>Export your data</div>
              <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                Download a copy of your MRKT data (profile, messages, analytics, etc.)
              </div>
            </div>
            <button
              onClick={handleDataExport}
              disabled={exporting}
              className="text-[12px] font-medium px-4 h-8 rounded-full transition-colors"
              style={{
                background: "oklch(1 0 0 / 6%)",
                color: "oklch(1 0 0 / 60%)",
                border: `1px solid ${C.border}`,
                cursor: exporting ? "not-allowed" : "pointer",
                opacity: exporting ? 0.5 : 1,
              }}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>

          {/* Delete account */}
          <div className="px-5 py-4">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "oklch(0.52 0.15 24 / 10%)", border: "1px solid oklch(0.52 0.15 24 / 20%)" }}
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: "oklch(0.65 0.18 24)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13px] font-medium" style={{ color: "oklch(0.75 0.12 24)" }}>Delete account</div>
                <div className="text-[11px] mt-0.5" style={{ color: C.faint }}>
                  Permanently delete your account and all associated data. This cannot be undone.
                </div>
              </div>
              {!deleteConfirm && (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="text-[12px] font-medium px-4 h-8 rounded-full transition-colors"
                  style={{
                    background: "oklch(0.52 0.15 24 / 8%)",
                    color: "oklch(0.65 0.18 24)",
                    border: "1px solid oklch(0.52 0.15 24 / 20%)",
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              )}
            </div>

            {deleteConfirm && (
              <div
                className="rounded-2xl p-4 space-y-3"
                style={{ background: "oklch(0.52 0.15 24 / 6%)", border: "1px solid oklch(0.52 0.15 24 / 18%)" }}
              >
                <div className="flex items-center gap-2" style={{ color: "oklch(0.75 0.12 24)" }}>
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span className="text-[12px] font-medium">This will permanently delete your account and all your data.</span>
                </div>
                <p className="text-[11px]" style={{ color: C.faint }}>
                  Type <strong style={{ color: C.muted }}>delete my account</strong> below to confirm.
                </p>
                <input
                  type="text"
                  value={deletePhrase}
                  onChange={(e) => setDeletePhrase(e.target.value)}
                  placeholder="delete my account"
                  className="w-full rounded-xl px-4 py-2.5 text-[13px] outline-none"
                  style={{
                    background: "oklch(1 0 0 / 4%)",
                    border: `1px solid ${C.border}`,
                    color: C.text,
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => { setDeleteConfirm(false); setDeletePhrase(""); }}
                    className="flex-1 h-9 rounded-full text-[12px] font-medium"
                    style={{ background: "oklch(1 0 0 / 6%)", color: C.muted, border: `1px solid ${C.border}`, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting || deletePhrase.toLowerCase() !== "delete my account"}
                    className="flex-1 h-9 rounded-full text-[12px] font-semibold transition-opacity"
                    style={{
                      background: "oklch(0.52 0.15 24)",
                      color: "#fff",
                      border: "none",
                      cursor: deleting || deletePhrase.toLowerCase() !== "delete my account" ? "not-allowed" : "pointer",
                      opacity: deleting || deletePhrase.toLowerCase() !== "delete my account" ? 0.45 : 1,
                    }}
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </Section>

      </div>
    </div>
  );
}
