import { useEffect,useState } from "react";
import { listMyIntegrations,saveMyIntegration,deleteMyIntegration } from "@/lib/integrations.functions";
type Provider="groq"|"apollo"|"hunter"|"firecrawl"|"gemini";
type Metadata={provider:Provider;key_hint:string;cost_acknowledged:boolean;updated_at:string};
const providers:Provider[]=["groq","apollo","hunter","firecrawl","gemini"];
export function BringYourOwnApi({userEmail}:{userEmail:string|null}){
 const [connected,setConnected]=useState<Metadata[]>([]);
 const [provider,setProvider]=useState<Provider>("groq");
 const [key,setKey]=useState("");
 const [ack,setAck]=useState(false);
 const [status,setStatus]=useState("");
 const [busy,setBusy]=useState(false);
 const refresh=async()=>{
   if(!userEmail){setConnected([]);return;}
   try{const value=await listMyIntegrations();setConnected(value.credentials as Metadata[]);}
   catch(e){setStatus(e instanceof Error?e.message:"Unable to read credentials");}
 };
 useEffect(()=>{void refresh();},[userEmail]);
 const save=async()=>{
  setBusy(true);
  try{
   await saveMyIntegration({data:{provider,secret:key,costAcknowledged:true}});
   setKey("");setStatus("Key encrypted and stored; live provider health has NOT been checked");
   await refresh();
  }catch(e){setStatus(e instanceof Error?e.message:"Unable to store key");}
  finally{setBusy(false);}
 };
 const remove=async()=>{
  if(!window.confirm("Remove this provider key?"))return;
  setBusy(true);
  try{await deleteMyIntegration({data:{provider}});await refresh();setStatus("Key removed");}
  catch(e){setStatus(e instanceof Error?e.message:"Unable to delete key");}
  finally{setBusy(false);}
 };
 return <section className="space-y-4">
  <h2 className="text-lg font-bold">Bring Your Own API Keys</h2>
  <p className="text-xs text-muted-foreground">Configure your personal integrations. Keys are encrypted server-side. A stored key does not prove a working connection.</p>
  <div className="grid gap-2 sm:grid-cols-3">
   {providers.map(p=><button key={p} className="rounded-md border p-3 text-left text-xs" onClick={()=>{setProvider(p);setKey("");setAck(false);}}>
    <b>{p.toUpperCase()}</b><div>{connected.find(x=>x.provider===p)?.key_hint??"Not configured"}</div></button>)}
  </div>
  <div className="space-y-3 rounded-md border p-4">
   <div className="text-sm font-semibold">Configure {provider}</div>
   <input type="password" autoComplete="off" spellCheck={false} className="w-full rounded-md border p-2" value={key} onChange={e=>setKey(e.target.value)} placeholder="Provider API key"/>
   <label className="flex gap-2 text-xs"><input type="checkbox" checked={ack} onChange={e=>setAck(e.target.checked)}/>
     I authorize usage and understand provider charges are billed by the provider.</label>
   <div className="flex gap-2">
    <button className="rounded-md bg-primary px-4 py-2 text-xs text-primary-foreground" disabled={!userEmail||busy||key.trim().length<8||!ack} onClick={save}>Save encrypted key</button>
    <button className="rounded-md border p-2 text-xs" disabled={busy} onClick={remove}>Remove</button>
   </div>
  </div>
  {status&&<p role="status" className="text-xs">{status}</p>}
  <p className="text-xs text-muted-foreground">Requires database migration plus server secrets INTEGRATION_VAULT_KEY and SUPABASE_SERVICE_ROLE_KEY. Gemini is key-storage only until an execution adapter is implemented.</p>
 </section>;
}
