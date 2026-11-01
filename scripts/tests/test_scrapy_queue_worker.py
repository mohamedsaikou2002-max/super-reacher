import importlib.util
import pathlib
import unittest
from unittest.mock import patch

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "scrapy_queue_worker.py"
spec = importlib.util.spec_from_file_location("scrapy_queue_worker", SOURCE)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)


class ScrapyWorkerTests(unittest.TestCase):
    def test_empty_queue_performs_no_network_side_effects(self):
        with patch.object(worker, "api", return_value=[]) as request:
            self.assertFalse(worker.process_one("00000000-0000-0000-0000-000000000001"))
            self.assertEqual(request.call_count, 1)

    def test_job_update_rejects_unexpected_fields(self):
        with self.assertRaises(ValueError):
            worker.patch_run("run", "user", {"service_role_key": "secret"})

    def test_network_requires_valid_server_url_and_secret(self):
        with patch.dict(worker.os.environ, {
            "SUPABASE_URL": "http://127.0.0.1:54321",
            "SUPABASE_SERVICE_ROLE_KEY": "example",
        }):
            with self.assertRaises(RuntimeError):
                worker.api("businesses")

    def test_private_worker_does_not_claim_jobs_until_queued(self):
        with patch.object(worker, "api", return_value=[]) as request:
            self.assertEqual(worker.patch_run("job", "user", {"status": "running"}, require_queued=True), [])
            self.assertEqual(request.call_args.kwargs["query"]["status"], "eq.queued")


if __name__ == "__main__":
    unittest.main()
