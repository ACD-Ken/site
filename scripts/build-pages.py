"""Stage tracked public files for Pages and apply a per-page browser policy."""

import argparse
import base64
import hashlib
import json
import shutil
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
PUBLIC_PAGES = set("""
index.html ai-index.html projects.html portfolio.html kw-portfolio.html
privacy.html setup-guide.html travel.html vibe-code.html hero-preview.html
inventory-agent.html hr-agent-v2.html m7-client-lead-agent.html
lucky7-predictions.html lucky7-strikes.html n8n-demo/index.html
DMB/index.html DMB/signup.html DMB/login.html DMB/reset-password.html
DMB/dashboard.html DMB/download.html DMB/blog.html DMB/blog-post.html
DMB/admin-login.html DMB/admin.html DMB/privacy-policy.html DMB/hero-animated.html
""".split())
PUBLIC_FILES = set("""
chatbot.css chatbot.js ai-portfolio.css og-image.svg KenWong_CV_2026May.pdf
content/setup-guide.md data/travel-stories.json
""".split())
PUBLIC_ASSETS = {
    "css": {".css"},
    "js": {".js"},
    "content/hr-agent": {".json", ".md", ".mp4", ".png"},
    "content/inventory-agent": {".jpg", ".json", ".md", ".mp4", ".png"},
    "content/m7-client-lead-agent": {".csv", ".json", ".md", ".png", ".sql", ".svg"},
}
CHAT = "https://acd-bot-production.up.railway.app"
DMB_DB = "https://bjpwckpmktnwtdzpmnvn.supabase.co"
LUCKY_DB = "nkvablrvbbbbfkwttvoe.supabase.co"


def is_public(path):
    key = path.as_posix()
    return key in PUBLIC_PAGES or key in PUBLIC_FILES or (
        not path.name.startswith(".")
        and path.suffix in PUBLIC_ASSETS.get(path.parent.as_posix(), set())
    )


def csp_hash(script):
    digest = hashlib.sha256(script.encode("utf-8")).digest()
    return "'sha256-" + base64.b64encode(digest).decode("ascii") + "'"


class PageScripts(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.inline = None
        self.sources = set()
        self.handlers = set()
        self.head_end = None
        self.lines = html.splitlines(keepends=True)
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "head":
            line, column = self.getpos()
            self.head_end = sum(map(len, self.lines[:line - 1])) + column + len(self.get_starttag_text())
        for name, value in attrs.items():
            if name.startswith("on") and value:
                self.handlers.add(csp_hash(value))
        if tag != "script":
            return
        src = attrs.get("src")
        if src:
            url = urlsplit(src)
            if url.scheme or url.netloc:
                if url.scheme != "https" or url.netloc not in {"cdn.tailwindcss.com", "cdn.jsdelivr.net"}:
                    raise ValueError(f"Unexpected external script source: {src}")
                self.sources.add(f"{url.scheme}://{url.netloc}{url.path}")
        elif attrs.get("type") in {None, "module", "text/javascript"}:
            self.inline = []

    def handle_data(self, data):
        if self.inline is not None:
            self.inline.append(data)

    def handle_endtag(self, tag):
        if tag == "script" and self.inline is not None:
            self.sources.add(csp_hash("".join(self.inline)))
            self.inline = None


def secure_page(path, html):
    scripts = PageScripts(html)
    if scripts.head_end is None:
        raise ValueError(f"No head element in {path}")

    connect = ["'self'"]
    if path.parent.name == "DMB":
        connect.append(DMB_DB)
    if path.name == "lucky7-predictions.html":
        connect.extend([f"https://{LUCKY_DB}", f"wss://{LUCKY_DB}"])
    if path.name == "lucky7-strikes.html":
        connect.append("https://lucky7-mobile-backend-production.up.railway.app")
    if "chatbot.js" in html:
        connect.append(CHAT)

    script_sources = ["'self'", *sorted(scripts.sources)]
    # The DMB pages use Tailwind's in-browser compiler.
    if "https://cdn.tailwindcss.com" in scripts.sources:
        script_sources.append("'unsafe-eval'")
    handlers = ["'unsafe-hashes'", *sorted(scripts.handlers)] if scripts.handlers else ["'none'"]
    policy = "; ".join([
        "default-src 'none'",
        "base-uri 'none'",
        "object-src 'none'",
        "form-action 'self'",
        "script-src " + " ".join(script_sources),
        "script-src-attr " + " ".join(handlers),
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "media-src 'self'",
        "connect-src " + " ".join(connect),
    ])
    offset = scripts.head_end
    meta = (
        f'\n    <meta http-equiv="Content-Security-Policy" content="{policy}">'
        '\n    <meta name="referrer" content="strict-origin-when-cross-origin">'
    )
    return html[:offset] + meta + html[offset:]


def stage(output):
    tracked = subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).decode("utf-8").split("\0")
    travel = json.loads((ROOT / "data/travel-stories.json").read_text(encoding="utf-8"))
    if any(story.get("visibility") != "public" for story in travel):
        raise ValueError("The travel dataset must contain only public stories")
    travel_images = {urlsplit(story["image"]).path for story in travel if story.get("image")}
    output.mkdir()
    for path in sorted({Path(name) for name in tracked if name}):
        is_travel_image = path.parent.as_posix() == "images/travel" and path.as_posix() in travel_images
        if not is_public(path) and not is_travel_image:
            continue
        source = ROOT / path
        if not source.is_file() or source.resolve() != source:
            raise ValueError(f"Missing file or symbolic link in public assets: {path}")
        target = output / path
        target.parent.mkdir(parents=True, exist_ok=True)
        if path.as_posix() in PUBLIC_PAGES:
            target.write_text(secure_page(path, source.read_text(encoding="utf-8")), encoding="utf-8")
        else:
            shutil.copyfile(source, target)
    (output / ".nojekyll").touch()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path)
    stage(parser.parse_args().output)
