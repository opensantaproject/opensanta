#!/usr/bin/env python3
"""Build branded OpenSanta PDFs from the project markdown docs.

Work is local only. This script does not commit, push, or edit HTML links.
"""

from __future__ import annotations

import argparse
import csv
import html
import re
import shutil
import subprocess
import sys
from pathlib import Path

import markdown
from bs4 import BeautifulSoup, NavigableString

TOOLS_DIR = Path(__file__).resolve().parent
REPO_ROOT = TOOLS_DIR.parent.parent
STYLES_PATH = TOOLS_DIR / "styles.css"
STYLES_PRINT_PATH = TOOLS_DIR / "styles-print.css"
LOGO_SVG = REPO_ROOT / "assets" / "logo" / "opensanta-logo.svg"
FIGTREE = REPO_ROOT / "assets" / "fonts" / "Figtree-Variable.ttf"
DEFAULT_PDF_DIR = REPO_ROOT / "docs" / "pdf"
PRINT_PDF_DIR = DEFAULT_PDF_DIR / "print"
BUILD_DIR = TOOLS_DIR / "_build"

NOTO_SANS = Path(
    "/usr/share/fonts/truetype/sand-box/google/Noto Sans/"
    "NotoSans-VariableFont_wdth,wght.ttf"
)
NOTO_EMOJI = Path("/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf")
DEJAVU_MONO = Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf")

# Official lockup crop, in the 1024 viewBox. Measured from a dark render.
# Used in CSS; kept here so the HTML wrapper stays in sync.
LOGO_VIEWBOX = 1024
LOGO_CROP = (148, 88, 744, 838)  # x, y, w, h

CHROME_CANDIDATES = (
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
)

DOCS = [
    {
        "key": "recording-script",
        "src": "script/README.md",
        "out": "recording-script.pdf",
        "label": "Recording script",
        "cover_title": "Recording script",
        "include_script_lines": True,
    },
    {
        "key": "consent",
        "src": "CONSENT.md",
        "out": "consent.pdf",
        "label": "Consent and rights",
        "cover_title": "Consent and rights",
        "cover_meta": "Version 0.6 draft",
    },
    {
        "key": "audio-spec",
        "src": "AUDIO-SPEC.md",
        "out": "audio-spec.pdf",
        "label": "Audio spec",
        "cover_title": "Audio spec",
        "cover_meta": "Sources checked 2026-11-15",
    },
    {
        "key": "contributing",
        "src": "CONTRIBUTING.md",
        "out": "contributing.pdf",
        "label": "Contributing",
        "cover_title": "Contributing",
    },
    {
        "key": "license-dataset",
        "src": "LICENSE-DATASET.md",
        "out": "license-dataset.pdf",
        "label": "Dataset license",
        "cover_title": "Dataset license",
        "cover_meta": "Decided by Gav on 2026-11-15",
    },
    {
        "key": "license-model",
        "src": "LICENSE-MODEL.md",
        "out": "license-model.pdf",
        "label": "Model license",
        "cover_title": "Model license",
        "cover_meta": "Apache-2.0, decided 2026-11-17",
    },
    {
        "key": "roadmap",
        "src": "ROADMAP.md",
        "out": "roadmap.pdf",
        "label": "Roadmap",
        "cover_title": "Roadmap",
    },
    {
        "key": "training-plan",
        "src": "TRAINING-PLAN.md",
        "out": "training-plan.pdf",
        "label": "Training plan",
        "cover_title": "Training plan",
        "cover_meta": "Facts checked 2026-11-15",
    },
]

SECTION_ORDER = [
    "greetings",
    "phonetic",
    "questions",
    "exclamations",
    "numbers",
    "names",
    "holiday",
    "everyday",
    "stories",
    "laughs",
]


def file_url(path: Path) -> str:
    return path.resolve().as_uri()


def find_chrome() -> str:
    for name in CHROME_CANDIDATES:
        found = shutil.which(name)
        if found:
            return found
    raise SystemExit("Google Chrome or Chromium is required to build the PDFs.")


