"""Process approved official-website crawl jobs using the existing Scrapy spider.

Usage (on an always-on trusted host):
  python -m pip install -r scripts/requirements-crawler.txt
  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
    python scripts/scrapy_queue_worker.py --user-id YOUR_AUTH_UUID --once
  python scripts/scrapy_queue_worker.py --user-id YOUR_AUTH_UUID --loop

This is an isolated server process, never a web-browser callable endpoint.
Restrict outbound network at the host firewall to avoid SSRF/DNS rebinding.
"""
import argparse
import csv
import hashlib
import json
import os
import subprocess
import sys
import tempfile
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parent
ALLOWED_FIELDS = {"status", "started_at", "completed_at", "error", "attempt"}

def api(path, *, method="GET", data=None, query=None):
    base = os.environ.get("SUPABASE_URL", "").rstrip("/")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    url = urlparse(base)
    if url.scheme != "https" or not url.hostname or not key:
        raise RuntimeError("A trusted HTTPS SUPABASE_URL and server-only service role key are required")
    target = base + "/rest/v1/" + path
    if query: target += "?" + urlencode(query)
    headers = {"apikey": key, "Authorization": "Bearer " + key,
               "Accept": "application/json", "Content-Type": "application/json"}
    if method != "GET": headers["Prefer"] = "return=representation,resolution=merge-duplicates"
    req = Request(target, data=json.dumps(data).encode() if data is not None else None,
                  headers=headers, method=method)
    try:
        with urlopen(req, timeout=30) as response:
            payload = response.read()
            return json.loads(payload) if payload else []
    except HTTPError as error:
        raise RuntimeError("Supabase HTTP {}: {}".format(error.code, error.read(500).decode("utf-8", "replace"))) from error

def patch_run(run_id, user_id, data, *, require_queued=False):
    if set(data) - ALLOWED_FIELDS: raise ValueError("Invalid run update")
    q = {"id": "eq." + run_id, "user_id": "eq." + user_id}
    if require_queued: q["status"] = "eq.queued"
    return api("enrichment_runs", method="PATCH", query=q, data=data)

def next_run(user_id):
    return api("enrichment_runs", query={
        "select": "id,business_id,user_id", "user_id": "eq." + user_id,
        "type": "eq.crawl_website", "status": "eq.queued", "limit": 1,
        "order": "created_at.asc"
    })

def process_one(user_id):
    runs = next_run(user_id)
    if not runs: return False
    run = runs[0]
    run_id = run["id"]
    claimed = patch_run(run_id, user_id,
                        {"status": "running", "started_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "attempt": 1},
                        require_queued=True)
    if not claimed: return True
    business_id = run["business_id"]
    try:
        rows = api("businesses", query={
            "select": "id,official_website", "id": "eq." + business_id,
            "user_id": "eq." + user_id, "limit": 1
        })
        if not rows or not rows[0].get("official_website"):
            raise ValueError("No owned business or official website available")
        website = rows[0]["official_website"]
        domain = urlparse(website)
        if domain.scheme != "https" or not domain.hostname or "." not in domain.hostname:
            raise ValueError("Official website must be a valid HTTPS domain")
        with tempfile.TemporaryDirectory(prefix="hyperreacher-scrapy-") as tmp:
            source = Path(tmp) / "sites.csv"
            results = Path(tmp) / "evidence.jsonl"
            with source.open("w", newline="", encoding="utf8") as file:
                writer = csv.DictWriter(file, fieldnames=["business_id", "official_website"])
                writer.writeheader()
                writer.writerow({"business_id": business_id, "official_website": website})
            subprocess.run([sys.executable, "-m", "scrapy", "runspider",
                            str(ROOT / "official_site_spider.py"),
                            "-a", "input_csv=" + str(source), "-a", "max_pages=8",
                            "-O", str(results)],
                           cwd=str(ROOT.parent), check=True, timeout=180,
                           stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            pages = []
            if results.exists():
                for line in results.read_text(encoding="utf8").splitlines():
                    if not line.strip(): continue
                    page = json.loads(line)
                    target = urlparse(page.get("canonical_url", ""))
                    if target.scheme != "https" or target.hostname != domain.hostname:
                        continue
                    body = str(page.get("content", ""))[:5000]
                    if not body: continue
                    pages.append({
                        "business_id": business_id, "url": page["canonical_url"],
                        "canonical_url": page["canonical_url"],
                        "title": str(page.get("title", ""))[:300],
                        "content": body, "content_hash": hashlib.sha256(body.encode()).hexdigest(),
                        "http_status": 200, "crawl_status": "completed"
                    })
            if pages:
                api("web_pages", method="POST", query={"on_conflict": "business_id,canonical_url"}, data=pages)
                api("businesses", method="PATCH", query={"id": "eq." + business_id, "user_id": "eq." + user_id},
                    data={"website_status": "crawled", "enrichment_status": "research_pending"})
                status, error = "completed", None
            else:
                status, error = "blocked", "No crawlable pages (check robots, website, and firewall)"
            patch_run(run_id, user_id, {"status": status, "error": error,
                                       "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
    except Exception as exc:
        patch_run(run_id, user_id, {"status": "failed", "error": str(exc)[:600],
                                   "completed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())})
        print("Scrapy job {} failed: {}".format(run_id, exc), file=sys.stderr)
    return True

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--once", action="store_true")
    mode.add_argument("--loop", action="store_true")
    parser.add_argument("--poll-seconds", type=int, default=60)
    args = parser.parse_args()
    uuid.UUID(args.user_id)
    if not 5 <= args.poll_seconds <= 3600: raise ValueError("poll-seconds out of range")
    while True:
        processed = process_one(args.user_id)
        if args.once: break
        if not processed: time.sleep(args.poll_seconds)

if __name__ == "__main__":
    main()
