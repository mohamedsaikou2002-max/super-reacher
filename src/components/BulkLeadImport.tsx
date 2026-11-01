import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ImportedLead = {
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
const MAX_ROWS = 1000;
const ALIASES: Record<string, string[]> = {
  business_name: [
    "business_name",
    "company",
    "company_name",
    "organization",
    "organisation",
    "business",
  ],
  contact_name: ["contact_name", "full_name", "person", "name", "executive"],
  email: ["email", "email_address", "work_email", "business_email"],
  phone: ["phone", "phone_number", "telephone", "work_phone"],
  country_code: ["country_code", "country", "market", "country_iso"],
  industry: ["industry", "sector", "category", "vertical"],
};
/** RFC-style quoted CSV fields, including quoted delimiters and embedded newlines. */
export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (ch === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(value.trim());
      value = "";
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      value += ch;
    }
  }
  if (quoted) throw new Error("The pasted CSV contains an unclosed quoted field.");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}
export function normalizeLeadCSV(text: string): Omit<ImportedLead, "id" | "created_at">[] {
  const rows = parseCSV(text.replace(/^\uFEFF/, ""));
  if (rows.length < 2) throw new Error("Paste CSV with a header and at least one record.");
  if (rows.length - 1 > MAX_ROWS) throw new Error("Import a maximum of 1,000 leads per batch.");
  const headers = rows[0].map((c) =>
    c
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, ""),
  );
  const get = (cells: string[], key: string) => {
    const index = headers.findIndex((h) => ALIASES[key]?.includes(h));
    return index < 0 ? "" : (cells[index] ?? "").trim().slice(0, 250);
  };
  const result: Omit<ImportedLead, "id" | "created_at">[] = [];
  const seen = new Set<string>();
  for (const cells of rows.slice(1)) {
    const business_name = get(cells, "business_name");
    const email = get(cells, "email").toLowerCase();
    if (!business_name) continue;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
    const contact_name = get(cells, "contact_name");
    const key = email || [business_name.toLowerCase(), contact_name.toLowerCase()].join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      business_name,
      contact_name,
      email,
      phone: get(cells, "phone"),
      country_code: (get(cells, "country_code") || "US").slice(0, 2).toUpperCase(),
      industry: get(cells, "industry"),
      status: "pending",
    });
  }
  return result;
}

export function BulkLeadImport({
  userEmail,
  onImported,
}: {
  userEmail: string | null;
  onImported: (rows: ImportedLead[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  let preview: ReturnType<typeof normalizeLeadCSV> = [];
  let parseError = "";
  if (text.trim()) {
    try {
      preview = normalizeLeadCSV(text);
    } catch (error) {
      parseError = error instanceof Error ? error.message : "Invalid CSV";
    }
  }
  async function importLeads() {
    if (!userEmail || busy || !preview.length || parseError) return;
    setBusy(true);
    setMessage("");
    try {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) throw new Error("Sign in before importing.");
      const existing = new Set<string>();
      const mails = preview.map((r) => r.email).filter(Boolean);
      for (let i = 0; i < mails.length; i += 100) {
        const { data, error } = await supabase
          .from("leads")
          .select("email")
          .eq("user_id", session.user.id)
          .in("email", mails.slice(i, i + 100));
        if (error) throw error;
        (data ?? []).forEach((r) => existing.add(r.email.toLowerCase()));
      }
      const fresh = preview.filter((r) => !r.email || !existing.has(r.email));
      const inserted: ImportedLead[] = [];
      for (let i = 0; i < fresh.length; i += 100) {
        const { data, error } = await supabase
          .from("leads")
          .insert(fresh.slice(i, i + 100).map((r) => ({ ...r, user_id: session.user!.id })))
          .select(
            "id,business_name,contact_name,email,phone,country_code,industry,status,created_at",
          );
        if (error) throw error;
        inserted.push(...((data ?? []) as ImportedLead[]));
      }
      onImported(inserted);
      setMessage(
        `Imported ${inserted.length} pending leads. ${preview.length - fresh.length} existing emails skipped. No messages sent.`,
      );
      setText("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Lead import failed. Check saved records before retrying.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mb-4 rounded-xl border border-border bg-card p-4">
      <button
        type="button"
        className="text-sm font-semibold text-primary"
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide CSV importer" : "Import or paste external lead list"}
      </button>
      {open && (
        <div className="mt-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Paste CSV, or upload a CSV file from a legitimate third-party export. Supported headers:
            company, contact_name, email, phone, country, industry. Import is separate from sending.
          </p>
          <input
            aria-label="Upload lead CSV"
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2_000_000) {
                setMessage("File limit is 2 MB.");
                return;
              }
              setText(await file.text());
              setMessage("");
            }}
          />
          <textarea
            aria-label="Paste leads CSV"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="min-h-32 w-full rounded-md border border-border bg-surface p-2 font-mono text-xs"
            placeholder={
              "company,contact_name,email,phone,country,industry\nExample Company,Alex Smith,alex@example.org,,US,Finance"
            }
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs">
              {parseError || `${preview.length} distinct valid records ready for review`}
            </span>
            <button
              type="button"
              disabled={!userEmail || busy || Boolean(parseError) || !preview.length}
              onClick={importLeads}
              className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              {busy ? "Importing…" : "Import pending leads"}
            </button>
          </div>
          {message && (
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