def font_face(family: str, path: Path, weight: str, style: str = "normal") -> str:
    return (
        f"@font-face {{\n"
        f"  font-family: {family};\n"
        f"  src: url('{file_url(path)}') format('truetype');\n"
        f"  font-weight: {weight};\n"
        f"  font-style: {style};\n"
        f"}}\n"
    )


def font_css() -> str:
    parts = [font_face("Figtree", FIGTREE, "300 900")]
    if NOTO_SANS.exists():
        parts.append(font_face('"Noto Sans"', NOTO_SANS, "100 900"))
    if NOTO_EMOJI.exists():
        parts.append(font_face('"Noto Color Emoji"', NOTO_EMOJI, "400"))
    if DEJAVU_MONO.exists():
        parts.append(font_face('"DejaVu Sans Mono"', DEJAVU_MONO, "400"))
    return "\n".join(parts)



LIST_RE = re.compile(r"^(\s*)([-*+]|\d{1,3}\.)\s+")
TABLE_RE = re.compile(r"^\s*\|")
FIELD_RE = re.compile(r"^\*\*[^*]+?:\*\*")



def fix_nested_list_indents(text: str) -> str:
    """Upgrade GitHub-style 2- or 3-space nested lists so Python-Markdown
    nests them (it expects a 4-space step). Wording is unchanged."""
    item_re = re.compile(r"^([ ]*)([-*+]|\d{1,3}\.)\s+")
    lines = text.split("\n")
    out: list[str] = []
    in_fence = False
    open_items: list[int] = []
    bumps: list[tuple[int, int]] = []  # (apply when src_indent > threshold, extra)

    def extra_for(src_indent: int) -> int:
        return sum(extra for threshold, extra in bumps if src_indent > threshold)

    for line in lines:
        stripped = line.lstrip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            out.append(line)
            continue
        if in_fence or not line.strip():
            out.append(line)
            continue

        match = item_re.match(line)
        if match:
            src_indent = len(match.group(1))
            while open_items and open_items[-1] >= src_indent:
                open_items.pop()
            while bumps and bumps[-1][0] >= src_indent:
                bumps.pop()
            if open_items:
                parent = open_items[-1]
                parent_out = parent + extra_for(parent)
                current_out = src_indent + extra_for(src_indent)
                needed = parent_out + 4
                if current_out < needed:
                    bumps.append((src_indent - 1, needed - current_out))
            open_items.append(src_indent)
            out.append((" " * extra_for(src_indent)) + line)
            continue

        src_indent = len(line) - len(line.lstrip(" "))
        out.append((" " * extra_for(src_indent)) + line)
    return "\n".join(out)


def normalize_markdown(text: str) -> str:
    """GitHub-style tightness: lists and tables still parse when the source
    omitted a blank line. Consecutive bold field lines keep their line breaks.
    Words are not changed."""
    text = fix_nested_list_indents(text)
    lines = text.split("\n")
    out: list[str] = []
    for i, line in enumerate(lines):
        prev = out[-1] if out else ""
        if line.strip() and prev.strip():
            # Don't insert a blank line before a nested list, or after a
            # list-item continuation; that would break GFM nesting.
            if (
                LIST_RE.match(line)
                and not LIST_RE.match(prev)
                and not prev.startswith(" ")
                and not line.startswith(" ")
            ):
                out.append("")
            elif TABLE_RE.match(line) and not TABLE_RE.match(prev):
                out.append("")
        nxt = lines[i + 1] if i + 1 < len(lines) else ""
        if FIELD_RE.match(line) and FIELD_RE.match(nxt) and not line.endswith("  "):
            out.append(line + "  ")
        else:
            out.append(line)
    return "\n".join(out)


def next_element(node):
    cur = node.next_sibling
    while cur is not None and isinstance(cur, NavigableString) and not str(cur).strip():
        cur = cur.next_sibling
    return cur


