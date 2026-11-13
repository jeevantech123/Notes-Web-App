"""Checks for Notes-Web-App that need only Python's standard library.

No pip, no .venv, no Node. Run from the project folder:

    py -m unittest discover -s tests -v        (Windows)
    python3 -m unittest discover -s tests -v   (macOS / Linux)

They check the project rules in CLAUDE.md and that the repository is safe
to publish. Behavior (R1-R7) is tested in the browser by tests/test.html.
"""

import functools
import http.server
import re
import subprocess
import threading
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
APP_FILES = ["index.html", "style.css", "app.js"]


def read(name):
    return (ROOT / name).read_text(encoding="utf-8")


class ProjectRulesTest(unittest.TestCase):
    """The rules in CLAUDE.md: plain HTML/CSS/JS, localStorage, no other sites, no login."""

    def test_app_files_exist(self):
        for name in APP_FILES:
            self.assertTrue((ROOT / name).is_file(), f"{name} is missing")

    def test_page_has_the_elements_the_spec_lists(self):
        html = read("index.html")
        self.assertRegex(html, r'<textarea[^>]*id="note-text"')
        self.assertRegex(html, r'<button[^>]*id="save-button"[^>]*>\s*Save\s*<')
        self.assertRegex(html, r'<ul[^>]*id="note-list"')

    def test_page_loads_only_its_own_files(self):
        html = read("index.html")
        links = re.findall(r'(?:src|href)="([^"]+)"', html)
        self.assertEqual(sorted(links), ["app.js", "style.css"])

    def test_no_addresses_of_other_sites(self):
        for name in APP_FILES:
            self.assertNotRegex(read(name), r"https?://|//[a-z0-9.-]+\.[a-z]{2,}/", name)

    def test_app_makes_no_network_calls(self):
        code = read("app.js")
        for call in ["fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "EventSource", "import("]:
            self.assertNotIn(call, code)

    def test_notes_are_kept_in_local_storage(self):
        code = read("app.js")
        self.assertIn("localStorage.setItem", code)
        self.assertIn("localStorage.getItem", code)

    def test_no_login_or_account(self):
        html = read("index.html")
        self.assertNotIn('type="password"', html)
        self.assertNotRegex(html.lower(), r"log ?in|sign ?in|sign ?up|account")


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


class PythonServerTest(unittest.TestCase):
    """The app is served by Python's built-in http.server, the same server as the run command."""

    @classmethod
    def setUpClass(cls):
        handler = functools.partial(QuietHandler, directory=str(ROOT))
        cls.server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)  # port 0 = any free port
        cls.base = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def fetch(self, path):
        with urllib.request.urlopen(self.base + path) as response:
            return response.status, response.headers.get_content_type()

    def test_home_page_is_index_html(self):
        self.assertEqual(self.fetch("/"), (200, "text/html"))

    def test_style_and_script_are_served(self):
        self.assertEqual(self.fetch("/style.css"), (200, "text/css"))
        self.assertEqual(self.fetch("/app.js")[0], 200)

    def test_browser_test_page_is_served(self):
        self.assertEqual(self.fetch("/tests/test.html"), (200, "text/html"))


class PublicRepoTest(unittest.TestCase):
    """The repository is public. Checks every file git would commit (tracked or new, not ignored)."""

    @classmethod
    def setUpClass(cls):
        try:
            output = subprocess.run(
                ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
                cwd=ROOT, capture_output=True, text=True, check=True,
            ).stdout
        except (OSError, subprocess.CalledProcessError):
            raise unittest.SkipTest("git is not available")
        this_file = Path(__file__).resolve()
        cls.paths = [p for p in output.splitlines() if (ROOT / p).is_file() and (ROOT / p).resolve() != this_file]

    def scan(self, patterns):
        """Return 'path:line: text' for every line that matches one of the patterns."""
        hits = []
        for path in self.paths:
            try:
                lines = (ROOT / path).read_text(encoding="utf-8").splitlines()
            except UnicodeDecodeError:
                continue  # binary file
            for number, line in enumerate(lines, 1):
                if any(re.search(p, line) for p in patterns):
                    hits.append(f"{path}:{number}: {line.strip()[:120]}")
        return hits

    def test_no_transcripts_environments_or_dependencies(self):
        forbidden = re.compile(r"\.jsonl$|(^|/)(node_modules|\.venv|venv|\.env)(/|$)")
        self.assertEqual([p for p in self.paths if forbidden.search(p)], [])

    def test_no_api_keys_or_passwords(self):
        hits = self.scan([
            r"\bsk-[A-Za-z0-9_-]{20,}",                   # OpenAI / Anthropic style keys
            r"\bAKIA[0-9A-Z]{16}\b",                      # AWS access key
            r"\bgh[pousr]_[A-Za-z0-9]{30,}",              # GitHub token
            r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
            r"(?i)(api[_-]?key|secret|password|token)\s*[:=]\s*['\"][^'\"\s]{8,}",
        ])
        self.assertEqual(hits, [], "possible secrets")

    def test_no_personal_information(self):
        hits = self.scan([
            r"[A-Za-z]:\\+Users\\+[^\\\s]+",              # Windows home folder (has the user name)
            r"/(?:Users|home)/[^/\s]+/",                  # macOS / Linux home folder
            r"[\w.+-]+@(?!example\.)[\w-]+\.[\w.]+",      # email address
        ])
        hits = [h for h in hits if "noreply@" not in h]
        self.assertEqual(hits, [], "personal information")


if __name__ == "__main__":
    unittest.main()
