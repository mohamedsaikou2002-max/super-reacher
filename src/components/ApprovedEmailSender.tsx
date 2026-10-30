import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sendApprovedEmail } from "@/lib/approved-email.functions";
import type { OutreachDraft } from "@/lib/global-outreach";
import { Button } from "@/components/Button";

type Recipient = {id:string;full_name:string;email:string};
export function ApprovedEmailSender({userEmail,draft}:{userEmail:string|null;draft:OutreachDraft|null}) {
  const [recipients,setRecipients]=useState<Recipient[]>([]);
  const [contactId,setContactId]=useState("");
  const [approved,setApproved]=useState(false);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  useEffect(() => {
    if (!userEmail) {setRecipients([]);return;}
    let cancelled=false;
    void supabase.from("contacts")
      .select("id,full_name,email")
      .eq("verification_status","verified")
      .eq("outreach_status","eligible").limit(100)
      .then(({data,error})=>{
        if (!cancelled) {
          setRecipients((data??[]) as Recipient[]);
          if(error)setStatus("Unable to load eligible contacts.");
        }
      });
    return () => { cancelled=true; };
  },[userEmail]);
  async function submit() {
    if(!draft?.html || !draft.subject || !contactId || !approved || busy)return;
    setBusy(true);setStatus("");
    try {
      const result=await sendApprovedEmail({data:{
        requestId:crypto.randomUUID(),contactId,subject:draft.subject,html:draft.html,approved:true,
      }});
      setStatus(result.status==="submitted"?"Accepted by email provider; check delivery updates in Inbox.":"Delivery not confirmed.");
      setApproved(false);
    }catch(err){setStatus(err instanceof Error?err.message:"Unable to send.");}
    finally{setBusy(false);}
  }
  return <section className="rounded-xl border border-border bg-card p-5 space-y-3">
    <h3 className="font-bold text-sm">Verified email delivery — restricted pilot</h3>
    <p className="text-xs text-muted-foreground">Live sending requires administrator enablement, a verified sender, and an eligible contact. This is a single-send action, never an automatic campaign.</p>
    <label className="block text-xs">Eligible saved contact
      <select value={contactId} onChange={e=>{setContactId(e.target.value);setApproved(false);}} className="mt-1 w-full">
        <option value="">Select verified CRM contact</option>
        {recipients.map(c=><option key={c.id} value={c.id}>{c.full_name} — {c.email}</option>)}
      </select>
    </label>
    <label className="flex gap-2 items-start text-xs">
      <input type="checkbox" checked={approved} onChange={e=>setApproved(e.target.checked)}/>
      I reviewed this email, have a lawful basis to contact the selected recipient, and confirm they have not opted out.
    </label>
    <Button variant="secondary" disabled={!userEmail||!approved||!contactId||!draft?.html||draft.channel!=="email"||busy}
      onClick={()=>void submit()}>{busy?"Submitting...":"Send this one approved email"}</Button>
    {!draft?.html&&<p className="text-xs text-muted-foreground">Generate an email draft above first.</p>}
    {status&&<p role="status" className="text-xs text-muted-foreground">{status}</p>}
  </section>;
}
