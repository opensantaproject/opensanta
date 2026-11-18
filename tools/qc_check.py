#!/usr/bin/env python3
"""OpenSanta Project: maintainer/intake quality check (optional self-check).

The project runs this on intake. Contributors do not have to run it, but may use it
to check their own files if they want.

Usage:
  python tools/qc_check.py SUBMISSION_DIR --pack P07 [--pack P18] [--write-manifest] [--asr] [--json report.json]

SUBMISSION_DIR is named after the contributor ID (e.g. C0042/) and contains:
  C0042_consent.wav, C0042_L001.wav, ...

Results: FAIL means the folder needs a fix. WARN does NOT block: a maintainer listens to that clip and decides.
Exit code: 0 = no FAIL (warnings allowed), 1 = at least one FAIL, 2 = usage error.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import json
import re
import sys
from dataclasses import dataclass, field, asdict
from pathlib import Path

import numpy as np
import soundfile as sf

# ---- Thresholds (see AUDIO-SPEC.md) -------------------------------------------------
T = {
    "sample_rates_ok": [44100, 48000],
    "subtypes_ok": ["PCM_16", "PCM_24"],
    "clip_level": 0.999,          # |sample| at or above this counts as clipped (0 dBFS)
    "clip_min_samples": 3,        # this many clipped samples => FAIL
    "peak_warn_dbfs": -1.0,       # peak above this => WARN
    "peak_quiet_dbfs": -20.0,     # peak below this => WARN (too quiet)
    "noise_warn_dbfs": -60.0,     # estimated noise floor above this => WARN
    "noise_fail_dbfs": -45.0,     # ...above this => FAIL
    "edge_sil_min_s": 0.2,        # leading/trailing silence accepted range (target 0.3-0.5)
    "edge_sil_max_s": 1.0,
    "edge_sil_cut_s": 0.05,       # below this, speech is probably cut off => FAIL
    "internal_sil_warn_s": 2.0,   # longest pause inside the clip
    "dur_min_s": 0.8,
    "dur_max_s": 25.0,
    "consent_dur_min_s": 8.0,
    "consent_dur_max_s": 45.0,
    "wer_warn": 0.20,
    "wer_fail": 0.40,
}
FRAME_S = 0.02
ID_RE = re.compile(r"^C\d{4}$")
LINE_RE = re.compile(r"^(C\d{4})_(L\d{3})\.wav$")
CONSENT_WAV_RE = re.compile(r"^(C\d{4})_consent\.wav$")
ORDER = {"PASS": 0, "WARN": 1, "FAIL": 2}


@dataclass
class Check:
    name: str
    status: str
    detail: str


@dataclass
class FileResult:
    file: str
    kind: str
    checks: list = field(default_factory=list)

    def add(self, name, status, detail=""):
        self.checks.append(Check(name, status, detail))

    @property
    def status(self):
        return max((c.status for c in self.checks), key=ORDER.get, default="PASS")


def db(x: float) -> float:
    return 20 * np.log10(max(x, 1e-10))


def load_script(path: Path):
    with path.open(newline="", encoding="utf-8") as f:
        return {r["line_id"]: r for r in csv.DictReader(f, delimiter="\t")}


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


# ---- Audio analysis ------------------------------------------------------------------
def analyze_audio(path: Path, res: FileResult, is_consent: bool, words: int | None, section: str | None):
    try:
        info = sf.info(str(path))
    except Exception as e:  # not a readable audio file
        res.add("format", "FAIL", f"cannot read as audio: {e}")
        return None
    if info.format != "WAV":
        res.add("format", "FAIL", f"container is {info.format}, need WAV")
        return None
    res.add("format", "PASS" if info.subtype in T["subtypes_ok"] else "FAIL",
            f"WAV {info.subtype}" + ("" if info.subtype in T["subtypes_ok"] else " (need PCM_16 or PCM_24)"))
    sr_ok = info.samplerate in T["sample_rates_ok"]
    res.add("sample_rate", "PASS" if sr_ok else "FAIL",
            f"{info.samplerate} Hz" + ("" if sr_ok else " (need 48000; 44100 accepted)"))

    data, sr = sf.read(str(path), dtype="float64", always_2d=True)
    if info.channels == 1:
        res.add("channels", "PASS", "mono")
        x = data[:, 0]
    elif info.channels == 2 and np.allclose(data[:, 0], data[:, 1], atol=1e-4):
        res.add("channels", "WARN", "stereo with identical channels (accepted; will be folded to mono)")
        x = data[:, 0]
    else:
        res.add("channels", "FAIL", f"{info.channels} channels with different content (need mono)")
        x = data.mean(axis=1)

    dur = len(x) / sr
    lo, hi = (T["consent_dur_min_s"], T["consent_dur_max_s"]) if is_consent else (T["dur_min_s"], T["dur_max_s"])
    res.add("duration", "PASS" if lo <= dur <= hi else ("FAIL" if dur < lo else "WARN"),
            f"{dur:.2f} s (expected {lo}-{hi} s)")
    if len(x) < int(sr * 0.1):
        return x, sr

    # Peak / clipping
    a = np.abs(x)
    peak = float(a.max())
    n_clip = int((a >= T["clip_level"]).sum())
    if n_clip >= T["clip_min_samples"]:
        res.add("clipping", "FAIL", f"{n_clip} samples at full scale: lower the gain and re-record")
    else:
        res.add("clipping", "PASS", "none")
    pk = db(peak)
    if pk > T["peak_warn_dbfs"]:
        res.add("peak", "WARN", f"{pk:.1f} dBFS (target -6 to -3, flag above {T['peak_warn_dbfs']})")
    elif pk < T["peak_quiet_dbfs"]:
        res.add("peak", "WARN", f"{pk:.1f} dBFS: very quiet, raise gain a little")
    else:
        res.add("peak", "PASS", f"{pk:.1f} dBFS")

    # Frame energies (20 ms)
    n = int(sr * FRAME_S)
    frames = x[: len(x) // n * n].reshape(-1, n)
    rms_db = np.array([db(float(np.sqrt(np.mean(f ** 2)))) for f in frames])
    # Noise floor: RMS of the quietest 0.25 s stretch (fits inside the 0.3-0.5 s lead-in/tail silence)
    win = max(1, int(0.25 / FRAME_S))
    if len(rms_db) < win * 2:
        res.add("noise_floor", "WARN", "clip too short to measure the noise floor")
        return x, sr
    lin = 10 ** (rms_db / 10)
    mov = np.convolve(lin, np.ones(win) / win, mode="valid")
    noise = 10 * np.log10(max(float(mov.min()), 1e-20))
    if noise > T["noise_fail_dbfs"]:
        st = "FAIL"
    elif noise > T["noise_warn_dbfs"]:
        st = "WARN"
    else:
        st = "PASS"
    res.add("noise_floor", st, f"{noise:.1f} dBFS (target <= {T['noise_warn_dbfs']})")

    # Speech/silence: frame is speech if it is well above the noise floor and not near-silent
    thr = max(noise + 15.0, pk - 40.0, -55.0)
    speech = rms_db > thr
    if not speech.any():
        res.add("silence", "FAIL", "no speech detected")
        return x, sr
    idx = np.flatnonzero(speech)
    lead = idx[0] * FRAME_S
    trail = (len(speech) - 1 - idx[-1]) * FRAME_S
    for label, v in (("lead_silence", lead), ("trail_silence", trail)):
        if v < T["edge_sil_cut_s"]:
            res.add(label, "FAIL", f"{v:.2f} s: speech may be cut off")
        elif T["edge_sil_min_s"] <= v <= T["edge_sil_max_s"]:
            res.add(label, "PASS", f"{v:.2f} s")
        else:
            res.add(label, "WARN", f"{v:.2f} s (accepted {T['edge_sil_min_s']}-{T['edge_sil_max_s']} s, target 0.3-0.5)")
    gaps = np.diff(idx) - 1
    longest = float(gaps.max() * FRAME_S) if len(gaps) else 0.0
    res.add("internal_silence", "WARN" if longest > T["internal_sil_warn_s"] else "PASS",
            f"longest pause {longest:.2f} s")

    # Speaking-rate sanity for script lines (not laughs)
    if words and section not in ("laughs", None):
        speech_s = (idx[-1] - idx[0] + 1) * FRAME_S
        rate = words / max(speech_s, 0.1)
        res.add("speech_rate", "PASS" if 0.7 <= rate <= 4.5 else "WARN",
                f"{rate:.1f} words/s over {speech_s:.1f} s of speech")
    return x, sr


# ---- Optional ASR ----------------------------------------------------------------------
_ONES = "zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen".split()
_TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()


def num_words(n: int) -> str:
    if n < 20:
        return _ONES[n]
    if n < 100:
        return _TENS[n // 10] + ("" if n % 10 == 0 else " " + _ONES[n % 10])
    if n < 1000:
        return _ONES[n // 100] + " hundred" + ("" if n % 100 == 0 else " " + num_words(n % 100))
    if n < 1_000_000:
        return num_words(n // 1000) + " thousand" + ("" if n % 1000 == 0 else " " + num_words(n % 1000))
    return str(n)


def normalize(text: str) -> list[str]:
    t = text.lower().replace("mrs.", "missus").replace("%", " percent").replace("-", " ")
    t = re.sub(r"\d[\d,]*", lambda m: " " + num_words(int(m.group().replace(",", ""))) + " ", t)
    t = re.sub(r"[^a-z' ]+", " ", t).replace("'", "")
    t = t.replace(" and ", " ")  # "one hundred and twenty" vs "one hundred twenty"
    return t.split()


def wer(ref: list[str], hyp: list[str]) -> float:
    d = list(range(len(hyp) + 1))
    for i, r in enumerate(ref, 1):
        prev, d[0] = d[0], i
        for j, h in enumerate(hyp, 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r != h))
            prev, d[j] = d[j], cur
    return d[-1] / max(len(ref), 1)


class ASR:
    def __init__(self, model: str):
        from faster_whisper import WhisperModel  # optional dependency
        self.m = WhisperModel(model, device="cpu", compute_type="int8")

    def transcribe(self, x: np.ndarray, sr: int) -> str:
        if sr != 16000:  # simple linear resample to 16 kHz for the ASR model only
            t_new = np.arange(0, len(x) / sr, 1 / 16000)
            x = np.interp(t_new, np.arange(len(x)) / sr, x)
        segs, _ = self.m.transcribe(x.astype(np.float32), language="en", beam_size=1)
        return " ".join(s.text.strip() for s in segs)


# ---- Main --------------------------------------------------------------------------------
def main(argv=None):
    ap = argparse.ArgumentParser(
        description="OpenSanta submission quality check",
        epilog="FAIL blocks a submission: fix it before submitting. WARN does not block: a maintainer listens "
               "to that clip and decides. Exit code is 1 only if there's a FAIL.")
    ap.add_argument("folder", type=Path)
    ap.add_argument("--pack", action="append", default=[], help="assigned pack(s), e.g. --pack P07")
    ap.add_argument("--script", type=Path, default=Path(__file__).resolve().parent.parent / "script" / "lines.tsv")
    ap.add_argument("--contributor", help="contributor ID (default: folder name)")
    ap.add_argument("--write-manifest", action="store_true", help="(re)write manifest-<ID>.sha256")
    ap.add_argument("--asr", action="store_true", help="also check transcripts with faster-whisper")
    ap.add_argument("--asr-model", default="tiny.en")
    ap.add_argument("--json", type=Path, help="JSON report path (default: ./qc-report-<ID>.json)")
    a = ap.parse_args(argv)

    folder = a.folder
    if not folder.is_dir():
        print(f"error: {folder} is not a folder", file=sys.stderr)
        return 2
    cid = a.contributor or folder.name
    script = load_script(a.script)
    packs = {p.upper() for p in a.pack}
    general = FileResult("(submission)", "submission")
    files: list[FileResult] = []

    if not ID_RE.match(cid):
        general.add("contributor_id", "FAIL", f"'{cid}' doesn't look like C#### (name the folder after your ID)")
    else:
        general.add("contributor_id", "PASS", cid)
    known_packs = {r["pack"] for r in script.values()} - {"core"}
    if not packs:
        general.add("pack", "FAIL", "no --pack given (use the pack you were assigned)")
    elif packs - known_packs:
        general.add("pack", "FAIL", f"unknown pack(s): {sorted(packs - known_packs)}")
    else:
        general.add("pack", "PASS", ", ".join(sorted(packs)))
    allowed = {k for k, r in script.items() if r["pack"] == "core" or r["pack"] in packs}

    manifest_name = f"manifest-{cid}.sha256"
    form_name = f"consent-{cid}.txt"
    asr = None
    if a.asr:
        try:
            asr = ASR(a.asr_model)
        except Exception as e:
            general.add("asr", "WARN", f"ASR unavailable ({e}); install tools/requirements-asr.txt")

    seen_lines = set()
    for p in sorted(folder.iterdir()):
        if p.is_dir() or p.name.startswith("."):
            continue
        if p.name in (manifest_name, form_name, f"qc-report-{cid}.json"):
            continue
        m = LINE_RE.match(p.name)
        c = CONSENT_WAV_RE.match(p.name)
        if c:
            r = FileResult(p.name, "consent")
            if c.group(1) != cid:
                r.add("name", "FAIL", f"contributor ID {c.group(1)} doesn't match {cid}")
            analyze_audio(p, r, True, None, None)
            files.append(r)
            continue
        if not m:
            r = FileResult(p.name, "unknown")
            r.add("name", "FAIL", "name must be <contributorID>_<lineID>.wav or <contributorID>_consent.wav")
            files.append(r)
            continue
        r = FileResult(p.name, "line")
        fid, lid = m.groups()
        row = script.get(lid)
        if fid != cid:
            r.add("name", "FAIL", f"contributor ID {fid} doesn't match {cid}")
        elif row is None:
            r.add("name", "FAIL", f"{lid} isn't in script/lines.tsv")
        elif lid not in allowed:
            r.add("name", "FAIL", f"{lid} is in pack {row['pack']}, not core or your pack(s)")
        else:
            r.add("name", "PASS", f"{lid} ({row['pack']}, {row['section']})")
            seen_lines.add(lid)
        words = len(row["text"].split()) if row else None
        out = analyze_audio(p, r, False, words, row["section"] if row else None)
        if asr and out is not None and row is not None and row["section"] != "laughs":
            x, sr = out
            hyp = asr.transcribe(x, sr)
            e = wer(normalize(row["text"]), normalize(hyp))
            st = "FAIL" if e > T["wer_fail"] else "WARN" if e > T["wer_warn"] else "PASS"
            if row["section"] in ("numbers", "names") and st == "FAIL":
                st = "WARN"  # ASR often spells numbers/names differently; a human should listen
            r.add("transcript", st, f"WER {e:.2f}; heard: \"{hyp}\"")
        files.append(r)

    # Required items
    general.add("consent_clip", "PASS" if (folder / f"{cid}_consent.wav").exists() else "FAIL",
                f"{cid}_consent.wav" + ("" if (folder / f"{cid}_consent.wav").exists() else " missing"))
    general.add("consent_form", "PASS" if (folder / form_name).exists() else "WARN",
                form_name if (folder / form_name).exists()
                else "not required; consent is recorded on the Google Form")
    core = {k for k, r in script.items() if r["pack"] == "core"}
    miss_core = sorted(core - seen_lines)
    general.add("core_set", "FAIL" if miss_core else "PASS",
                f"missing {len(miss_core)}: {', '.join(miss_core)}" if miss_core else f"all {len(core)} lines")
    if packs and not (packs - known_packs):
        pk_lines = {k for k, r in script.items() if r["pack"] in packs}
        miss = sorted(pk_lines - seen_lines)
        general.add("pack_lines", "WARN" if miss else "PASS",
                    f"{len(pk_lines) - len(miss)}/{len(pk_lines)} recorded" + (f"; missing {', '.join(miss)}" if miss else ""))

    # Manifest
    to_hash = sorted(p for p in folder.iterdir() if p.is_file() and not p.name.startswith(".")
                     and p.name != manifest_name and (p.suffix == ".wav" or p.name == form_name))
    mpath = folder / manifest_name
    if a.write_manifest:
        mpath.write_text("".join(f"{sha256(p)}  {p.name}\n" for p in to_hash))
        general.add("manifest", "PASS", f"wrote {manifest_name} ({len(to_hash)} files)")
    elif not mpath.exists():
        general.add("manifest", "WARN", f"{manifest_name} missing (run with --write-manifest when the folder is final)")
    else:
        listed = {}
        for ln in mpath.read_text().splitlines():
            if ln.strip():
                h, _, name = ln.partition("  ")
                listed[name.strip()] = h.strip()
        bad = [p.name for p in to_hash if listed.get(p.name) != sha256(p)]
        extra = sorted(set(listed) - {p.name for p in to_hash})
        if bad or extra:
            general.add("manifest", "FAIL", f"mismatch: {', '.join(bad + extra)}")
        else:
            general.add("manifest", "PASS", f"{len(listed)} files verified")

    # Report
    all_res = [general] + files
    counts = {s: sum(1 for f in files if f.status == s) for s in ORDER}
    overall = max((r.status for r in all_res), key=ORDER.get)
    print(f"OpenSanta QC report: {cid}  (packs: {', '.join(sorted(packs)) or '-'})")
    print("=" * 64)
    for c in general.checks:
        print(f"  [{c.status}] {c.name}: {c.detail}")
    print("-" * 64)
    for f in files:
        bad = [c for c in f.checks if c.status != "PASS"]
        print(f"[{f.status}] {f.file}" + ("" if not bad else ""))
        for c in bad:
            print(f"      {c.status} {c.name}: {c.detail}")
    print("=" * 64)
    print(f"Files: {len(files)}  PASS {counts['PASS']}  WARN {counts['WARN']}  FAIL {counts['FAIL']}   OVERALL: {overall}")

    jpath = a.json or Path(f"qc-report-{cid}.json")
    jpath.write_text(json.dumps({
        "contributor": cid, "packs": sorted(packs), "overall": overall, "counts": counts,
        "blocking": overall == "FAIL",
        "policy": "FAIL blocks submission; WARN does not block (maintainer listens and decides)",
        "thresholds": T, "submission": [asdict(c) for c in general.checks],
        "files": [{"file": f.file, "kind": f.kind, "status": f.status, "checks": [asdict(c) for c in f.checks]} for f in files],
    }, indent=2))
    print("FAIL = blocks submission, fix first. WARN = doesn't block, a maintainer will listen and decide.")
    print(f"JSON report: {jpath}")
    return 1 if overall == "FAIL" else 0


if __name__ == "__main__":
    sys.exit(main())
