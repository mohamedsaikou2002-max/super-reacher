/** AES-256-GCM BYO credential vault; server-only, authenticated caller userId required. */
import { createCipheriv,createDecipheriv,randomBytes } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
export const PROVIDER_IDS = ["groq","apollo","hunter","firecrawl","gemini"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];
function vaultKey(): Buffer {
 const encoded=process.env["INTEGRATION_VAULT_KEY"];
 if (!encoded) throw new Error("INTEGRATION_VAULT_KEY is required.");
 const key=Buffer.from(encoded,"base64");
 if (key.length!==32) throw new Error("INTEGRATION_VAULT_KEY must contain 32 random bytes in base64.");
 return key;
}
function seal(value:string):string {
 const iv=randomBytes(12);
 const cipher=createCipheriv("aes-256-gcm",vaultKey(),iv);
 const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
 return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),data.toString("base64")].join(":");
}
function open(value:string):string {
 const [version,iv,tag,data]=value.split(":");
 if(version!=="v1"||!iv||!tag||!data) throw new Error("Invalid sealed credential");
 const decipher=createDecipheriv("aes-256-gcm",vaultKey(),Buffer.from(iv,"base64"));
 decipher.setAuthTag(Buffer.from(tag,"base64"));
 return Buffer.concat([decipher.update(Buffer.from(data,"base64")),decipher.final()]).toString("utf8");
}
export async function setCredential(userId:string,provider:ProviderId,secret:string,costAcknowledged:boolean){
 if(!PROVIDER_IDS.includes(provider)) throw new Error("Unsupported provider");
 const clean=secret.trim();
 if(clean.length<8||clean.length>1024||/[\r\n]/.test(clean)) throw new Error("Invalid API key");
 const {error}=await supabaseAdmin.from("provider_credentials" as never).upsert({
   user_id:userId,provider,encrypted_secret:seal(clean),key_hint:"••••"+clean.slice(-4),
   cost_acknowledged:costAcknowledged,updated_at:new Date().toISOString()
 } as never,{onConflict:"user_id,provider"});
 if(error) throw new Error("Unable to store encrypted credential");
}
export async function getCredential(userId:string,provider:ProviderId):Promise<string|null>{
 const {data,error}=await supabaseAdmin.from("provider_credentials" as never).select("encrypted_secret").eq("user_id",userId).eq("provider",provider).maybeSingle();
 if(error) throw new Error("Unable to retrieve credential");
 const raw=(data as unknown as {encrypted_secret?:string}|null)?.encrypted_secret;
 return raw?open(raw):null;
}
export async function listCredentials(userId:string){
 const {data,error}=await supabaseAdmin.from("provider_credentials" as never).select("provider,key_hint,cost_acknowledged,updated_at").eq("user_id",userId);
 if(error) throw new Error("Unable to list integrations");
 return data??[];
}
export async function removeCredential(userId:string,provider:ProviderId){
 const {error}=await supabaseAdmin.from("provider_credentials" as never).delete().eq("user_id",userId).eq("provider",provider);
 if(error) throw new Error("Unable to remove credential");
}