def _already_kept(node) -> bool:
    for parent in node.parents:
        classes = parent.get("class") if hasattr(parent, "get") else None
        if classes and "keep-together" in classes:
            return True
    return False


def _list_fits_one_page(list_el) -> bool:
    items = list_el.find_all("li", recursive=False)
    if len(items) > 8:
        return False
    return len(list_el.get_text()) < 1800


def _wrap_nodes(soup: BeautifulSoup, nodes: list) -> None:
    if not nodes or any(_already_kept(n) for n in nodes):
        return
    wrapper = soup.new_tag("div")
    wrapper["class"] = "keep-together"
    nodes[0].insert_before(wrapper)
    for node in nodes:
        wrapper.append(node)


def wrap_heading_with_pre(soup: BeautifulSoup) -> None:
    """Keep a heading, its short intro, and a following form/code block together."""
    for heading in list(soup.find_all(["h2", "h3"])):
        first = next_element(heading)
        targets = [heading]
        pre = None
        if first and getattr(first, "name", None) == "p":
            targets.append(first)
            second = next_element(first)
            if second and getattr(second, "name", None) == "pre":
                pre = second
        elif first and getattr(first, "name", None) == "pre":
            pre = first
        if pre is None:
            continue
        targets.append(pre)
        _wrap_nodes(soup, targets)


def wrap_leadin_lists(soup: BeautifulSoup) -> None:
    """Keep a short lead-in line that ends with a colon with the list it introduces."""
    for para in list(soup.find_all("p")):
        if _already_kept(para):
            continue
        if not para.get_text(" ", strip=True).endswith(":"):
            continue
        following = next_element(para)
        if following is None or getattr(following, "name", None) not in {"ul", "ol"}:
            continue
        if not _list_fits_one_page(following):
            continue
        nodes = [para, following]
        # If the paragraph is the first thing after a heading, take the heading too.
        prev = para.previous_sibling
        while prev is not None and isinstance(prev, NavigableString) and not str(prev).strip():
            prev = prev.previous_sibling
        if prev is not None and getattr(prev, "name", None) in {"h2", "h3"}:
            nodes.insert(0, prev)
        _wrap_nodes(soup, nodes)


def md_to_html(text: str) -> str:
    return markdown.markdown(
        text,
        extensions=["tables", "fenced_code", "sane_lists"],
        output_format="html5",
        tab_length=4,
    )


def cell_text_len(cell) -> int:
    return len(cell.get_text(" ", strip=True))


def table_should_stack(table) -> bool:
    rows = table.find_all("tr")
    if not rows:
        return False
    ncols = max(len(r.find_all(["th", "td"])) for r in rows)
    max_len = max(
        (cell_text_len(c) for r in rows for c in r.find_all(["th", "td"])),
        default=0,
    )
    # Keep compact comparison / short-cell tables as real tables.
    if ncols >= 5:
        return True
    if ncols >= 4 and max_len >= 80:
        return True
    return False


def convert_wide_tables(soup: BeautifulSoup) -> None:
    for table in list(soup.find_all("table")):
        if not table_should_stack(table):
            continue
        rows = table.find_all("tr")
        if len(rows) < 2:
            continue
        headers = [
            header.decode_contents().strip() or header.get_text(" ", strip=True)
            for header in rows[0].find_all(["th", "td"])
        ]
        wrapper = soup.new_tag("div")
        wrapper["class"] = "kv-cards"
        for row in rows[1:]:
            cells = row.find_all(["th", "td"])
            if not cells:
                continue
            card = soup.new_tag("article")
            card["class"] = "kv-card"
            first_html = cells[0].decode_contents().strip()
            title = soup.new_tag("div")
            title["class"] = "kv-card-title"
            title.append(BeautifulSoup(first_html or "&nbsp;", "html.parser"))
            if headers and headers[0]:
                title_label = soup.new_tag("div")
                title_label["class"] = "kv-label"
                title_label.append(BeautifulSoup(headers[0], "html.parser"))
                # Keep the first-column header visible above the title when it
                # is a real label (e.g. "Component").
                card.append(title_label)
            card.append(title)
            for idx, cell in enumerate(cells[1:], start=1):
                kv = soup.new_tag("div")
                kv["class"] = "kv"
                label = soup.new_tag("div")
                label["class"] = "kv-label"
                label.append(
                    BeautifulSoup(
                        (headers[idx] if idx < len(headers) else "") or "&nbsp;",
                        "html.parser",
                    )
                )
                value = soup.new_tag("div")
                value["class"] = "kv-value"
                value.append(BeautifulSoup(cell.decode_contents().strip() or "&nbsp;", "html.parser"))
                kv.append(label)
                kv.append(value)
                card.append(kv)
            wrapper.append(card)
        table.replace_with(wrapper)


