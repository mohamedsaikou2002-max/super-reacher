import { useState } from "react";
import { CHANNELS,SECTOR_PRESETS,DEFAULT_PROFILE,buildOutreachDraft,type OutreachProfile,type Channel,type OutreachDraft } from "@/lib/global-outreach";
export function GlobalOutreachStudio({userEmail}:{userEmail:string|null}){
 const [profile,setProfile]=useState<OutreachProfile>(DEFAULT_PROFILE);
 const [contact,setContact]=useState("");
 const [company,setCompany]=useState("");
 const [draft,setDraft]=useState<OutreachDraft|null>(null);
 const edit=(field:keyof OutreachProfile,value:string)=>{
   setProfile(previous=>({...previous,[field]:value}));setDraft(null);
 };
 const field=(label:string,key:keyof OutreachProfile)=>(
   <label className="block text-xs">{label}
    <input className="mt-1 block w-full rounded-md border border-border bg-background p-2 text-foreground"
     value={profile[key]} onChange={e=>edit(key,e.target.value)}/>
   </label>
 );
 return <section className="space-y-5">
  <div><h2 className="text-lg font-bold">Global Outreach Studio</h2>
  <p className="text-xs text-muted-foreground">Industry-neutral prospecting and relationship management. All messages are drafts: no sending, dialing or direct messaging.</p></div>
  <div className="grid gap-3 sm:grid-cols-2">
   <label className="block text-xs">Industry
    <select className="mt-1 w-full rounded-md border p-2" onChange={e=>{
      const sector=SECTOR_PRESETS.find(p=>p.id===e.target.value);
      if(sector) setProfile(old=>({...old,profession:sector.profession,audience:sector.audience}));
    }}>{SECTOR_PRESETS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}</select>
   </label>
   <label className="block text-xs">Channel
    <select className="mt-1 w-full rounded-md border p-2" value={profile.preferred_channel}
      onChange={e=>edit("preferred_channel",e.target.value as Channel)}>
      {CHANNELS.map(x=><option key={x.id} value={x.id}>{x.label}</option>)}
    </select>
   </label>
   {field("Profession","profession")}{field("Target audience","audience")}
   {field("Offer","offer")}{field("Value proposition","value_proposition")}
   {field("Sender name","sender_name")}{field("Market","preferred_market")}
   <label className="block text-xs">Contact name<input className="mt-1 w-full rounded-md border p-2" value={contact} onChange={e=>setContact(e.target.value)}/></label>
   <label className="block text-xs">Company<input className="mt-1 w-full rounded-md border p-2" value={company} onChange={e=>setCompany(e.target.value)}/></label>
  </div>
  <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" disabled={!profile.offer.trim()||!profile.value_proposition.trim()} onClick={()=>
    setDraft(buildOutreachDraft({profile,contactName:contact,companyName:company,channel:profile.preferred_channel,market:profile.preferred_market}))
  }>Generate reviewable draft</button>
  {draft&&<div className="rounded-lg border border-border p-4 space-y-3">
    {draft.subject&&<div className="text-xs"><b>Subject:</b> {draft.subject}</div>}
    <pre className="whitespace-pre-wrap font-sans text-xs">{draft.text}</pre>
    <button className="rounded-md border p-2 text-xs" onClick={()=>void navigator.clipboard.writeText(draft.text)}>Copy draft</button>
    {draft.html&&<details><summary className="cursor-pointer text-xs">HTML preview</summary>
      <iframe title="HTML preview" className="mt-2 h-64 w-full" sandbox="" srcDoc={draft.html}/></details>}
  </div>}
  <p className="text-xs text-muted-foreground">Signed in: {userEmail?"Yes":"No"}. Messages require recipient eligibility checks and manual approval before use.</p>
 </section>;
}
