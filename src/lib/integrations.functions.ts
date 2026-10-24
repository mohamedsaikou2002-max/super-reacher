import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
const Provider=z.enum(["groq","apollo","hunter","firecrawl","gemini"]);
const Save=z.object({provider:Provider,secret:z.string().min(8).max(1024),costAcknowledged:z.literal(true)});
export const listMyIntegrations=createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async ({context})=>{
 const {listCredentials}=await import("./integration-vault.server");
 return {credentials:await listCredentials(context.userId)};
});
export const saveMyIntegration=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>Save.parse(data)).handler(async ({data,context})=>{
 const {setCredential}=await import("./integration-vault.server");
 await setCredential(context.userId,data.provider,data.secret,data.costAcknowledged);
 return {ok:true as const,provider:data.provider};
});
export const deleteMyIntegration=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).inputValidator((data:unknown)=>z.object({provider:Provider}).parse(data)).handler(async ({data,context})=>{
 const {removeCredential}=await import("./integration-vault.server");
 await removeCredential(context.userId,data.provider);
 return {ok:true as const};
});
