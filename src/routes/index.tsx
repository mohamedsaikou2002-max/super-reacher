import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  ChevronRight,
  Clipboard,
  Copy,
  Database,
  FileText,
  Globe2,
  Inbox,
  LayoutDashboard,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Menu,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Server,
  Settings,
  Shield,
  Terminal,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/Button";
import { createEmail, markets } from "@/lib/email-templates";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { queueScrapyWebsiteCrawls } from "@/lib/intelligence/scrapy-queue.functions";
import { REGISTRY_COUNTRY_SUMMARY, REGISTRY_SOURCE_CATALOG } from "@/lib/intelligence/registry";
import { createAgentJob, runAgentJob, checkEngineHealth } from "@/lib/engine.functions";
import { GlobalOutreachStudio } from "@/components/GlobalOutreachStudio";
import { BulkLeadImport } from "@/components/BulkLeadImport";
import { SourceResearchChat } from "@/components/SourceResearchChat";
import { BringYourOwnApi } from "@/components/BringYourOwnApi";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hyper Reacher — Global Outreach" },
      {
        name: "description",
        content:
          "Configurable global outreach, lead research and channel-specific workflow drafts for independent sales professionals.",
      },
      { property: "og:title", content: "Hyper Reacher" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: App,
});

/* ─────────────────────── Types ───────────────────────── */

type View =
  | "overview"
  | "leads"
  | "businesses"
  | "contacts"
  | "research"
  | "outreach"
  | "email_studio"
  | "inbox"
  | "agents"
  | "sources"
  | "integrations"
  | "security"
  | "logs"
  | "settings";

type Lead = {
  id: string;
  business_name: string;
  contact_name: string;
  email: string;
  phone: string;
  country_code: string;
  industry: string;
  status: string;
  created_at: string;
};

type Business = {
  id: string;
  business_name: string;
  country_code: string;
  region_code: string;
  industry: string;
  official_website: string | null;
  enrichment_status: string;
  outreach_eligibility: string;
  discovered_at: string;
};

type Job = {
  id: string;
  agent_type: string;
  status: string;
  result: string | null;
  error: string | null;
  provider_used: string | null;
  model_used: string | null;
  cost_usd: number | null;
  created_at: string;
  updated_at: string;
  payload: Record<string, unknown>;
};

/* ─────────────────────── Nav ─────────────────────────── */

const NAV: { id: View; label: string; icon: typeof LayoutDashboard; group?: string }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "leads", label: "Leads", icon: Users },
  { id: "businesses", label: "Businesses", icon: Building2 },
  { id: "contacts", label: "Contacts", icon: MessageSquare },
  { id: "research", label: "Research", icon: Brain },
  { id: "outreach", label: "Outreach", icon: Globe2 },
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "agents", label: "Agents", icon: Terminal },
];

/* ─────────────────────── Root App ────────────────────── */

