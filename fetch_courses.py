#!/usr/bin/env python3
"""Download free course lists (en, bn, hi) from EbookFoundation/free-programming-books
and convert them to JSON files in ./data/."""
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://raw.githubusercontent.com/EbookFoundation/free-programming-books/main/courses/free-courses-{}.md"
LANGS = {"en": "English", "bn": "Bangla", "hi": "Hindi"}
OUT = Path(__file__).parent / "data"

HEADING = re.compile(r"^(#{2,6})\s+(.*?)\s*$")
ITEM = re.compile(r"^\s*[*-]\s+\[(?P<title>[^\]]+)\]\((?P<url>[^)\s]+)\)(?P<rest>.*)$")
PAREN = re.compile(r"\(([^()]*)\)")


def parse_rest(rest):
    """Split the text after the link into authors and notes, e.g. ' - Jane Doe (YouTube)'."""
    notes = [n.strip() for n in PAREN.findall(rest) if n.strip()]
    rest = PAREN.sub("", rest)
    authors = []
    m = re.search(r"-\s*(.+)$", rest)
    if m:
        authors = [a.strip() for a in re.split(r",| and ", m.group(1)) if a.strip()]
    return authors, notes


def parse(md, lang):
    courses, path = [], []
    for line in md.splitlines():
        h = HEADING.match(line)
        if h:
            level = len(h.group(1)) - 2  # "##" is the top level
            path = path[:level] + [h.group(2)]
            continue
        m = ITEM.match(line)
        if not m or m.group("url").startswith("#"):  # skip table-of-contents anchors
            continue
        authors, notes = parse_rest(m.group("rest"))
        courses.append({
            "title": m.group("title").strip(),
            "url": m.group("url"),
            "authors": authors,
            "notes": notes,
            "category": path[1] if len(path) > 1 else (path[0] if path else None),
            "section_path": path[1:] if len(path) > 1 else path,
            "language": lang,
        })
    return courses


def main():
    OUT.mkdir(exist_ok=True)
    everything = {}
    for code, name in LANGS.items():
        url = BASE.format(code)
        md = urllib.request.urlopen(url, timeout=30).read().decode("utf-8")
        (OUT / f"free-courses-{code}.md").write_text(md, encoding="utf-8")
        courses = parse(md, name)
        doc = {"language": name, "code": code, "source": url,
               "license": "CC BY 4.0 (EbookFoundation/free-programming-books)",
               "count": len(courses), "courses": courses}
        (OUT / f"courses-{code}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
        everything[code] = doc
        print(f"{name}: {len(courses)} courses")
    (OUT / "courses-all.json").write_text(json.dumps(everything, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
