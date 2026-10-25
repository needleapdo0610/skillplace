import importlib.util
import os
import subprocess
import tempfile
import unittest
from pathlib import Path

SPEC = importlib.util.spec_from_file_location("kb", Path(__file__).parent.parent / "scripts" / "kb.py")
kb = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(kb)

DOC = "---\nsummary: s\ncovers:\n{covers}\nlast_verified: 2026-01-01 @ {sha}\n---\n# T\n{body}\n"


def sh(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout.strip()


class Repo(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.old = os.getcwd()
        os.chdir(self.tmp.name)
        sh("git", "init", "-q")
        sh("git", "config", "user.email", "t@t")
        sh("git", "config", "user.name", "t")

    def tearDown(self):
        os.chdir(self.old)
        self.tmp.cleanup()

    def write(self, path, text):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_text(text)

    def commit(self, msg="c"):
        sh("git", "add", "-A")
        sh("git", "commit", "-q", "-m", msg)
        return sh("git", "rev-parse", "--short", "HEAD")

    def docs(self):
        return kb.load_docs(kb.tracked_files())

    def doc(self, path, covers, sha="0000000", body=""):
        lines = "\n".join(f"  - {c}" for c in covers)
        self.write(path, DOC.format(covers=lines, sha=sha, body=body))


class OwnerTest(Repo):
    def test_longest_glob_wins_and_root_is_fallback(self):
        self.doc("CONTEXT.md", ["*"])
        self.doc("api/CONTEXT.md", ["api/*"])
        self.doc("api/CONTEXT.billing.md", ["api/billing_*.py"])
        for f in ["api/billing_x.py", "api/users.py", "web/app.js"]:
            self.write(f, "x")
        self.commit()
        docs = self.docs()
        self.assertEqual(kb.owner("api/billing_x.py", docs), "api/CONTEXT.billing.md")
        self.assertEqual(kb.owner("api/users.py", docs), "api/CONTEXT.md")
        self.assertEqual(kb.owner("web/app.js", docs), "CONTEXT.md")


class CheckTest(Repo):
    def test_dead_glob_dead_path_and_stale_map_are_errors(self):
        self.doc("CONTEXT.md", ["nothing/*"], body="see `src/missing.py`")
        self.write("src/a.py", "x")
        self.commit()
        out = self.run_cmd(kb.cmd_check)
        self.assertEqual(out[0], 1)
        self.assertIn("matches no tracked file: nothing/*", out[1])
        self.assertIn("does not exist: src/missing.py", out[1])
        self.assertIn("CONTEXT-MAP.md is stale", out[1])

    def test_clean_repo_passes(self):
        self.doc("CONTEXT.md", ["*"], body="see `src/a.py`")
        self.write("src/a.py", "x")
        self.commit()
        kb.cmd_map(self.docs())
        self.commit()
        self.assertEqual(self.run_cmd(kb.cmd_check)[0], 0)

    def run_cmd(self, fn):
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = fn(kb.tracked_files(), self.docs())
        return code, buf.getvalue()


class StaleTest(Repo):
    def run_stale(self):
        import contextlib
        import io
        buf = io.StringIO()
        with contextlib.redirect_stdout(buf):
            code = kb.cmd_stale(self.docs())
        return code, buf.getvalue()

    def test_source_commit_after_last_verified_is_stale_but_tests_and_md_are_not(self):
        self.write("src/a.py", "1")
        sha = self.commit("base")
        self.doc("CONTEXT.md", ["*"], sha=sha)
        self.commit("doc")
        self.assertEqual(self.run_stale()[0], 0)
        self.write("src/tests/test_a.py", "t")
        self.write("notes.md", "n")
        self.commit("noise")
        self.assertEqual(self.run_stale()[0], 0)
        self.write("src/a.py", "2")
        self.commit("change")
        code, out = self.run_stale()
        self.assertEqual(code, 1)
        self.assertIn("CONTEXT.md stale", out)

    def test_missing_or_unknown_sha_is_an_error(self):
        self.write("src/a.py", "1")
        self.doc("CONTEXT.md", ["*"], sha="deadbeef")
        self.commit()
        code, out = self.run_stale()
        self.assertEqual(code, 1)
        self.assertIn("sha not found", out)


class ChangedTest(Repo):
    def test_business_file_without_doc_update_is_flagged(self):
        self.write("src/a.py", "1")
        self.doc("CONTEXT.md", ["*"])
        self.commit("base")
        sh("git", "checkout", "-q", "-b", "feat")
        self.write("src/a.py", "2")
        self.commit("change")
        base = sh("git", "rev-parse", "HEAD~1")
        self.assertEqual(kb.cmd_changed(base, self.docs()), 1)
        self.write("CONTEXT.md", Path("CONTEXT.md").read_text() + "\nupdated\n")
        self.commit("doc")
        self.assertEqual(kb.cmd_changed(base, self.docs()), 0)


if __name__ == "__main__":
    unittest.main()
