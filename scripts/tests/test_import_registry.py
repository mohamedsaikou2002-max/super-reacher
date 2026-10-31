import importlib.util
import io
import pathlib
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest.mock import patch

SOURCE = pathlib.Path(__file__).resolve().parents[1] / "import_registry.py"
spec = importlib.util.spec_from_file_location("import_registry", SOURCE)
registry = importlib.util.module_from_spec(spec)
spec.loader.exec_module(registry)

class RegistryImporterTests(unittest.TestCase):
    def test_country_mappings(self):
        cases = [
            ("FR", {"siren": "00123", "nom_complet": "France SAS"}, "00123"),
            ("GB", {"company_number": "00012345", "company_name": "UK Ltd"}, "00012345"),
            ("SG", {"uen": "202600001A", "entity_name": "SG Pte"}, "202600001A"),
            ("IT", {"codice_fiscale": "0123456", "denominazione": "Italia"}, "0123456"),
            ("DE", {"registernummer": "HRB 77", "firma": "Berlin"}, "HRB 77"),
            ("CA", {"corporation_number": "000123", "corporation_name": "Canada"}, "000123"),
            ("US", {"entity_id": "999", "entity_name": "US LLC"}, "MD:999"),
        ]
        for country, row, expected in cases:
            with self.subTest(country=country):
                data = registry.map_row(country, row, "https://registry.example.org", "MD" if country == "US" else "")
                self.assertEqual(data["source_record_id"], expected)
    def test_no_source_or_state(self):
        with self.assertRaises(ValueError):
            registry.map_row("US", {"entity_id": "1", "entity_name": "X"}, "https://example.org")
        with self.assertRaises(ValueError):
            registry.map_row("FR", {"siren": "1", "nom_complet": "X"}, "http://example.org")
    def test_csv_dry_run(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = pathlib.Path(tmp) / "test.csv"
            p.write_text('uen,entity_name,primary_ssic_code\n123,"Example, Pte",62010\n', encoding="utf-8")
            output = io.StringIO()
            with redirect_stdout(output):
                code = registry.main(["--country", "SG", "--file", str(p), "--source-url", "https://data.gov.sg/datasets"])
            self.assertEqual(code, 0)
            self.assertIn('"dry_run": true', output.getvalue())
            self.assertIn("Example, Pte", output.getvalue())
    def test_import_writes_only_with_explicit_apply(self):
        with patch.object(registry, "upload_batch") as upload:
            with tempfile.TemporaryDirectory() as tmp:
                p = pathlib.Path(tmp) / "test.csv"
                p.write_text("uen,entity_name\n123,Example\n", encoding="utf-8")
                with redirect_stdout(io.StringIO()):
                    registry.main(["--country","SG","--file",str(p),"--source-url","https://data.gov.sg"])
                upload.assert_not_called()

if __name__ == "__main__":
    unittest.main()