def strip_leading_h1(soup: BeautifulSoup) -> str:
    h1 = soup.find("h1")
    title = ""
    if h1:
        title = h1.get_text(" ", strip=True)
        h1.decompose()
    # Drop a leading empty residue.
    if soup.contents:
        first = soup.contents[0]
        if isinstance(first, NavigableString) and not str(first).strip():
            first.extract()
    return title


def linkify_bare_urls(soup: BeautifulSoup) -> None:
    """Turn leftover bare http(s) URLs into links, without changing their text."""

    url_re = re.compile(r"(https?://[^\s<>]+)")
    for text_node in list(soup.find_all(string=True)):
        parent = text_node.parent
        if parent is None or parent.name in {"a", "code", "pre", "script", "style"}:
            continue
        value = str(text_node)
        if "http://" not in value and "https://" not in value:
            continue
        parts = url_re.split(value)
        if len(parts) == 1:
            continue
        fragment = BeautifulSoup("", "html.parser")
        for part in parts:
            if url_re.fullmatch(part):
                # Trim trailing punctuation that is almost never part of a URL.
                trailing = ""
                core = part
                while core and core[-1] in ".,;:)]":
                    trailing = core[-1] + trailing
                    core = core[:-1]
                anchor = fragment.new_tag("a", href=core)
                anchor.string = core
                fragment.append(anchor)
                if trailing:
                    fragment.append(trailing)
            else:
                fragment.append(part)
        text_node.replace_with(fragment)


def load_script_lines() -> list[dict[str, str]]:
    path = REPO_ROOT / "script" / "lines.tsv"
    with path.open(encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle, delimiter="\t"))


def group_lines(rows: list[dict[str, str]], pack: str) -> list[tuple[str, list[dict[str, str]]]]:
    chosen = [row for row in rows if row["pack"] == pack]
    groups: list[tuple[str, list[dict[str, str]]]] = []
    for section in SECTION_ORDER:
        items = [row for row in chosen if row["section"] == section]
        if items:
            groups.append((section, items))
    # Any unexpected section, in first-seen order.
    known = set(SECTION_ORDER)
    extras: dict[str, list[dict[str, str]]] = {}
    for row in chosen:
        if row["section"] not in known:
            extras.setdefault(row["section"], []).append(row)
    for section, items in extras.items():
        groups.append((section, items))
    return groups


def list_packs(rows: list[dict[str, str]]) -> list[str]:
    """Core first, then P01..Pn in numeric order, then any other pack names."""
    packs = {row["pack"] for row in rows if row.get("pack")}

    def key(pack: str):
        if pack == "core":
            return (0, 0, pack)
        if pack.startswith("P") and pack[1:].isdigit():
            return (1, int(pack[1:]), pack)
        return (2, 0, pack)

    return sorted(packs, key=key)


