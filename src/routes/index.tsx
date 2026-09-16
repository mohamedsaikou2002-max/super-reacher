import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowUpRight, Check, Clipboard, Copy,
  Gauge, Globe2, Inbox, LayoutDashboard, LogIn, LogOut, Mail, Menu, MessageSquareText,
  MoreHorizontal, Play, Plus, Search, Send, Settings, Sparkles, Target, Users, X,
} from "lucide-react";
import { Button } from "@/components/Button";
import { createEmail, markets } from "@/lib/email-templates";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Super Reacher — Outreach Workspace" },
    { name: "description", content: "Create localized SMS and HTML email outreach, organize leads, and track replies in one focused workspace." },
    { property: "og:title", content: "Super Reacher — Outreach Workspace" },
    { property: "og:description", content: "Localized outreach, copy-ready HTML emails, and lead tracking in one workspace." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: SuperReacher,
});

type View = "overview" | "campaigns" | "leads" | "messages" | "studio";
type Lead = { id: string; business_name: string; contact_name: string; email: string; phone: string; country_code: string; industry: string; status: string; created_at: string };

const demoLeads: Lead[] = [
  { id: "1", business_name: "Northline Dental", contact_name: "Mia Chen", email: "mia@northline.example", phone: "+65 8123 4490", country_code: "SG", industry: "Dental", status: "positive_reply", created_at: "2026-09-16" },
  { id: "2", business_name: "Maison Lune", contact_name: "Élodie Martin", email: "elodie@maisonlune.example", phone: "+33 6 12 34 56 78", country_code: "FR", industry: "Hospitality", status: "sent", created_at: "2026-09-16" },
  { id: "3", business_name: "Harbour Physio", contact_name: "Jack Turner", email: "jack@harbour.example", phone: "+61 412 883 201", country_code: "AU", industry: "Healthcare", status: "replied_unclear", created_at: "2026-09-15" },
  { id: "4", business_name: "Studio Verde", contact_name: "Giulia Conti", email: "giulia@studioverde.example", phone: "+39 333 901 1722", country_code: "IT", industry: "Wellness", status: "pending", created_at: "2026-09-15" },
];

const nav = [
  { id: "overview" as const, label: "Overview", icon: LayoutDashboard },
  { id: "campaigns" as const, label: "Campaigns", icon: Target },
  { id: "leads" as const, label: "Leads", icon: Users },
  { id: "messages" as const, label: "Messages", icon: Inbox },
  { id: "studio" as const, label: "Email studio", icon: Mail },
];

function SuperReacher() {
  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [leads, setLeads] = useState<Lead[]>(demoLeads);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUserEmail(session?.user.email ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!userEmail) return;
    supabase.from("leads").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      if (data?.length) setLeads(data as Lead[]);
    });
  }, [userEmail]);

  const title = nav.find((item) => item.id === view)?.label ?? "Overview";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 w-60 border-r border-sidebar-border bg-sidebar transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-5">
          <div className="grid size-8 place-items-center rounded-md bg-brand-gradient text-primary-foreground"><ArrowUpRight size={18} strokeWidth={3} /></div>
          <div><div className="font-display text-[15px] font-bold">SUPER REACHER</div><div className="text-[10px] uppercase text-muted-foreground">Outreach system</div></div>
          <Button className="ml-auto lg:hidden" size="icon" variant="ghost" aria-label="Close menu" onClick={() => setMenuOpen(false)}><X size={17} /></Button>
        </div>
        <nav className="space-y-1 p-3" aria-label="Main navigation">
          {nav.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => { setView(id); setMenuOpen(false); }} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${view === id ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"}`}><Icon size={17} />{label}{id === "messages" && <span className="ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">3</span>}</button>)}
        </nav>
        <div className="absolute inset-x-3 bottom-3 border-t border-sidebar-border pt-3">
          <button className="flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><Settings size={17} />Settings</button>
          <div className="mt-2 flex items-center gap-3 px-3 py-2">
            <div className="grid size-8 place-items-center rounded-full bg-brand-gradient text-xs font-bold text-primary-foreground">SR</div>
            <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{userEmail ?? "Demo workspace"}</div><div className="text-[10px] text-muted-foreground">{userEmail ? "Cloud connected" : "Sign in to sync"}</div></div>
            <button aria-label={userEmail ? "Sign out" : "Sign in"} className="text-muted-foreground hover:text-foreground" onClick={async () => userEmail ? supabase.auth.signOut() : setAuthOpen(true)}>{userEmail ? <LogOut size={15} /> : <LogIn size={15} />}</button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-background/90 px-4 backdrop-blur md:px-7">
          <Button className="lg:hidden" size="icon" variant="ghost" aria-label="Open menu" onClick={() => setMenuOpen(true)}><Menu size={19} /></Button>
          <div className="min-w-0"><h1 className="truncate font-display text-base font-bold">{title}</h1><p className="hidden text-xs text-muted-foreground sm:block">Reach the right business with the right message.</p></div>
          <div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-md border border-border bg-secondary px-3 py-2 text-xs text-muted-foreground md:flex"><Search size={14} /><span>Search leads</span><kbd className="text-[10px]">⌘K</kbd></div><Button size="sm" onClick={() => setView("studio")}><Sparkles size={14} />Create outreach</Button></div>
        </header>
        <main className="mx-auto max-w-[1440px] p-4 md:p-7">
          {view === "overview" && <Overview onCreate={() => setView("studio")} leads={leads} />}
          {view === "campaigns" && <Campaigns onCreate={() => setView("studio")} />}
          {view === "leads" && <Leads leads={leads} setLeads={setLeads} userEmail={userEmail} onSignIn={() => setAuthOpen(true)} />}
          {view === "messages" && <Messages />}
          {view === "studio" && <EmailStudio userEmail={userEmail} onSignIn={() => setAuthOpen(true)} />}
        </main>
      </div>
      {menuOpen && <button className="fixed inset-0 z-30 bg-overlay lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)} />}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </div>
  );
}

