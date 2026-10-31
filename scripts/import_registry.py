#!/usr/bin/env python3
"""Stream authorized company registry CSV/CSV.GZ/CSV.ZIP exports into user-scoped raw_businesses.
Default is DRY RUN. No crawling or outbound messaging. Python 3.10+, standard library only.
"""
import argparse
import csv
import gzip
import io
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
import zipfile
from contextlib import contextmanager

FIELDS = {
    "FR": (("siren", "siret", "identifiant"), ("nom_complet", "denomination", "nom_raison_sociale", "name"), ("activite_principale", "code_ape", "naf"), ("adresse", "adresse_siege")),
    "GB": (("company_number", "company_no"), ("company_name", "companyname"), ("sic_codes", "sic_code"), ("registered_office_address", "address")),
    "SG": (("uen",), ("entity_name",), ("primary_ssic_code", "primary_ssic_description"), ("street_name", "registered_office_address")),
    "IT": (("codice_fiscale", "codicefiscale", "rea", "numero_rea", "registration_id"), ("denominazione", "ragione_sociale", "name"), ("ateco", "codice_ateco", "attivita"), ("indirizzo", "sede_legale")),
    "DE": (("register_number", "registernummer", "unternehmensnummer"), ("name", "firma", "unternehmen"), ("wz_code", "wz2008", "branche"), ("anschrift", "sitz")),
    "CA": (("corporation_number", "corporation_no", "corporation_id", "id"), ("corporation_name", "legal_name", "name"), ("naics", "naics_code", "industry"), ("registered_office_address", "address")),
    "US": (("entity_id", "file_number", "registration_number", "company_number", "cik"), ("entity_name", "business_name", "company_name", "name"), ("naics", "sic", "industry"), ("principal_address", "address")),
}
def first(row, keys):
    for key in keys:
        value = row.get(key, "")
        if value and str(value).strip():
            return str(value).strip()
    return ""

def map_row(country, data, source_url, jurisdiction="", date=None):
    if not source_url.startswith("https://"):
        raise ValueError("Use a verified HTTPS registry provenance URL.")
    if country == "US" and (len(jurisdiction) != 2 or not jurisdiction.isalpha()):
        raise ValueError("US filings require --state XX, the state's two-letter code.")
    row = {str(k).strip().lower(): (v.strip() if isinstance(v, str) else v) for k, v in data.items() if k}
    ids, names, industries, addresses = FIELDS[country]
    identifier, name = first(row, ids), first(row, names)
    if not identifier or not name:
        return None
    if country == "DE":
        court = first(row, ("registergericht", "register_court"))
        if court and not identifier.startswith(court):
            identifier = court + ":" + identifier
    if country == "US":
        identifier = jurisdiction.upper() + ":" + identifier
    return {
        "business_name": name[:500], "country_code": country,
        "industry": first(row, industries)[:500], "address": first(row, addresses)[:1000],
        "source": "api", "raw_source_url": source_url, "source_record_id": identifier,
        "raw_payload": {"registry_id": identifier, "registry_name": name,
                        "industry": first(row, industries), "jurisdiction": jurisdiction or None,
                        "source_type": "authorized_csv_import", "registry_status": first(row, ("status", "company_status", "entity_status_description"))},
        **({"fetched_at": date} if date else {}),
    }

@contextmanager
def open_csv_file(path):
    """Read one ZIP member / GZIP / CSV without extracting untrusted archive paths."""
    if path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as archive:
            candidates = [n for n in archive.namelist() if n.lower().endswith(".csv") and not n.endswith("/")]
            if len(candidates) != 1:
                raise ValueError("ZIP must contain exactly one CSV; import multi-file ZIPs separately.")
            with archive.open(candidates[0]) as raw, io.TextIOWrapper(raw, encoding="utf-8-sig", newline="") as f:
                yield f
    elif path.name.lower().endswith(".csv.gz"):
        with gzip.open(path, "rt", encoding="utf-8-sig", newline="") as f:
            yield f
    elif path.suffix.lower() == ".csv":
        with path.open("r", encoding="utf-8-sig", newline="") as f:
            yield f
    else:
        raise ValueError("Expected .csv, .csv.gz or .zip containing one CSV.")

def upload_batch(rows, url, key, user_id):
    if not rows:
        return
    endpoint = url.rstrip("/") + "/rest/v1/raw_businesses?" + urllib.parse.urlencode(
        {"on_conflict": "user_id,country_code,source,source_record_id"})
    payload = json.dumps([{**row, "user_id": user_id} for row in rows]).encode("utf-8")
    headers = {"apikey": key, "Authorization": "Bearer " + key,
               "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=minimal"}
    for attempt in range(5):
        req = urllib.request.Request(endpoint, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=45) as response:
                if response.status not in (200, 201, 204):
                    raise RuntimeError("Unexpected upload status: " + str(response.status))
            return
        except urllib.error.HTTPError as exc:
            if exc.code not in (429, 500, 502, 503, 504) or attempt == 4:
                raise RuntimeError("Supabase import failed (HTTP " + str(exc.code) + ").") from None
            retry = exc.headers.get("Retry-After", "")
            pause = min(30.0, float(retry) if retry.isdigit() else 2 ** attempt)
            time.sleep(pause)
    raise RuntimeError("Bulk import exhausted retries.")

def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--country", required=True, choices=sorted(FIELDS))
    parser.add_argument("--file", required=True, type=pathlib.Path)
    parser.add_argument("--source-url", required=True, help="Official dataset or authorized distributor HTTPS URL")
    parser.add_argument("--state", default="", help="Required two-letter state for US business exports")
    parser.add_argument("--user-id", help="Authenticated Supabase workspace owner UUID; required with --apply")
    parser.add_argument("--batch-size", type=int, default=100)
    parser.add_argument("--apply", action="store_true", help="Write to Supabase; otherwise dry-run")
    args = parser.parse_args(argv)
    if not 1 <= args.batch_size <= 500: parser.error("--batch-size must be 1–500")
    if not args.file.is_file(): parser.error("CSV file does not exist")
    if not args.source_url.startswith("https://"): parser.error("--source-url must be HTTPS")
    if args.country == "US" and (len(args.state) != 2 or not args.state.isalpha()): parser.error("US requires --state XX")
    if args.apply:
        try: uuid.UUID(args.user_id or "")
        except ValueError: parser.error("--apply requires --user-id <UUID>")
        url, key = os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        if not url.startswith("https://") or not key: parser.error("--apply requires SUPABASE_URL HTTPS and SUPABASE_SERVICE_ROLE_KEY")
    count = skipped = uploaded = 0
    preview = []
    batch = []
    with open_csv_file(args.file) as stream:
        for raw in csv.DictReader(stream):
            record = map_row(args.country, raw, args.source_url, args.state.upper())
            if record is None:
                skipped += 1
                continue
            count += 1
            if len(preview) < 5:
                preview.append({"name": record["business_name"], "id": record["source_record_id"], "industry": record["industry"]})
            if args.apply:
                batch.append(record)
                if len(batch) >= args.batch_size:
                    upload_batch(batch, url, key, args.user_id)
                    uploaded += len(batch)
                    batch.clear()
    if batch:
        upload_batch(batch, url, key, args.user_id)
        uploaded += len(batch)
    print(json.dumps({"country": args.country, "valid_records": count, "skipped_missing_id_or_name": skipped,
                      "uploaded": uploaded, "dry_run": not args.apply, "preview": preview}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    try: sys.exit(main())
    except (ValueError, OSError, csv.Error, RuntimeError) as error:
        print("Import error: " + str(error), file=sys.stderr)
        sys.exit(1)