def render_script_lines() -> str:
    rows = load_script_lines()
    packs = list_packs(rows)
    parts = ['<section class="script-lines">', "<h2>Script lines</h2>"]
    for pack in packs:
        groups = group_lines(rows, pack)
        if not groups:
            continue
        heading = "Core set" if pack == "core" else f"Pack {pack[1:]}"
        parts.append(f"<h2>{html.escape(heading)}</h2>")
        for section, items in groups:
            section_title = section[:1].upper() + section[1:]
            parts.append(f"<h3>{html.escape(section_title)}</h3>")
            for row in items:
                line_id = row["line_id"]
                direction = (row.get("direction") or "").strip()
                meta = f'<span class="line-id">{html.escape(line_id)}</span>'
                if row["pack"] != "core":
                    pack_no = row["pack"][1:] if row["pack"].startswith("P") else row["pack"]
                    meta += (
                        f'<span class="line-pack">pack {html.escape(pack_no)}</span>'
                    )
                parts.append(
                    f'<article class="line" id="{html.escape(line_id)}">'
                    f'<div class="line-meta">{meta}</div>'
                    f'<p class="line-text">{html.escape(row["text"])}</p>'
                )
                if direction:
                    parts.append(
                        '<p class="line-direction">'
                        '<span class="dir-label">direction (do not read aloud): </span>'
                        f"{html.escape(direction)}"
                        "</p>"
                    )
                parts.append("</article>")
    parts.append("</section>")
    return "\n".join(parts)


def wrap_document(
    title: str,
    label: str,
    body_html: str,
    cover_meta: str = "",
    print_theme: bool = False,
) -> str:
    styles = STYLES_PATH.read_text(encoding="utf-8")
    if print_theme:
        styles += "\n" + STYLES_PRINT_PATH.read_text(encoding="utf-8")
    label_css = f"""
:root {{ --doc-label: "{label}"; }}
@page {{
  @top-right {{
    content: "{label}";
  }}
}}
"""
    meta_html = ""
    if cover_meta:
        meta_html = f'      <p class="cover-meta">{html.escape(cover_meta)}</p>\n'
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{html.escape(title)} — OpenSanta Project</title>
  <style>
{font_css()}
{styles}
{label_css}
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover-bar" aria-hidden="true"></div>
    <div class="cover-main">
      <div class="cover-logo-wrap">
        <img src="{file_url(LOGO_SVG)}" alt="OpenSanta Project">
      </div>
      <h1 class="cover-title">{html.escape(title)}</h1>
      <div class="cover-rule" aria-hidden="true"></div>
{meta_html}    </div>
    <footer class="cover-footer">
      <span class="email">support@opensanta.org</span>
      <span class="site">opensanta.org</span>
    </footer>
  </section>
  <main class="doc">
{body_html}
  </main>
