"""Permission-aware Scrapy spider: official domains ONLY, one business per input row.
Usage:
  pip install -r scripts/requirements-crawler.txt
  scrapy runspider scripts/official_site_spider.py -a input_csv=sites.csv -O evidence.jsonl
sites.csv columns: business_id,official_website
Only HTTPS, public DNS names. Enforce network egress deny-to-private-IP at host/firewall level.
"""
import csv
import ipaddress
from pathlib import Path
from urllib.parse import urlparse, urljoin
import scrapy

class OfficialSiteSpider(scrapy.Spider):
    name = "official_sites"
    custom_settings = {
        "ROBOTSTXT_OBEY": True, "AUTOTHROTTLE_ENABLED": True,
        "AUTOTHROTTLE_START_DELAY": 2.0, "AUTOTHROTTLE_MAX_DELAY": 30.0,
        "DOWNLOAD_DELAY": 1.5, "CONCURRENT_REQUESTS": 4,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "DOWNLOAD_TIMEOUT": 15, "REDIRECT_ENABLED": False,
        "RETRY_TIMES": 2, "CLOSESPIDER_PAGECOUNT": 5000,
        "USER_AGENT": "HyperReacher-Research/1.0 (public business website research; obey robots.txt)",
    }
    def __init__(self, input_csv=None, max_pages=5, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not input_csv or not Path(input_csv).is_file():
            raise ValueError("Pass a readable CSV with -a input_csv=sites.csv")
        self.input_csv = input_csv
        self.max_pages = min(max(int(max_pages), 1), 10)
        self.counts = {}
        self.root_host = {}
    @staticmethod
    def safe_host(url):
        parts = urlparse(url)
        host = (parts.hostname or "").lower().rstrip(".")
        if parts.scheme != "https" or not host or host in ("localhost",) or host.endswith((".local", ".internal")):
            return None
        try: ipaddress.ip_address(host); return None
        except ValueError: pass
        if "." not in host: return None
        return host
    def start_requests(self):
        with open(self.input_csv, newline="", encoding="utf-8-sig") as stream:
            for row in csv.DictReader(stream):
                business_id = (row.get("business_id") or "").strip()
                url = (row.get("official_website") or "").strip()
                host = self.safe_host(url)
                if not business_id or not host: continue
                self.root_host[business_id] = host
                self.counts[business_id] = 0
                yield scrapy.Request(url, callback=self.parse, cb_kwargs={"business_id": business_id, "depth": 0}, dont_filter=True)
    def parse(self, response, business_id, depth):
        if response.status != 200 or self.safe_host(response.url) != self.root_host.get(business_id): return
        if self.counts.get(business_id, 0) >= self.max_pages: return
        self.counts[business_id] += 1
        title = response.css("title::text").get(default="").strip()[:300]
        content = " ".join(part.strip() for part in response.css("body ::text").getall() if part.strip())[:12000]
        yield {"business_id": business_id, "url": response.url, "canonical_url": response.url,
               "title": title, "content": content, "http_status": response.status,
               "crawl_status": "completed"}
        if depth >= 1 or self.counts[business_id] >= self.max_pages: return
        keywords = ("about", "company", "team", "leadership", "contact", "services", "news")
        for href in response.css("a::attr(href)").getall():
            absolute = urljoin(response.url, href).split("#", 1)[0]
            path = urlparse(absolute).path.lower()
            if self.safe_host(absolute) != self.root_host[business_id]: continue
            if not any(k in path for k in keywords): continue
            yield response.follow(absolute, callback=self.parse, cb_kwargs={"business_id": business_id, "depth": depth + 1})
