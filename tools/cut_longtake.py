#!/usr/bin/env python3
"""OpenSanta Project: split a long-take recording into one file per line.

Usage:
  python tools/cut_longtake.py C0042_P03_longtake.wav [--out-dir DIR] [--include-core]

The take is split at silences of about 2 seconds (the gap between lines).
Shorter pauses, including the pause after the spoken line ID, stay inside
the clip. Spoken line IDs are left at the start of each clip on purpose:
auto-trimming them from a short gap is brittle, so a person trims them
while checking the review CSV.

Segment order is mapped to pack lines in script/lines.tsv order. If the
take also includes the core set (3 extra segments) or you pass
--include-core, the first three clips are L013, L002, L014 (the recording
order in CONTRIBUTING.md), then the pack lines.

A review CSV is written next to the clips (segment, line ID, start, end,
duration, flags). Check every row before using the clips.
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

FRAME_S = 0.02
MIN_GAP_S = 1.5          # silences at least this long are cuts (~2 s target)
DEFAULT_PAD_S = 0.4      # lead-in/tail padding on each clip (AUDIO-SPEC 0.3-0.5 s)
DUR_MIN_S = 0.8          # review flags, same idea as qc_check per-line limits
DUR_MAX_S = 25.0
# Core set in the order CONTRIBUTING.md asks people to record it.
CORE_ORDER = ["L013", "L002", "L014"]
LONGTAKE_RE = r"^(C\d{4})_(P\d{2})_longtake\.wav$"

_LONGTAKE_RE = re.compile(LONGTAKE_RE)
ID_RE = re.compile(r"^C\d{4}$")
PACK_RE = re.compile(r"^P\d{2}$")


def db(x: float) -> float:
    return 20 * np.log10(max(x, 1e-10))


def load_script(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        # Preserve file order (line_id order in lines.tsv).
        return list(csv.DictReader(f, delimiter="\t"))


def pack_line_ids(rows: list[dict], pack: str) -> list[str]:
    return [r["line_id"] for r in rows if r["pack"] == pack]


def known_packs(rows: list[dict]) -> set[str]:
    return {r["pack"] for r in rows} - {"core"}


def frame_rms_db(x: np.ndarray, sr: int, frame_s: float = FRAME_S) -> np.ndarray:
    n = max(1, int(sr * frame_s))
    usable = len(x) // n * n
    if usable < n:
        return np.array([db(float(np.sqrt(np.mean(x ** 2))))], dtype=np.float64)
    frames = x[:usable].reshape(-1, n)
    rms = np.sqrt(np.mean(frames ** 2, axis=1))
    return 20 * np.log10(np.maximum(rms, 1e-10))


def noise_floor_db(rms_db: np.ndarray, frame_s: float = FRAME_S) -> float:
    win = max(1, int(0.25 / frame_s))
    if len(rms_db) < win:
        return float(rms_db.min()) if len(rms_db) else -80.0
    lin = 10 ** (rms_db / 10)
    mov = np.convolve(lin, np.ones(win) / win, mode="valid")
    return 10 * np.log10(max(float(mov.min()), 1e-20))


def find_speech_segments(
    x: np.ndarray,
    sr: int,
    min_gap_s: float = MIN_GAP_S,
    frame_s: float = FRAME_S,
) -> list[tuple[float, float]]:
    """Return (start_s, end_s) for regions of speech split by silences >= min_gap_s.

    Short pauses (for example the pause after a spoken line ID) are kept
    inside the segment. Times are the speech bounds, without extra padding.
    """
    if len(x) < int(sr * 0.05):
        return []
    rms_db = frame_rms_db(x, sr, frame_s)
    noise = noise_floor_db(rms_db, frame_s)
    peak = float(np.max(np.abs(x)))
    pk = db(peak)
    thr = max(noise + 15.0, pk - 40.0, -55.0)
    speech = rms_db > thr
    if not speech.any():
        return []

    min_gap_frames = max(1, int(round(min_gap_s / frame_s)))
    # Long silences: runs of False at least min_gap_frames long.
    padded = np.concatenate([[True], speech, [True]])
    diffs = np.diff(padded.astype(np.int8))
    sil_starts = np.flatnonzero(diffs == -1)
    sil_ends = np.flatnonzero(diffs == 1)
    long_gaps = [(int(a), int(b)) for a, b in zip(sil_starts, sil_ends) if (b - a) >= min_gap_frames]

    n = len(speech)
    bounds: list[tuple[int, int]] = []
    prev = 0
    for a, b in long_gaps:
        bounds.append((prev, a))
        prev = b
    bounds.append((prev, n))

    segs: list[tuple[float, float]] = []
    for a, b in bounds:
        if b <= a:
            continue
        region = speech[a:b]
        if not region.any():
            continue
        idx = np.flatnonzero(region)
        start_f = a + int(idx[0])
        end_f = a + int(idx[-1]) + 1
        segs.append((start_f * frame_s, end_f * frame_s))
    return segs


def expected_line_ids(rows: list[dict], pack: str, n_segments: int, include_core: bool) -> list[str]:
    pack_ids = pack_line_ids(rows, pack)
    use_core = include_core or (n_segments == len(pack_ids) + len(CORE_ORDER))
    if use_core:
        return CORE_ORDER + pack_ids
    return pack_ids


def pad_bounds(start_s: float, end_s: float, dur_s: float, pad_s: float) -> tuple[float, float]:
    return max(0.0, start_s - pad_s), min(dur_s, end_s + pad_s)


def parse_name(path: Path) -> tuple[str | None, str | None]:
    m = _LONGTAKE_RE.match(path.name)
    if not m:
        return None, None
    return m.group(1), m.group(2)


def cut_longtake(
    path: Path,
    out_dir: Path,
    rows: list[dict],
    contributor: str,
    pack: str,
    min_gap_s: float = MIN_GAP_S,
    pad_s: float = DEFAULT_PAD_S,
    include_core: bool = False,
    force: bool = False,
) -> tuple[list[dict], Path]:
    info = sf.info(str(path))
    data, sr = sf.read(str(path), dtype="float64", always_2d=True)
    if info.channels == 1 or (info.channels == 2 and np.allclose(data[:, 0], data[:, 1], atol=1e-4)):
        x = data[:, 0]
    else:
        x = data.mean(axis=1)
    dur_s = len(x) / sr
    segments = find_speech_segments(x, sr, min_gap_s=min_gap_s)
    expected = expected_line_ids(rows, pack, len(segments), include_core)
    count_mismatch = len(segments) != len(expected)

    n = max(len(segments), len(expected))
    review: list[dict] = []
    for i in range(n):
        line_id = expected[i] if i < len(expected) else ""
        flags: list[str] = []
        start_s = end_s = padded_start = padded_end = clip_dur = None
        filename = f"{contributor}_{line_id}.wav" if line_id else ""
        if i >= len(segments):
            flags.append("missing")
        else:
            start_s, end_s = segments[i]
            padded_start, padded_end = pad_bounds(start_s, end_s, dur_s, pad_s)
            clip_dur = padded_end - padded_start
            if clip_dur < DUR_MIN_S:
                flags.append("too-short")
            elif clip_dur > DUR_MAX_S:
                flags.append("too-long")
            if i >= len(expected):
                flags.append("extra")
                filename = f"{contributor}_extra{i + 1:02d}.wav"
        if count_mismatch:
            flags.append("count-mismatch")
        review.append({
            "segment": i + 1,
            "line_id": line_id,
            "filename": filename,
            "start_s": "" if padded_start is None else f"{padded_start:.3f}",
            "end_s": "" if padded_end is None else f"{padded_end:.3f}",
            "duration_s": "" if clip_dur is None else f"{clip_dur:.3f}",
            "flags": ",".join(flags),
        })

    out_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for row, i in zip(review, range(len(review))):
        if not row["filename"] or not row["start_s"]:
            continue
        dest = out_dir / row["filename"]
        written.append(dest)
        if dest.exists() and not force:
            raise FileExistsError(f"{dest} already exists (pass --force to overwrite)")
        a = int(round(float(row["start_s"]) * sr))
        b = int(round(float(row["end_s"]) * sr))
        sf.write(str(dest), x[a:b], sr, subtype=info.subtype)

    csv_path = out_dir / f"{contributor}_{pack}_longtake_review.csv"
    with csv_path.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["segment", "line_id", "filename", "start_s", "end_s", "duration_s", "flags"],
        )
        w.writeheader()
        w.writerows(review)
    return review, csv_path


def main(argv=None):
    ap = argparse.ArgumentParser(
        description="Split an OpenSanta long-take WAV into one file per line, and write a review CSV.",
        epilog="Spoken line IDs are left in each clip. A reviewer should trim them and "
               "check the review CSV before the clips are used. Exit code 1 if the "
               "segment count does not match the expected lines.",
    )
    ap.add_argument("wav", type=Path, help="long-take file, e.g. C0042_P03_longtake.wav")
    ap.add_argument("--out-dir", type=Path, help="folder for clips and the review CSV "
                    "(default: <wav stem>_clips/ next to the take)")
    ap.add_argument("--script", type=Path,
                    default=Path(__file__).resolve().parent.parent / "script" / "lines.tsv")
    ap.add_argument("--contributor", help="contributor ID (default: parsed from the file name)")
    ap.add_argument("--pack", help="pack ID, e.g. P03 (default: parsed from the file name)")
    ap.add_argument("--min-gap", type=float, default=MIN_GAP_S,
                    help=f"minimum silence between lines in seconds (default {MIN_GAP_S})")
    ap.add_argument("--pad", type=float, default=DEFAULT_PAD_S,
                    help=f"silence padding on each clip in seconds (default {DEFAULT_PAD_S})")
    ap.add_argument("--include-core", action="store_true",
                    help="treat the first 3 segments as the core set (L013, L002, L014), "
                         "then the pack. Also auto-detected when the segment count is pack+3.")
    ap.add_argument("--force", action="store_true", help="overwrite existing clip files")
    a = ap.parse_args(argv)

    if not a.wav.is_file():
        print(f"error: {a.wav} is not a file", file=sys.stderr)
        return 2
    parsed_cid, parsed_pack = parse_name(a.wav)
    cid = a.contributor or parsed_cid
    pack = (a.pack or parsed_pack or "").upper()
    if not cid or not ID_RE.match(cid):
        print("error: contributor ID missing or not C####; pass --contributor or use a "
              "C0042_P03_longtake.wav file name", file=sys.stderr)
        return 2
    if not PACK_RE.match(pack):
        print("error: pack ID missing or not P##; pass --pack or use a "
              "C0042_P03_longtake.wav file name", file=sys.stderr)
        return 2
    if not a.script.is_file():
        print(f"error: script not found: {a.script}", file=sys.stderr)
        return 2

    rows = load_script(a.script)
    packs = known_packs(rows)
    if pack not in packs:
        print(f"error: {pack} isn't a pack in {a.script}", file=sys.stderr)
        return 2

    out_dir = a.out_dir or a.wav.with_name(a.wav.stem + "_clips")
    try:
        review, csv_path = cut_longtake(
            a.wav, out_dir, rows, cid, pack,
            min_gap_s=a.min_gap, pad_s=a.pad,
            include_core=a.include_core, force=a.force,
        )
    except FileExistsError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2
    except Exception as e:
        print(f"error: cannot cut {a.wav}: {e}", file=sys.stderr)
        return 2

    n_clips = sum(1 for r in review if r["start_s"])
    n_expected = len(expected_line_ids(rows, pack, n_clips, a.include_core))
    mismatch = any("count-mismatch" in r["flags"] for r in review)
    print(f"OpenSanta long-take cut: {cid} {pack}")
    print(f"  input:    {a.wav}")
    print(f"  clips:    {n_clips} written to {out_dir}")
    print(f"  expected: {n_expected} lines")
    print(f"  review:   {csv_path}")
    if mismatch:
        print("  WARNING: segment count does not match the expected lines. Check the review CSV.")
    flagged = [r for r in review if r["flags"]]
    for r in flagged:
        print(f"  [{r['flags']}] segment {r['segment']} {r['line_id'] or '(unmapped)'} "
              f"{r['duration_s'] + ' s' if r['duration_s'] else ''}".rstrip())
    print("Spoken line IDs are still at the start of each clip. A reviewer should trim them.")
    return 1 if mismatch else 0


if __name__ == "__main__":
    sys.exit(main())
