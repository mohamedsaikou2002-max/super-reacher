import { describe,it,expect } from "vitest";
import { buildOutreachDraft,DEFAULT_PROFILE,CHANNELS,SECTOR_PRESETS } from "../src/lib/global-outreach";
const profile={...DEFAULT_PROFILE,sender_name:"Taylor",offer:"aircraft consulting",value_proposition:"helping qualified buyers evaluate options"};
describe("Global Outreach",()=>{
 it("supports multiple industries and channels",()=>{
  expect(SECTOR_PRESETS.some(x=>x.id==="aviation")).toBe(true);
  expect(CHANNELS.some(x=>x.id==="phone")).toBe(true);
 });
 it("produces a call script without dialing",()=>{
  const draft=buildOutreachDraft({profile,contactName:"Alex",companyName:"Acme",channel:"phone",market:"US"});
  expect(draft.text).toContain("CALL PREPARATION");
  expect(draft.sendEnabled).toBe(false);
  expect(draft.html).toBeNull();
 });
 it("escapes user HTML content",()=>{
  const draft=buildOutreachDraft({profile:{...profile,offer:"<script>attack</script>"},contactName:"<img>",companyName:"X",channel:"email",market:"US"});
  expect(draft.html).toContain("&lt;script&gt;");
  expect(draft.html).not.toContain("<script>");
  expect(draft.sendEnabled).toBe(false);
 });
 it("includes a short opt out in SMS drafts",()=>{
  const draft=buildOutreachDraft({profile,contactName:"Alex",companyName:"",channel:"sms",market:"US"});
  expect(draft.text).toMatch(/STOP/);
  expect(draft.sendEnabled).toBe(false);
 });
});