function App() {
  const [view, setView] = useState<View>("overview");
  const [sidebar, setSidebar] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);

  /* Auth */
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.["email"] ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, s) =>
      setUserEmail(s?.user["email"] ?? null),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  /* Live data fetch */
  const refresh = useCallback(async () => {
    if (!userEmail) return;
    const [{ data: ld }, { data: bd }, { data: jd }] = await Promise.all([
      supabase.from("leads").select("*").order("created_at", { ascending: false }).limit(200),
      supabase
        .from("businesses")
        .select("*")
        .order("discovered_at", { ascending: false })
        .limit(200),
      supabase.from("jobs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    if (ld?.length) setLeads(ld as Lead[]);
    if (bd?.length) setBusinesses(bd as Business[]);
    if (jd?.length) setJobs(jd as Job[]);
  }, [userEmail]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /* Realtime */
  useEffect(() => {
    if (!userEmail) return;
    const ch = supabase
      .channel("dashboard-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leads" },
        () => void refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "businesses" },
        () => void refresh(),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => void refresh())
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [userEmail, refresh]);

  const navLabel = NAV.find((n) => n.id === view)?.label ?? "Overview";

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* ── Sidebar ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-border
          bg-sidebar transition-transform duration-200
          lg:relative lg:translate-x-0
          ${sidebar ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo */}
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border px-4">
          <div className="grid size-7 place-items-center rounded-md bg-primary">
            <Zap size={14} strokeWidth={2.5} className="text-primary-foreground" />
          </div>
          <div>
            <div className="text-[13px] font-bold tracking-wide text-foreground">HYPER REACHER</div>
            <div className="text-[9px] uppercase tracking-widest text-muted-foreground">
              Global Outreach Tool
            </div>
          </div>
          <button
            className="ml-auto text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setSidebar(false)}
            aria-label="Close sidebar"
          >
            <X size={15} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2" aria-label="Main navigation">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setView(id);
                setSidebar(false);
              }}
              className={`
                flex h-9 w-full items-center gap-2.5 rounded-md px-3 text-[13px] font-medium
                transition-colors mb-0.5
                ${
                  view === id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                }
              `}
            >
              <Icon size={15} className={view === id ? "text-primary" : ""} />
              {label}
              {id === "inbox" && (
                <span className="ml-auto rounded bg-primary/20 px-1.5 py-0.5 text-[9px] font-bold text-primary">
                  NEW
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 border-t border-border p-3">
          <div className="flex items-center gap-2.5 rounded-md p-2">
            <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/20 text-[11px] font-bold text-primary">
              {userEmail ? userEmail.slice(0, 2).toUpperCase() : "—"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-semibold text-foreground">
                {userEmail ?? "Guest workspace"}
              </div>
              <div className="text-[9px] text-muted-foreground">
                {userEmail ? "● Authenticated" : "Sign in to sync"}
              </div>
            </div>
            <button
              onClick={async () => (userEmail ? supabase.auth.signOut() : setAuthOpen(true))}
              className="text-muted-foreground hover:text-foreground"
              aria-label={userEmail ? "Sign out" : "Sign in"}
            >
              {userEmail ? <LogOut size={14} /> : <LogIn size={14} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Sidebar backdrop */}
      {sidebar && (
        <button
          className="fixed inset-0 z-40 bg-overlay lg:hidden"
          aria-label="Close sidebar"
          onClick={() => setSidebar(false)}
        />
      )}

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
          <button
            className="text-muted-foreground hover:text-foreground lg:hidden"
            aria-label="Open sidebar"
            onClick={() => setSidebar(true)}
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <h1 className="text-[13px] font-bold uppercase tracking-wide text-foreground">
              {navLabel}
            </h1>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-muted-foreground md:flex">
              <Search size={12} />
              <span>Search</span>
              <kbd className="text-[9px] opacity-60">⌘K</kbd>
            </div>

            <SystemStatusBadge userEmail={userEmail} />

            <CrawlButton />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1600px] p-5">
            {view === "overview" && (
              <ViewOverview
                leads={leads}
                businesses={businesses}
                jobs={jobs}
                userEmail={userEmail}
                onSignIn={() => setAuthOpen(true)}
              />
            )}
            {view === "leads" && (
              <ViewLeads
                leads={leads}
                setLeads={setLeads}
                userEmail={userEmail}
                onSignIn={() => setAuthOpen(true)}
              />
            )}
            {view === "businesses" && <ViewBusinesses businesses={businesses} />}
            {view === "contacts" && <ViewContacts userEmail={userEmail} />}
            {view === "research" && <ViewResearch userEmail={userEmail} />}
            {view === "outreach" && (
              <div className="space-y-5">
                <GlobalOutreachStudio userEmail={userEmail} />
                <ViewOutreach userEmail={userEmail} />
              </div>
            )}
            {view === "email_studio" && <ViewOutreach userEmail={userEmail} />}
            {view === "inbox" && <ViewInbox />}
            {view === "agents" && (
              <ViewAgents
                jobs={jobs}
                setJobs={setJobs}
                userEmail={userEmail}
                onSignIn={() => setAuthOpen(true)}
              />
            )}
            {view === "sources" && <ViewSources />}
            {view === "integrations" && <BringYourOwnApi userEmail={userEmail} />}
            {view === "security" && <ViewSecurity />}
            {view === "logs" && <ViewLogs jobs={jobs} />}
            {view === "settings" && (
              <ViewSettings userEmail={userEmail} onSignIn={() => setAuthOpen(true)} />
            )}
          </div>
        </main>
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SHARED COMPONENTS
══════════════════════════════════════════════════════════════ */

function SectionHeader({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  highlight,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: typeof LayoutDashboard;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${highlight ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
    >
      <div className="flex items-start justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        {Icon && (
          <Icon size={14} className={highlight ? "text-primary" : "text-muted-foreground"} />
        )}
      </div>
      <div className="mt-3 text-2xl font-bold text-foreground">{value}</div>
      {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function StatusBadge({ value }: { value: string }) {
  const label = value.replaceAll("_", " ");
  const cls =
    value === "succeeded" || value === "active" || value === "verified"
      ? "text-muted-foreground"
      : value === "failed" || value === "blacklisted" || value === "send_failed"
        ? "text-destructive"
        : value === "running" || value === "pending"
          ? "text-primary"
          : "text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

function EmptyState({
  title,
  sub,
  icon: Icon,
}: {
  title: string;
  sub?: string;
  icon?: typeof LayoutDashboard;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card px-8 py-16 text-center">
      {Icon && <Icon size={32} className="mb-4 text-muted-foreground/40" />}
      <div className="text-sm font-semibold text-foreground">{title}</div>
      {sub && <div className="mt-1 max-w-xs text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-surface-elevated ${className}`} />;
}

function DataTable<T extends Record<string, unknown>>({
  cols,
  rows,
  keyField,
}: {
  cols: { key: string; label: string; render?: (row: T) => ReactNode }[];
  rows: T[];
  keyField: string;
}) {
  if (rows.length === 0)
    return (
      <EmptyState
        title="No records found"
        sub="Data will appear here once the backend has records."
        icon={Database}
      />
    );
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[600px] text-left">
        <thead className="border-b border-border bg-surface">
          <tr>
            {cols.map((c) => (
              <th
                key={c.key}
                className="px-4 py-2.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground"
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={String(row[keyField])}
              className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors"
            >
              {cols.map((c) => (
                <td key={c.key} className="px-4 py-3 text-xs text-foreground">
                  {c.render ? c.render(row) : String(row[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SystemStatusBadge({ userEmail }: { userEmail: string | null }) {
  return (
    <div className="hidden items-center gap-1.5 rounded-md border border-border bg-surface px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:flex">
      {userEmail ? (
        <>
          <Wifi size={10} className="text-muted-foreground" /> OPERATIONAL
        </>
      ) : (
        <>
          <WifiOff size={10} /> OFFLINE
        </>
      )}
    </div>
  );
}

function CrawlButton() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handle() {
    setBusy(true);
    setMsg("");
    try {
      const r = await queueScrapyWebsiteCrawls();
      setMsg(
        `${r.queued} Scrapy job${r.queued !== 1 ? "s" : ""} queued; a running Scrapy worker is required`,
      );
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(""), 3000);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" size="sm" onClick={handle} disabled={busy}>
        <Globe2 size={13} />
        {busy ? "Queueing…" : "Queue Scrapy crawl"}
      </Button>
      {msg && <span className="text-[10px] text-muted-foreground">{msg}</span>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-border bg-popover p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit() {
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
    if (result.error) setMessage(result.error.message);
    else {
      setMessage(mode === "signup" ? "Check your inbox to confirm." : "Signed in.");
      if (mode === "signin") setTimeout(onClose, 500);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) setMessage(result.error.message);
  }

  return (
    <Modal title={mode === "signin" ? "Sign in" : "Create account"} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target["value"])} />
        </Field>
        <Field label="Password">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target["value"])}
          />
        </Field>
        {message && <p className="text-xs text-primary">{message}</p>}
        <Button className="w-full" onClick={submit}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </Button>
        <div className="flex items-center gap-3 text-[10px] uppercase text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button className="w-full" variant="secondary" onClick={google}>
          <Globe2 size={13} />
          Continue with Google
        </Button>
        <button
          className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "New here? Create account" : "Already have an account? Sign in"}
        </button>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: OVERVIEW
══════════════════════════════════════════════════════════════ */

function ViewOverview({
  leads,
  businesses,
  jobs,
  userEmail,
  onSignIn,
}: {
  leads: Lead[];
  businesses: Business[];
  jobs: Job[];
  userEmail: string | null;
  onSignIn: () => void;
}) {
  const qualifiedBiz = businesses.filter(
    (b) => b.outreach_eligibility === "eligible" || b.enrichment_status === "complete",
  ).length;
  const pending = leads.filter((l) => l.status === "pending").length;
  const activeJobs = jobs.filter((j) => j.status === "running").length;
  const failedJobs = jobs.filter((j) => j.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-card p-6">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(circle at top right, rgba(178,34,34,0.12), transparent 60%)",
          }}
        />
        <div className="relative">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
            ● EXECUTIVE OVERVIEW
          </div>
          <h2 className="text-2xl font-bold text-foreground">Super Reacher</h2>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Evidence-first AI business intelligence and outreach operations.
          </p>
          {!userEmail && (
            <div className="mt-4 flex items-center gap-3">
              <Button size="sm" onClick={onSignIn}>
                <LogIn size={13} />
                Sign in to connect
              </Button>
              <span className="text-xs text-muted-foreground">
                Demo data shown. Sign in to see live backend data.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Leads" value={leads.length || "—"} sub="in database" icon={Users} />
        <MetricCard
          label="Businesses"
          value={businesses.length || "—"}
          sub="discovered"
          icon={Building2}
        />
        <MetricCard
          label="Qualified"
          value={qualifiedBiz || "—"}
          sub="outreach eligible"
          icon={Zap}
          highlight
        />
        <MetricCard
          label="Active Jobs"
          value={activeJobs}
          sub={`${failedJobs} failed`}
          icon={Activity}
        />
      </div>

      {/* Registry coverage — real data */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Registry Coverage
            </div>
            <h3 className="mt-1 text-sm font-bold text-foreground">
              {REGISTRY_COUNTRY_SUMMARY.countries.join(" · ")}
            </h3>
          </div>
          <div className="rounded-md border border-border bg-surface px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
            {REGISTRY_COUNTRY_SUMMARY.totalSources} sources
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {[
            ["France", REGISTRY_COUNTRY_SUMMARY.franceSources],
            ["Germany", REGISTRY_COUNTRY_SUMMARY.germanySources],
            ["Italy", REGISTRY_COUNTRY_SUMMARY.italySources ?? 1],
            ["Canada", REGISTRY_COUNTRY_SUMMARY.canadaSources],
            ["Singapore", REGISTRY_COUNTRY_SUMMARY.singaporeSources],
            ["US States", REGISTRY_COUNTRY_SUMMARY.usStatesCovered],
          ].map(([c, n]) => (
            <div key={String(c)} className="rounded-md border border-border bg-surface p-3">
              <div className="text-[9px] uppercase text-muted-foreground">{c}</div>
              <div className="mt-1 text-lg font-bold text-foreground">{n}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 text-[10px] font-bold uppercase tracking-widest text-primary">
          Intelligence Pipeline
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ["Discovered", businesses.length],
            ["Enriched", businesses.filter((b) => b.enrichment_status === "complete").length],
            ["Eligible", businesses.filter((b) => b.outreach_eligibility === "eligible").length],
            ["In Review", businesses.filter((b) => b.outreach_eligibility === "review").length],
            ["Leads", leads.length],
            ["Pending", pending],
          ].map(([label, count], i, arr) => (
            <div key={String(label)} className="flex items-center gap-1.5">
              <div
                className={`rounded-md border px-3 py-2 text-center ${Number(count) > 0 ? "border-primary/30 bg-primary/5" : "border-border bg-surface"}`}
              >
                <div className="text-lg font-bold text-foreground">{count}</div>
                <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
              </div>
              {i < arr.length - 1 && <ChevronRight size={12} className="text-muted-foreground" />}
            </div>
          ))}
        </div>
      </div>

      {/* Recent jobs */}
      {jobs.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
            Recent Agent Jobs
          </div>
          <div className="space-y-1">
            {jobs.slice(0, 6).map((j) => (
              <div
                key={j.id}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-surface-hover"
              >
                <StatusBadge value={j.status} />
                <span className="text-xs text-muted-foreground capitalize">{j.agent_type}</span>
                {j.model_used && (
                  <span className="text-[10px] text-muted-foreground">{j.model_used}</span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {j["created_at"].slice(0, 10)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: LEADS
══════════════════════════════════════════════════════════════ */

function ViewLeads({
  leads,
  setLeads,
  userEmail,
  onSignIn,
}: {
  leads: Lead[];
  setLeads: (l: Lead[]) => void;
  userEmail: string | null;
  onSignIn: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    country_code: "US",
    industry: "",
  });

  async function add() {
    if (!form.business_name) return;
    const row: Lead = {
      ...form,
      id: crypto.randomUUID(),
      status: "pending",
      created_at: new Date().toISOString(),
    };
    if (userEmail) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("leads")
          .insert({ ...form, user_id: user.id, status: "pending" })
          .select()
          .single();
        if (data) setLeads([data as Lead, ...leads]);
      }
    } else {
      setLeads([row, ...leads]);
    }
    setOpen(false);
  }

  return (
    <div>
      <SectionHeader
        title="Lead Directory"
        sub={`${leads.length} records`}
        action={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus size={13} />
            Add lead
          </Button>
        }
      />
      {!userEmail && (
        <div className="mb-4 flex items-center gap-3 rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
          <AlertTriangle size={13} className="shrink-0 text-primary" />
          <span className="text-muted-foreground">Demo session — data is not persisted. </span>
          <button className="font-semibold text-primary hover:underline" onClick={onSignIn}>
            Sign in
          </button>
        </div>
      )}
      <BulkLeadImport userEmail={userEmail} onImported={(rows) => setLeads([...rows, ...leads])} />
      <DataTable<Lead>
        keyField="id"
        rows={leads}
        cols={[
          {
            key: "business_name",
            label: "Business",
            render: (r) => <span className="font-semibold">{r.business_name}</span>,
          },
          { key: "contact_name", label: "Contact" },
          { key: "country_code", label: "Market" },
          { key: "industry", label: "Industry" },
          { key: "status", label: "Status", render: (r) => <StatusBadge value={r.status} /> },
          {
            key: "created_at",
            label: "Added",
            render: (r) => (
              <span className="text-muted-foreground">{r["created_at"].slice(0, 10)}</span>
            ),
          },
        ]}
      />
      {open && (
        <Modal title="Add Lead" onClose={() => setOpen(false)}>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name">
              <input
                value={form.business_name}
                onChange={(e) => setForm({ ...form, business_name: e.target["value"] })}
              />
            </Field>
            <Field label="Contact name">
              <input
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target["value"] })}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                value={form["email"]}
                onChange={(e) => setForm({ ...form, email: e.target["value"] })}
              />
            </Field>
            <Field label="Phone">
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target["value"] })}
              />
            </Field>
            <Field label="Market">
              <select
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target["value"] })}
              >
                {markets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target["value"] })}
              />
            </Field>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={add}>
              Save lead
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: BUSINESSES
══════════════════════════════════════════════════════════════ */

function ViewBusinesses({ businesses }: { businesses: Business[] }) {
  return (
    <div>
      <SectionHeader title="Business Registry" sub={`${businesses.length} businesses discovered`} />
      <DataTable<Business>
        keyField="id"
        rows={businesses}
        cols={[
          {
            key: "business_name",
            label: "Business",
            render: (r) => <span className="font-semibold">{r.business_name}</span>,
          },
          { key: "country_code", label: "Country" },
          { key: "industry", label: "Industry" },
          {
            key: "enrichment_status",
            label: "Enrichment",
            render: (r) => <StatusBadge value={r.enrichment_status} />,
          },
          {
            key: "outreach_eligibility",
            label: "Eligibility",
            render: (r) => <StatusBadge value={r.outreach_eligibility} />,
          },
          {
            key: "official_website",
            label: "Website",
            render: (r) =>
              r.official_website ? (
                <a
                  href={r.official_website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {r.official_website.replace(/^https?:\/\//, "")}
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: "discovered_at",
            label: "Discovered",
            render: (r) => (
              <span className="text-muted-foreground">{r.discovered_at.slice(0, 10)}</span>
            ),
          },
        ]}
      />
      {businesses.length === 0 && (
        <div className="mt-4 rounded-md border border-border bg-surface p-4 text-xs text-muted-foreground">
          No businesses yet. Use the registry sources to start discovery, or add leads manually.
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: CONTACTS
══════════════════════════════════════════════════════════════ */

function ViewContacts({ userEmail }: { userEmail: string | null }) {
  const [contacts, setContacts] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    supabase
      .from("contacts")
      .select(
        "id, full_name, role, email, phone, verification_status, outreach_status, created_at, businesses(business_name)",
      )
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setContacts(data as Record<string, unknown>[]);
        setLoading(false);
      });
  }, [userEmail]);

  if (!userEmail) return <EmptyState title="Sign in to view contacts" icon={Users} />;
  if (loading)
    return (
      <div className="space-y-2">
        {Array(6)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
      </div>
    );

  return (
    <div>
      <SectionHeader title="Contact Intelligence" sub={`${contacts.length} contacts`} />
      <DataTable
        keyField="id"
        rows={contacts}
        cols={[
          {
            key: "full_name",
            label: "Person",
            render: (r) => <span className="font-semibold">{String(r["full_name"] || "—")}</span>,
          },
          { key: "role", label: "Role" },
          {
            key: "email",
            label: "Email",
            render: (r) => (
              <span className="font-mono text-[11px]">{String(r["email"] || "—")}</span>
            ),
          },
          { key: "phone", label: "Phone" },
          {
            key: "verification_status",
            label: "Verification",
            render: (r) => <StatusBadge value={String(r["verification_status"] || "unknown")} />,
          },
          {
            key: "outreach_status",
            label: "Outreach",
            render: (r) => <StatusBadge value={String(r["outreach_status"] || "review")} />,
          },
        ]}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: RESEARCH
══════════════════════════════════════════════════════════════ */

function ViewResearch({ userEmail }: { userEmail: string | null }) {
  const [evidence, setEvidence] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) {
      setLoading(false);
      return;
    }
    supabase
      .from("research_evidence")
      .select("id, field, value, source_url, confidence, retrieved_at, businesses(business_name)")
      .order("retrieved_at", { ascending: false })
      .limit(200)
      .then(({ data }) => {
        if (data) setEvidence(data as Record<string, unknown>[]);
        setLoading(false);
      });
  }, [userEmail]);

  if (!userEmail) return <EmptyState title="Sign in to view research" icon={Brain} />;
  if (loading)
    return (
      <div className="space-y-2">
        {Array(5)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
      </div>
    );

  return (
    <div>
      <SectionHeader title="Research Evidence" sub={`${evidence.length} evidence records`} />
      <div className="mb-5">
        <SourceResearchChat userEmail={userEmail} />
      </div>
      <DataTable
        keyField="id"
        rows={evidence}
        cols={[
          {
            key: "field",
            label: "Field",
            render: (r) => <span className="font-mono text-[11px]">{String(r["field"])}</span>,
          },
          {
            key: "value",
            label: "Value",
            render: (r) => <span className="max-w-xs truncate block">{String(r["value"])}</span>,
          },
          {
            key: "confidence",
            label: "Confidence",
            render: (r) => <StatusBadge value={String(r["confidence"] || "unknown")} />,
          },
          {
            key: "source_url",
            label: "Source",
            render: (r) =>
              r["source_url"] ? (
                <a
                  href={String(r["source_url"])}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-[10px] hover:underline"
                >
                  [link]
                </a>
              ) : (
                <span className="text-muted-foreground">—</span>
              ),
          },
          {
            key: "retrieved_at",
            label: "Retrieved",
            render: (r) => (
              <span className="text-muted-foreground">
                {String(r["retrieved_at"] || "").slice(0, 10)}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: OUTREACH (Email Studio)
══════════════════════════════════════════════════════════════ */

function ViewOutreach({ userEmail }: { userEmail: string | null }) {
  const [form, setForm] = useState({
    business: "",
    contact: "",
    sender: "",
    country: "US",
    industry: "",
  });
  const [generated, setGenerated] = useState<{ subject: string; html: string } | null>(null);
  const [copied, setCopied] = useState("");

  function generate() {
    if (!form.business) return;
    setGenerated(createEmail(form));
  }

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      /* fallback */
    }
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  }

  async function save() {
    if (!userEmail || !generated) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("email_templates").insert({
        user_id: user.id,
        name: `${form.business} intro`,
        country_code: form.country,
        industry: form.industry,
        subject: generated.subject,
        html_content: generated.html,
      });
      setCopied("saved");
      setTimeout(() => setCopied(""), 2000);
    }
  }

  return (
    <div>
      <SectionHeader title="Email Composer" sub="Generate localized outreach email" />
      <div className="grid gap-5 xl:grid-cols-[minmax(320px,0.7fr)_minmax(420px,1.3fr)]">
        {/* Left: controls */}
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business">
              <input
                value={form.business}
                placeholder="Acme Corp"
                onChange={(e) => setForm({ ...form, business: e.target["value"] })}
              />
            </Field>
            <Field label="Contact">
              <input
                value={form.contact}
                placeholder="First name"
                onChange={(e) => setForm({ ...form, contact: e.target["value"] })}
              />
            </Field>
            <Field label="Market">
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target["value"] })}
              >
                {markets.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name} — {m.language}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Industry">
              <input
                value={form.industry}
                placeholder="Dental, HVAC…"
                onChange={(e) => setForm({ ...form, industry: e.target["value"] })}
              />
            </Field>
          </div>
          <Field label="Sender name">
            <input
              value={form.sender}
              placeholder="Your name + company"
              onChange={(e) => setForm({ ...form, sender: e.target["value"] })}
            />
          </Field>
          <div className="flex gap-2 pt-1">
            <Button className="flex-1" onClick={generate}>
              <Zap size={13} /> Generate email
            </Button>
            {generated && (
              <Button variant="secondary" onClick={save}>
                {copied === "saved" ? (
                  "Saved!"
                ) : (
                  <>
                    <Clipboard size={13} /> Save
                  </>
                )}
              </Button>
            )}
          </div>

          {generated && (
            <div className="space-y-2 pt-2 border-t border-border">
              <div className="flex items-center justify-between text-[10px] uppercase text-muted-foreground font-bold">
                <span>Subject</span>
                <button
                  onClick={() => copy(generated.subject, "subject")}
                  className="hover:text-foreground"
                >
                  <Copy size={11} />
                </button>
              </div>
              <p className="text-xs text-foreground">{generated.subject}</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full mt-2"
                onClick={() => copy(generated.html, "html")}
              >
                {copied === "html" ? (
                  "Copied!"
                ) : (
                  <>
                    <Copy size={12} /> Copy HTML
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Right: preview */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="flex h-9 items-center gap-2 border-b border-border bg-surface px-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Email Preview
            </span>
            {generated && (
              <span className="ml-auto text-[10px] text-muted-foreground">
                {generated.html.length} chars
              </span>
            )}
          </div>
          {generated ? (
            <iframe
              title="Email preview"
              className="h-[520px] w-full border-0 bg-white"
              srcDoc={generated.html}
              sandbox=""
            />
          ) : (
            <EmptyState
              title="No preview yet"
              sub="Fill in the form and click Generate email."
              icon={Mail}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: INBOX
══════════════════════════════════════════════════════════════ */

function ViewInbox() {
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("outreach_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) setEvents(data as Record<string, unknown>[]);
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="space-y-2">
        {Array(4)
          .fill(0)
          .map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
      </div>
    );

  return (
    <div>
      <SectionHeader title="Reply Inbox" sub="Inbound events and classified replies" />
      {events.length === 0 ? (
        <EmptyState
          title="Inbox is empty"
          sub="Replies and inbound events will appear here once outreach has been sent."
          icon={Inbox}
        />
      ) : (
        <DataTable
          keyField="id"
          rows={events}
          cols={[
            {
              key: "event_type",
              label: "Event",
              render: (r) => <StatusBadge value={String(r["event_type"])} />,
            },
            { key: "channel", label: "Channel" },
            { key: "provider", label: "Provider" },
            {
              key: "created_at",
              label: "Time",
              render: (r) => (
                <span className="text-muted-foreground">
                  {String(r["created_at"] || "").slice(0, 16)}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: AGENTS (Grok Executive Center)
══════════════════════════════════════════════════════════════ */

function ViewAgents({
  jobs,
  setJobs,
  userEmail,
  onSignIn,
}: {
  jobs: Job[];
  setJobs: (j: Job[]) => void;
  userEmail: string | null;
  onSignIn: () => void;
}) {
  const [input, setInput] = useState("");
  const [agentType, setAgentType] = useState<"research" | "outreach" | "coding" | "creative">(
    "research",
  );
  const [model, setModel] = useState("llama-3.1-8b-instant");
  const [busy, setBusy] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [health, setHealth] = useState<Record<
    string,
    { healthy: boolean; detail: string; tier: string }
  > | null>(null);

  useEffect(() => {
    checkEngineHealth()
      .then((h) => setHealth(h.providers as never))
      .catch(() => {});
  }, []);

  async function submit() {
    if (!input.trim() || !userEmail) {
      if (!userEmail) onSignIn();
      return;
    }
    setBusy(true);
    try {
      const { id } = await createAgentJob({
        data: { agent_type: agentType, prompt: input, model },
      });
      setActiveJobId(id);
      setInput("");
      const result = await runAgentJob({ data: { jobId: id } });
      // Refresh jobs list
      const { data } = await supabase
        .from("jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setJobs(data as Job[]);
    } catch (e) {
      console.error("Agent job failed:", e);
    } finally {
      setBusy(false);
    }
  }

  const AGENT_MODELS = [
    { id: "llama-3.1-8b-instant", label: "Groq — Llama 3.1 8B (fast)" },
    { id: "openai/gpt-6-astra", label: "Lovable — GPT-6 Astra" },
    // Gemini model adapter is not yet connected; do not display it as functional.
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      {/* Grok Executive Terminal */}
      <div className="flex flex-col rounded-xl border border-border bg-card overflow-hidden">
        {/* Terminal header */}
        <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-4">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-destructive/60" />
            <span className="size-2.5 rounded-full bg-status-warn/60" />
            <span className="size-2.5 rounded-full bg-border" />
          </div>
          <span className="ml-2 text-[10px] font-bold uppercase tracking-widest text-primary">
            Agent Terminal
          </span>
          <div className="ml-auto flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="size-1.5 rounded-full bg-muted-foreground" />
            {userEmail ? "CONNECTED" : "OFFLINE"}
          </div>
        </div>

        {/* Job history */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {jobs.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <Terminal size={28} className="mb-3 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">No jobs yet.</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Submit a task below to start.
              </p>
            </div>
          ) : (
            jobs.slice(0, 20).map((j) => (
              <div
                key={j.id}
                className={`rounded-lg border p-3 text-xs ${j.id === activeJobId ? "border-primary/40 bg-primary/5" : "border-border bg-surface"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge value={j.status} />
                  <span className="text-muted-foreground capitalize">{j.agent_type}</span>
                  {j.model_used && (
                    <span className="text-muted-foreground text-[10px]">• {j.model_used}</span>
                  )}
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {j["created_at"].slice(11, 16)}
                  </span>
                </div>
                {typeof j.payload?.["prompt"] === "string" && (
                  <div className="text-muted-foreground text-[11px] truncate">
                    {String(j.payload["prompt"]).slice(0, 120)}
                  </div>
                )}
                {j.result && (
                  <div className="mt-2 text-[11px] text-foreground border-t border-border pt-2 line-clamp-3">
                    {j.result}
                  </div>
                )}
                {j.error && (
                  <div className="mt-2 text-[11px] text-destructive border-t border-border pt-2">
                    {j.error}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-border bg-surface p-3">
          <div className="mb-2 flex gap-2">
            <select
              value={agentType}
              onChange={(e) => setAgentType(e.target["value"] as typeof agentType)}
              className="h-7 flex-1 text-[11px]"
            >
              <option value="research">Research</option>
              <option value="outreach">Outreach</option>
              <option value="coding">Coding</option>
              <option value="creative">Creative</option>
            </select>
            <select
              value={model}
              onChange={(e) => setModel(e.target["value"])}
              className="h-7 flex-1 text-[11px]"
            >
              {AGENT_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              className="flex-1 h-9 text-[12px]"
              placeholder={userEmail ? "Give the agent a task…" : "Sign in to run agents"}
              value={input}
              onChange={(e) => setInput(e.target["value"])}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
              disabled={busy || !userEmail}
            />
            <Button size="sm" onClick={submit} disabled={busy || !input.trim() || !userEmail}>
              {busy ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
            </Button>
          </div>
          {!userEmail && (
            <p className="mt-2 text-[10px] text-muted-foreground">
              <button onClick={onSignIn} className="text-primary hover:underline">
                Sign in
              </button>{" "}
              to run agent jobs.
            </p>
          )}
        </div>
      </div>

      {/* Right panel: capabilities + health */}
      <div className="space-y-4">
        {/* Provider health */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
            Provider Configuration
          </div>
          {health ? (
            <div className="space-y-2">
              {Object.entries(health).map(([name, info]) => (
                <div key={name} className="flex items-center gap-2">
                  <span
                    className={`size-1.5 rounded-full ${info.healthy ? "bg-muted-foreground" : "bg-destructive"}`}
                  />
                  <span className="text-xs font-semibold capitalize text-foreground">{name}</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{info.tier}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array(3)
                .fill(0)
                .map((_, i) => (
                  <Skeleton key={i} className="h-6 w-full" />
                ))}
            </div>
          )}
        </div>

        {/* Agent capabilities */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
            Agent Capabilities
          </div>
          <div className="space-y-1.5">
            {[
              ["Lead discovery", true],
              ["Business research", true],
              ["Website crawling", true],
              ["Contact extraction", true],
              ["Apollo enrichment adapter", false],
              ["Hunter enrichment adapter", false],
              ["Groq inference (configure key)", Boolean(health?.["groq"]?.healthy)],
              ["Lovable AI gateway", Boolean(health?.["lovable"]?.healthy)],
              ["Database queries", true],
              ["Draft generation", true],
              ["Outbound SEND (manual only)", false],
            ].map(([label, enabled]) => (
              <div key={String(label)} className="flex items-center gap-2 text-xs">
                <span
                  className={`size-1.5 shrink-0 rounded-full ${enabled ? "bg-muted-foreground" : "bg-border"}`}
                />
                <span className={enabled ? "text-foreground" : "text-muted-foreground"}>
                  {String(label)}
                </span>
                {!enabled && (
                  <span className="ml-auto text-[9px] font-bold uppercase text-destructive/60">
                    RESTRICTED
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Security note */}
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-start gap-2">
            <Lock size={13} className="mt-0.5 shrink-0 text-primary" />
            <div className="text-[11px] text-muted-foreground">
              Agents generate content only. Outbound dispatch requires human approval and passes
              through the security gateway.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: SOURCES
══════════════════════════════════════════════════════════════ */

function ViewSources() {
  const [filter, setFilter] = useState("");
  const filtered = REGISTRY_SOURCE_CATALOG.filter(
    (s) =>
      !filter ||
      s.country.toLowerCase().includes(filter.toLowerCase()) ||
      s.source_name.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <SectionHeader
        title="Source Registry"
        sub={`${REGISTRY_SOURCE_CATALOG.length} configured sources across ${REGISTRY_COUNTRY_SUMMARY.countries.length} countries`}
      />
      <div className="mb-4">
        <input
          className="max-w-sm h-8 text-[12px]"
          placeholder="Filter by country or source name…"
          value={filter}
          onChange={(e) => setFilter(e.target["value"])}
        />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 60).map((s) => (
          <div key={s.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {s.country}
                  {s.state ? ` · ${s.state}` : ""}
                </div>
                <div className="mt-0.5 text-xs font-semibold text-foreground truncate">
                  {s.source_name}
                </div>
              </div>
              <StatusBadge value={s.crawl_status} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {s.source_type}
              </span>
              <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-muted-foreground">
                {s.robots_status} robots
              </span>
              {s.authentication_required && (
                <span className="rounded border border-border px-1.5 py-0.5 text-[9px] text-primary">
                  auth required
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {filtered.length > 60 && (
        <p className="mt-3 text-[11px] text-muted-foreground">
          Showing 60 of {filtered.length}. Use the filter to narrow results.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: INTEGRATIONS
══════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════
   VIEW: SECURITY
══════════════════════════════════════════════════════════════ */

function ViewSecurity() {
  const OUTBOUND_DISABLED = true; // No live dispatch implemented in this release. Never claim an outbound gateway is active.

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Security Center"
        sub="Outbound controls, suppression, and system gates"
      />

      {/* Kill switch status */}
      <div
        className={`rounded-xl border p-5 ${OUTBOUND_DISABLED ? "border-destructive/40 bg-destructive/5" : "border-border bg-card"}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              Outbound Status
            </div>
            <div
              className={`text-2xl font-bold ${OUTBOUND_DISABLED ? "text-destructive" : "text-foreground"}`}
            >
              {OUTBOUND_DISABLED ? "DISABLED" : "ENABLED"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {OUTBOUND_DISABLED
                ? "No live dispatch adapter is enabled in this release. Draft generation remains available."
                : "Dispatch requires a separately audited provider implementation."}
            </p>
          </div>
          <div
            className={`grid size-12 place-items-center rounded-xl ${OUTBOUND_DISABLED ? "bg-destructive/20" : "bg-surface"}`}
          >
            {OUTBOUND_DISABLED ? (
              <WifiOff size={20} className="text-destructive" />
            ) : (
              <Wifi size={20} className="text-muted-foreground" />
            )}
          </div>
        </div>
        <div className="mt-4 text-[10px] text-muted-foreground border-t border-border pt-3">
          This build does not contain a production sending gateway. Review and copy drafts manually;
          do not rely on a UI indicator as an enforcement control.
        </div>
      </div>

      {/* Security gates */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
          Security Gates
        </div>
        <div className="space-y-2">
          {[
            [
              "Draft-only outbound",
              "ENFORCED",
              "No sending adapters are configured in this release",
            ],
            [
              "Human message review",
              "REQUIRED",
              "Review generated drafts before any manual delivery",
            ],
            [
              "Suppression list",
              "AVAILABLE",
              "Keep suppression data updated before manually reaching out",
            ],
            ["Sender permissions", "REQUIRED", "Verify workplace authorization and platform rules"],
            [
              "Rate limiting",
              "NOT IMPLEMENTED",
              "Apply provider-level controls before enabling real dispatch",
            ],
            [
              "Provider credentials",
              "SERVER",
              "BYO API keys use server-only AES-GCM encryption with a private vault key",
            ],
          ].map(([gate, status, desc]) => (
            <div
              key={String(gate)}
              className="flex items-start gap-3 rounded-md border border-border p-3"
            >
              <span
                className={`mt-0.5 text-[9px] font-bold uppercase shrink-0 ${status === "ENFORCED" || status === "SERVER" ? "text-muted-foreground" : "text-primary"}`}
              >
                {status === "ENFORCED" || status === "SERVER" ? "✓" : "~"} {String(status)}
              </span>
              <div>
                <div className="text-xs font-semibold text-foreground">{String(gate)}</div>
                <div className="text-[10px] text-muted-foreground">{String(desc)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Suppression database */}
      <SuppressionPanel />
    </div>
  );
}

function SuppressionPanel() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    supabase
      .from("suppressions")
      .select("id", { count: "exact", head: true })
      .then(({ count: c }) => {
        if (c !== null) setCount(c);
      });
  }, []);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-primary">
        Suppression Database
      </div>
      <div className="text-2xl font-bold text-foreground">{count ?? "—"}</div>
      <div className="text-xs text-muted-foreground mt-1">suppressed addresses/phones</div>
      <p className="mt-3 text-[11px] text-muted-foreground border-t border-border pt-3">
        STOP / unsubscribe signals are added immediately and permanently block future outreach on
        all channels.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: SYSTEM LOGS
══════════════════════════════════════════════════════════════ */

function ViewLogs({ jobs }: { jobs: Job[] }) {
  return (
    <div>
      <SectionHeader title="System Logs" sub="Agent job history and execution records" />
      {jobs.length === 0 ? (
        <EmptyState
          title="No logs yet"
          sub="Agent jobs and system events will appear here."
          icon={FileText}
        />
      ) : (
        <div className="space-y-1.5 font-mono text-[11px]">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-start gap-3 rounded-md border border-border bg-card px-4 py-2.5 hover:bg-surface-hover"
            >
              <span className="text-muted-foreground/60 shrink-0">
                {j["created_at"].slice(0, 19).replace("T", " ")}
              </span>
              <StatusBadge value={j.status} />
              <span className="text-muted-foreground capitalize shrink-0">{j.agent_type}</span>
              {j.model_used && <span className="text-muted-foreground/60">{j.model_used}</span>}
              {j.cost_usd != null && (
                <span className="ml-auto text-muted-foreground/60">\${j.cost_usd.toFixed(4)}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   VIEW: SETTINGS
══════════════════════════════════════════════════════════════ */

function ViewSettings({ userEmail, onSignIn }: { userEmail: string | null; onSignIn: () => void }) {
  return (
    <div className="max-w-2xl space-y-5">
      <SectionHeader title="Settings" />

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
          Account
        </div>
        {userEmail ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                {userEmail.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{userEmail}</div>
                <div className="text-[10px] text-muted-foreground">Authenticated via Supabase</div>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={() => supabase.auth.signOut()}>
              <LogOut size={13} /> Sign out
            </Button>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-xs text-muted-foreground">
              Sign in to sync your workspace to the cloud and enable backend operations.
            </p>
            <Button size="sm" onClick={onSignIn}>
              <LogIn size={13} /> Sign in
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-widest text-primary">
          Environment
        </div>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Supabase</span>
            <span className="text-foreground">{userEmail ? "Connected" : "Unauthenticated"}</span>
          </div>
          <div className="flex justify-between">
            <span>Framework</span>
            <span className="text-foreground">TanStack Start</span>
          </div>
          <div className="flex justify-between">
            <span>Registry sources</span>
            <span className="text-foreground">{REGISTRY_SOURCE_CATALOG.length}</span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-[11px] text-muted-foreground">
        <Lock size={12} className="inline mr-1.5 text-primary" />
        Set your own credentials from Integrations. The server encrypts BYO API keys with
        INTEGRATION_VAULT_KEY. Keys are never rendered back to the browser.
      </div>
    </div>
  );
}