function Stat({ label, value, change, icon }: { label: string; value: string; change: string; icon: ReactNode }) {
  return <div className="border border-border bg-card p-4"><div className="flex items-start justify-between text-muted-foreground"><span className="text-xs font-medium">{label}</span>{icon}</div><div className="mt-4 flex items-end justify-between"><strong className="font-display text-2xl">{value}</strong><span className="text-xs font-semibold text-success">{change}</span></div></div>;
}

function Overview({ onCreate, leads }: { onCreate: () => void; leads: Lead[] }) {
  return <div className="space-y-7">
    <section className="grid gap-5 border-b border-border pb-7 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,.5fr)]">
      <div><div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-primary"><span className="size-2 rounded-full bg-primary shadow-brand" />Live workspace</div><h2 className="max-w-3xl font-display text-3xl font-semibold leading-tight md:text-5xl">Turn cold outreach into<br/><span className="text-gradient">warm conversations.</span></h2><p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground">Localized campaigns across email and SMS, with every reply sorted so your team knows exactly who to call next.</p><div className="mt-6 flex gap-2"><Button onClick={onCreate}><Plus size={16} />New campaign</Button><Button variant="secondary"><Play size={15} />Resume campaign</Button></div></div>
      <div className="border border-border bg-panel p-5"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase text-muted-foreground">This week</span><MoreHorizontal size={17} className="text-muted-foreground" /></div><div className="mt-5 text-4xl font-semibold">18.4%</div><div className="mt-1 text-xs text-muted-foreground">Positive reply rate</div><div className="mt-6 flex h-24 items-end gap-2">{[34,52,44,68,57,82,74].map((height, i) => <div key={i} className="flex-1 bg-chart-muted" style={{ height: `${height}%` }}><div className={`h-full bg-brand-gradient ${i === 5 ? "opacity-100" : "opacity-40"}`} /></div>)}</div><div className="mt-2 flex justify-between text-[9px] text-muted-foreground"><span>MON</span><span>SUN</span></div></div>
    </section>
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat label="Total leads" value="1,248" change="+12.5%" icon={<Users size={16}/>} /><Stat label="Messages sent" value="3,680" change="+8.2%" icon={<Send size={16}/>} /><Stat label="Replies" value="412" change="+24.1%" icon={<MessageSquareText size={16}/>} /><Stat label="Booked calls" value="76" change="+16.4%" icon={<Target size={16}/>} /></section>
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]"><div><div className="mb-3 flex items-center justify-between"><h3 className="font-display text-lg font-semibold">Recent leads</h3><button className="text-xs font-semibold text-primary">View all</button></div><LeadTable leads={leads.slice(0, 4)} /></div><div><h3 className="mb-3 font-display text-lg font-semibold">Campaign health</h3><div className="border border-border bg-card p-5"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-md bg-primary-soft text-primary"><Gauge size={19}/></div><div><div className="text-sm font-semibold">System operating normally</div><div className="text-xs text-muted-foreground">3 active campaigns</div></div></div><div className="mt-6 space-y-4">{[["Email deliverability","98.2%"],["SMS delivery","96.8%"],["Reply classification","99.4%"]].map(([a,b])=><div key={a}><div className="mb-1.5 flex justify-between text-xs"><span className="text-muted-foreground">{a}</span><strong>{b}</strong></div><div className="h-1.5 bg-muted"><div className="h-full w-[97%] bg-brand-gradient"/></div></div>)}</div></div></div></section>
  </div>;
}

