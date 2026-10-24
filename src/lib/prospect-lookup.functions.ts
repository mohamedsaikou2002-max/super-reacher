/** Manual, authenticated lookup of one professional contact via the user's API key. */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
const Input=z.object({provider:z.enum(["apollo","hunter"]),fullName:z.string().trim().min(3).max(120),companyName:z.string().trim().min(2).max(180)});
export const lookupProfessionalContact=createServerFn({method:"POST"})
 .middleware([requireSupabaseAuth])
 .inputValidator((data:unknown)=>Input.parse(data))
 .handler(async ({data,context})=>{
  const {getCredential}=await import("./integration-vault.server");
  const key=await getCredential(context.userId,data.provider);
  if(!key) throw new Error("Connect your "+data.provider+" API key first.");
  const {ApolloEnrichmentProvider,HunterEnrichmentProvider}=await import("./intelligence/enrichment");
  const provider=data.provider==="apollo"?new ApolloEnrichmentProvider(key):new HunterEnrichmentProvider(key);
  const contact=await provider.findProfessionalContact({fullName:data.fullName,companyName:data.companyName});
  return {provider:data.provider,contact,verifiedByProvider:false};
 });
