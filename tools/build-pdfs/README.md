# OpenSanta branded PDFs

Builds print-quality, dark-branded PDFs from the project markdown docs.
Nothing here is committed to the public site automatically; Gav reviews the
PDFs before any HTML links change.

## Setup

Requires Google Chrome (or Chromium) and the bundled Figtree font in
`assets/fonts/`. Noto Sans and Noto Color Emoji are used only as fallbacks
for IPA characters and emoji that Figtree does not cover.

```bash
python3 -m venv tools/build-pdfs/.venv
tools/build-pdfs/.venv/bin/pip install -r tools/build-pdfs/requirements.txt
```

## Build

From the repo root:

```bash
tools/build-pdfs/.venv/bin/python tools/build-pdfs/build.py
```

PDFs are written to `docs/pdf/`. Intermediate HTML is written to
`tools/build-pdfs/_build/` (ignored by git).

Optional flags:

- `--only recording-script` (repeatable) to build one or more documents
- `--preview-dir /path` to also rasterize page 1 and one inner page of each PDF