function Status({ value }: { value: string }) { const label = value.replaceAll("_", " "); return <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase ${value === "positive_reply" || value === "active" ? "text-success" : value === "send_failed" || value === "blacklisted" ? "text-destructive" : "text-muted-foreground"}`}><span className="size-1.5 rounded-full bg-current" />{label}</span>; }
function LeadTable({ leads }: { leads: Lead[] }) { return <div className="overflow-x-auto border border-border bg-card"><table className="w-full min-w-[680px] text-left"><thead className="border-b border-border bg-secondary text-[10px] uppercase text-muted-foreground"><tr><th className="px-4 py-3">Business</th><th className="px-4 py-3">Market</th><th className="px-4 py-3">Industry</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Added</th></tr></thead><tbody>{leads.map(l=><tr key={l.id} className="border-b border-border last:border-0 hover:bg-accent"><td className="px-4 py-3"><div className="text-xs font-semibold">{l.business_name}</div><div className="text-[11px] text-muted-foreground">{l.contact_name}</div></td><td className="px-4 py-3 text-xs">{l.country_code}</td><td className="px-4 py-3 text-xs text-muted-foreground">{l.industry}</td><td className="px-4 py-3"><Status value={l.status}/></td><td className="px-4 py-3 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>; }

function Campaigns({ onCreate }: { onCreate: () => void }) { const data=[{n:"Dental growth — Singapore",c:"Email + SMS",s:"active",sent:"842",r:"21.4%"},{n:"Boutique hotels — France",c:"Email",s:"active",sent:"616",r:"17.8%"},{n:"Wellness studios — Italy",c:"Email",s:"paused",sent:"391",r:"12.2%"}]; return <section><div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div><h2 className="font-display text-2xl font-semibold">Campaigns</h2><p className="text-sm text-muted-foreground">Manage localized sequences across every market.</p></div><Button onClick={onCreate}><Plus size={15}/>New campaign</Button></div><div className="grid gap-3">{data.map((x,i)=><div key={x.n} className="grid gap-4 border border-border bg-card p-5 md:grid-cols-[minmax(0,1fr)_110px_100px_90px_auto] md:items-center"><div><div className="font-semibold">{x.n}</div><div className="mt-1 text-xs text-muted-foreground">{x.c} · Last activity {i+1}h ago</div></div><Status value={x.s}/><div><div className="text-sm font-semibold">{x.sent}</div><div className="text-[10px] uppercase text-muted-foreground">Sent</div></div><div><div className="text-sm font-semibold">{x.r}</div><div className="text-[10px] uppercase text-muted-foreground">Replies</div></div><Button variant="ghost" size="icon" aria-label="Campaign menu"><MoreHorizontal size={17}/></Button></div>)}</div></section>; }

function Leads({ leads, setLeads, userEmail, onSignIn }: { leads: Lead[]; setLeads: (l: Lead[])=>void; userEmail: string|null; onSignIn:()=>void }) { const [open,setOpen]=useState(false); const [form,setForm]=useState({business_name:"",contact_name:"",email:"",phone:"",country_code:"SG",industry:"Dental"}); async function add(){if(!form.business_name)return; const row={...form,id:crypto.randomUUID(),status:"pending",created_at:new Date().toISOString()}; if(userEmail){const {data:{user}}=await supabase.auth.getUser(); if(user){const {data}=await supabase.from("leads").insert({...form,user_id:user.id,status:"pending"}).select().single(); if(data) setLeads([data as Lead,...leads]);}}else setLeads([row,...leads]); setOpen(false);} return <section><div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div><h2 className="font-display text-2xl font-semibold">Lead directory</h2><p className="text-sm text-muted-foreground">{leads.length} prospects across 11 supported markets.</p></div><Button onClick={()=>setOpen(true)}><Plus size={15}/>Add lead</Button></div><LeadTable leads={leads}/>{!userEmail&&<div className="mt-4 flex items-center justify-between border border-primary/30 bg-primary-soft p-4 text-xs"><span>Demo changes stay in this session. Sign in to save your workspace.</span><Button size="sm" onClick={onSignIn}>Sign in</Button></div>}{open&&<Modal title="Add a lead" onClose={()=>setOpen(false)}><div className="grid gap-4 sm:grid-cols-2"><Field label="Business name"><input value={form.business_name} onChange={e=>setForm({...form,business_name:e.target.value})}/></Field><Field label="Contact name"><input value={form.contact_name} onChange={e=>setForm({...form,contact_name:e.target.value})}/></Field><Field label="Email"><input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Phone"><input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></Field><Field label="Market"><select value={form.country_code} onChange={e=>setForm({...form,country_code:e.target.value})}>{markets.map(m=><option key={m.code} value={m.code}>{m.name}</option>)}</select></Field><Field label="Industry"><input value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/></Field></div><div className="mt-6 flex justify-end gap-2"><Button variant="ghost" onClick={()=>setOpen(false)}>Cancel</Button><Button onClick={add}>Add lead</Button></div></Modal>}</section>; }

function Messages(){return <section><h2 className="font-display text-2xl font-semibold">Reply inbox</h2><p className="mb-6 text-sm text-muted-foreground">AI-sorted conversations that need your attention.</p><div className="grid gap-3">{[["Mia Chen","Northline Dental","YES","This sounds relevant. Can you send over a few times for Thursday?"],["Jack Turner","Harbour Physio","OTHER","Could you clarify how this connects with our booking software?"],["Sofia Costa","Alba Studio","NO","Thanks, but not at the moment."]].map(([n,b,s,m])=><div key={n} className="grid gap-4 border border-border bg-card p-5 md:grid-cols-[200px_80px_minmax(0,1fr)_auto] md:items-center"><div><div className="text-sm font-semibold">{n}</div><div className="text-xs text-muted-foreground">{b}</div></div><Status value={s==="YES"?"positive_reply":s==="NO"?"blacklisted":"replied_unclear"}/><p className="text-sm text-muted-foreground">“{m}”</p><Button size="sm" variant="secondary">Reply</Button></div>)}</div></section>}

function EmailStudio({userEmail,onSignIn}:{userEmail:string|null;onSignIn:()=>void}) { const [form,setForm]=useState({business:"Northline Dental",contact:"Mia",sender:"Alex from Super Reacher",country:"SG",industry:"Dental"}); const generated=useMemo(()=>createEmail(form),[form]); const [subject,setSubject]=useState(generated.subject); const [html,setHtml]=useState(generated.html); const [copied,setCopied]=useState(""); useEffect(()=>{setSubject(generated.subject);setHtml(generated.html)},[generated]); async function copy(value:string,type:string){try{await navigator.clipboard.writeText(value)}catch{const area=document.createElement("textarea");area.value=value;area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();document.execCommand("copy");area.remove()}setCopied(type);setTimeout(()=>setCopied(""),1800)} async function save(){if(!userEmail){onSignIn();return} const {data:{user}}=await supabase.auth.getUser(); if(user) await supabase.from("email_templates").insert({user_id:user.id,name:`${form.business} intro`,country_code:form.country,industry:form.industry,subject,html_content:html}); setCopied("saved");setTimeout(()=>setCopied(""),1800)} return <section><div className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] gap-4"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase text-primary"><Sparkles size={13}/>Localized email generator</div><h2 className="mt-2 font-display text-2xl font-semibold">Build a paste-ready HTML email</h2><p className="text-sm text-muted-foreground">Edit the details, preview the result, then copy the complete email code.</p></div><Button variant="secondary" onClick={save}>{copied==="saved"?<Check size={15}/>:<Clipboard size={15}/>}Save template</Button></div><div className="grid gap-5 xl:grid-cols-[minmax(360px,.75fr)_minmax(420px,1.25fr)]"><div className="space-y-4 border border-border bg-card p-5"><div className="grid gap-4 sm:grid-cols-2"><Field label="Business"><input value={form.business} onChange={e=>setForm({...form,business:e.target.value})}/></Field><Field label="Contact"><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})}/></Field><Field label="Market"><select value={form.country} onChange={e=>setForm({...form,country:e.target.value})}>{markets.map(m=><option key={m.code} value={m.code}>{m.name} · {m.language}</option>)}</select></Field><Field label="Industry"><input value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/></Field></div><Field label="Sender"><input value={form.sender} onChange={e=>setForm({...form,sender:e.target.value})}/></Field><Field label="Subject"><div className="flex gap-2"><input value={subject} onChange={e=>setSubject(e.target.value)}/><Button size="icon" variant="secondary" aria-label="Copy subject" onClick={()=>copy(subject,"subject")}>{copied==="subject"?<Check size={15}/>:<Copy size={15}/>}</Button></div></Field><Field label="HTML email"><textarea className="min-h-72 font-mono text-[11px] leading-5" value={html} onChange={e=>setHtml(e.target.value)}/></Field><Button className="w-full" onClick={()=>copy(html,"html")}>{copied==="html"?<><Check size={16}/>Copied — paste it anywhere</>:<><Copy size={16}/>Copy complete HTML</>}</Button></div><div className="min-w-0 border border-border bg-panel"><div className="flex h-11 items-center justify-between border-b border-border px-4"><div className="flex items-center gap-2 text-xs font-semibold"><span className="size-2 rounded-full bg-success"/>Live preview</div><div className="flex gap-1"><span className="size-2 rounded-full bg-border"/><span className="size-2 rounded-full bg-border"/><span className="size-2 rounded-full bg-border"/></div></div><div className="p-4 md:p-7"><div className="mb-3 text-xs text-muted-foreground"><strong className="text-foreground">Subject:</strong> {subject}</div><iframe title="Email preview" className="h-[620px] w-full border border-border bg-email" srcDoc={html}/></div></div></div></section> }

function Field({label,children}:{label:string;children:ReactNode}){return <label className="block text-xs font-semibold text-muted-foreground"><span className="mb-2 block">{label}</span>{children}</label>}
function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:ReactNode}){return <div className="fixed inset-0 z-50 grid place-items-center bg-overlay p-4"><div className="w-full max-w-xl border border-border bg-popover p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h3 className="font-display text-lg font-semibold">{title}</h3><Button size="icon" variant="ghost" aria-label="Close" onClick={onClose}><X size={17}/></Button></div>{children}</div></div>}
function AuthModal({onClose}:{onClose:()=>void}){const [mode,setMode]=useState<"signin"|"signup">("signin");const [email,setEmail]=useState("");const [password,setPassword]=useState("");const [message,setMessage]=useState("");async function submit(){const result=mode==="signin"?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});if(result.error)setMessage(result.error.message);else {setMessage(mode==="signup"?"Check your inbox to confirm your account.":"Signed in successfully.");if(mode==="signin")setTimeout(onClose,500)}}async function google(){const result=await lovable.auth.signInWithOAuth("google",{redirect_uri:window.location.origin});if(result.error)setMessage(result.error.message)}return <Modal title={mode==="signin"?"Sign in to Super Reacher":"Create your workspace"} onClose={onClose}><div className="space-y-4"><Field label="Email"><input type="email" value={email} onChange={e=>setEmail(e.target.value)}/></Field><Field label="Password"><input type="password" value={password} onChange={e=>setPassword(e.target.value)}/></Field>{message&&<p className="text-xs text-primary">{message}</p>}<Button className="w-full" onClick={submit}>{mode==="signin"?"Sign in":"Create account"}</Button><div className="flex items-center gap-3 text-[10px] uppercase text-muted-foreground"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div><Button className="w-full" variant="secondary" onClick={google}><Globe2 size={15}/>Continue with Google</Button><button className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={()=>setMode(mode==="signin"?"signup":"signin")}>{mode==="signin"?"New here? Create an account":"Already have an account? Sign in"}</button></div></Modal>}