</body>
</html>
"""


def build_html(spec: dict, print_theme: bool = False) -> tuple[str, Path]:
    src = REPO_ROOT / spec["src"]
    text = normalize_markdown(src.read_text(encoding="utf-8"))
    fragment = md_to_html(text)
    soup = BeautifulSoup(fragment, "html.parser")
    strip_leading_h1(soup)
    title = spec.get("cover_title") or spec["label"]
    convert_wide_tables(soup)
    linkify_bare_urls(soup)
    wrap_heading_with_pre(soup)
    wrap_leadin_lists(soup)
    body = soup.decode_contents().strip()
    if spec.get("include_script_lines"):
        body = body + "\n" + render_script_lines()
    html_doc = wrap_document(
        title,
        spec["label"],
        body,
        cover_meta=spec.get("cover_meta", ""),
        print_theme=print_theme,
    )
    html_dir = BUILD_DIR / "print" if print_theme else BUILD_DIR
    html_dir.mkdir(parents=True, exist_ok=True)
    html_path = html_dir / f"{spec['key']}.html"
    html_path.write_text(html_doc, encoding="utf-8")
    return title, html_path


def chrome_print(chrome: str, html_path: Path, pdf_path: Path) -> None:
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_pdf = pdf_path.with_suffix(".building.pdf")
    if tmp_pdf.exists():
        tmp_pdf.unlink()
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-pdf-header-footer",
        "--disable-extensions",
        "--disable-background-networking",
        "--no-first-run",
        "--no-default-browser-check",
        "--hide-scrollbars",
        f"--print-to-pdf={tmp_pdf}",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        file_url(html_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0 or not tmp_pdf.exists():
        sys.stderr.write(result.stdout)
        sys.stderr.write(result.stderr)
        raise SystemExit(f"Chrome failed to print {html_path.name} (exit {result.returncode})")
    tmp_pdf.replace(pdf_path)


def pdf_page_count(pdf_path: Path) -> int:
    result = subprocess.run(
        ["pdfinfo", str(pdf_path)],
        capture_output=True,
        text=True,
        check=True,
    )
    for line in result.stdout.splitlines():
        if line.startswith("Pages:"):
            return int(line.split(":", 1)[1].strip())
    raise RuntimeError(f"Could not read page count for {pdf_path}")


def render_previews(pdf_path: Path, preview_dir: Path, page_count: int) -> list[Path]:
    preview_dir.mkdir(parents=True, exist_ok=True)
    stem = pdf_path.stem
    prefix = preview_dir / stem
    # Page 1 (cover) and one inner page (page 2, or the last page if only 2,
    # or a mid page for long docs). Always emit page 1; emit an inner page
    # when the doc has more than one page.
    pages = [1]
    if page_count >= 2:
        # Page 2 is the first body page after the cover.
        pages.append(2)
    written: list[Path] = []
    for page in pages:
        dest = preview_dir / f"{stem}-p{page}.png"
        subprocess.run(
            [
                "pdftoppm",
                "-png",
                "-r",
                "160",
                "-f",
                str(page),
                "-l",
                str(page),
                "-singlefile",
                str(pdf_path),
                str(dest.with_suffix("")),
            ],
            check=True,
            capture_output=True,
        )
        written.append(dest)
    return written


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--only",
        action="append",
        dest="only",
        help="Build only this document key (repeatable). Example: --only recording-script",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=None,
        help="Directory for finished PDFs (default: docs/pdf, or docs/pdf/print with --print)",
    )
    parser.add_argument(
        "--print",
        dest="print_theme",
        action="store_true",
        help="Build the light printable set (default output: docs/pdf/print)",
    )
    parser.add_argument(
        "--preview-dir",
        type=Path,
        help="If set, write PNG previews of page 1 and one inner page here",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not FIGTREE.exists():
        raise SystemExit(f"Missing Figtree font: {FIGTREE}")
    if not LOGO_SVG.exists():
        raise SystemExit(f"Missing logo: {LOGO_SVG}")
    if not STYLES_PATH.exists():
        raise SystemExit(f"Missing styles: {STYLES_PATH}")
    if args.print_theme and not STYLES_PRINT_PATH.exists():
        raise SystemExit(f"Missing print styles: {STYLES_PRINT_PATH}")
    if args.out_dir is None:
        args.out_dir = PRINT_PDF_DIR if args.print_theme else DEFAULT_PDF_DIR

    selected = DOCS
    if args.only:
        keys = {key.lower() for key in args.only}
        selected = [doc for doc in DOCS if doc["key"] in keys]
        missing = keys - {doc["key"] for doc in selected}
        if missing:
            raise SystemExit(f"Unknown document key(s): {', '.join(sorted(missing))}")

    chrome = find_chrome()
    print(f"Using Chrome at {chrome}")
    results = []
    for spec in selected:
        title, html_path = build_html(spec, print_theme=args.print_theme)
        pdf_path = args.out_dir / spec["out"]
        print(f"Building {spec['key']}: {title}")
        chrome_print(chrome, html_path, pdf_path)
        pages = pdf_page_count(pdf_path)
        previews: list[Path] = []
        if args.preview_dir:
            previews = render_previews(pdf_path, args.preview_dir, pages)
        print(f"  -> {pdf_path} ({pages} pages)")
        results.append((spec, title, pdf_path, pages, previews))

    print("\nDone.")
    for spec, title, pdf_path, pages, previews in results:
        print(f"  {spec['key']}: {pages}p  {pdf_path}")


if __name__ == "__main__":
    main()
