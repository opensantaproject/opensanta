# Contributing to the OpenSanta Project

Thanks for lending your voice! 🎅 This guide takes you from "I'd like to help" to a finished submission.
It takes about **20–40 minutes of recording**, plus setup.

**Read first:** [CONSENT.md](CONSENT.md) (what you're agreeing to) · [AUDIO-SPEC.md](AUDIO-SPEC.md) (how to record) ·
[script/](script/) (the lines and the performance guide)

---

## 1. Check you can contribute
- **Your own voice only.** Every clip must be you, recorded for this project. (A narrow exception for audio you hold
  all rights to, with the speaker's written consent, is in CONSENT.md section 1.)
- **18 or older.** Self-declared, through the consent form checkbox and your spoken consent clip.
- **General American accent for v1.** It's about one consistent classic American Santa, not about any accent being
  wrong. See [script/README.md](script/README.md#accent-v1).
- **Phones are fine** if you follow the phone tips in AUDIO-SPEC.md: uncompressed WAV or lossless export, auto gain and
  noise suppression off where you can.

**Never submit:** scraped or ripped audio (YouTube, TV, films, podcasts, games, social media), Santa-hotline or phone-call
recordings, stock or "royalty-free" site audio (Pixabay, Uppbeat, Envato, and similar), anyone else's voice without
their written consent, impersonations of real people, or AI-generated or cloned audio. Details are in CONSENT.md section 2.

## 2. Get your contributor ID and pack
Fill in the short **sign-up form** at **[SIGNUP FORM LINK]**. It needs no Google sign-in and no files: just your name or
handle, a contact email, and the eligibility checkboxes. A maintainer emails you:
- a **contributor ID**, like `C0042`
- a **pack** (`P1`–`P6`). We hand out the **least-covered pack first**, so every pack gets enough voices.
- your personal link to the **upload form** at **[FORM LINK]**, with your ID and pack already filled in.

You always record the **core set** (25 lines, the same for everyone) plus your pack (about 42 lines).
Finished and want to do more? Ask for another pack.

## 3. Sign the consent form
Fill in the signature block in [CONSENT.md](CONSENT.md) and save it as `consent-C0042.txt` (use your own ID).

## 4. Set up and test
Follow [AUDIO-SPEC.md](AUDIO-SPEC.md): a quiet room, mic 15–20 cm away (phone 20–30 cm), no effects. Record a test line
and check that your peaks are around −6 to −3 dBFS with no clipping.

## 5. Record, in this order
1. **Consent clip:** read the spoken consent script from CONSENT.md in your normal voice, saved as `C0042_consent.wav`.
2. **Core set:** every line with `core` in the `pack` column of [script/lines.tsv](script/lines.tsv), including the laughs.
   Then listen back to L001 and L266. That's your reference delivery for the rest of the session and later ones.
3. **Your pack:** every line with your pack number. If you're unsure how to say a name, skip that line and tell us.

One line per file. Read exactly what's written. Re-record mistakes instead of editing them.
See the reference performance guide in [script/README.md](script/README.md).

## 6. Name and organize your files
Put everything in one folder named after your ID:

```
C0042/
  consent-C0042.txt        signed form (kept private)
  C0042_consent.wav        spoken consent clip (kept private)
  C0042_L001.wav           one file per script line: <contributorID>_<lineID>.wav
  C0042_L026.wav
  ...
  manifest-C0042.sha256    created in step 7
```

## 7. Run the quality check and create your manifest
You need Python 3.9+.

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r tools/requirements.txt

# Check your folder (replace P3 with your pack; repeat --pack for extra packs)
python tools/qc_check.py C0042 --pack P3

# When everything passes (or the warnings are OK), write the SHA-256 manifest
python tools/qc_check.py C0042 --pack P3 --write-manifest
```

- **FAIL blocks your submission.** Fix it first: re-record, or rename the file.
- **WARN doesn't block.** You can submit as is. A maintainer will listen to that clip and decide whether to keep it.
  (Fixing it yourself is welcome if it's easy, for example a skipped name line or a long pause.)
- The check prints a report and saves `qc-report-C0042.json`. Include the JSON with your submission.
- Optional transcript check (downloads a speech model):
  `pip install -r tools/requirements-asr.txt` then add `--asr`.
- If you re-record anything after writing the manifest, run `--write-manifest` again.

## 8. Submit (Google Form)
1. **Zip your folder** as `C0042.zip` (your ID). Put the QC report `qc-report-C0042.json` inside the folder before zipping.
   Most computers can do this with a right-click, "Compress" or "Send to → Compressed (zipped) folder".
2. Open your upload form link (**[FORM LINK]**). **You'll need to sign in to a Google account.** Google requires this for
   file uploads. A free account works.
3. Check that your contributor ID and pack are filled in, then upload `C0042.zip` to the file question.
   - If the form says the file is too big, split the folder into two zips, `C0042_part1.zip` and `C0042_part2.zip`
     (keep the consent files and manifest in part 1), and upload both.
   - If zip files aren't accepted for some reason, upload the individual files instead and tell us at [PROJECT CONTACT].
4. Submit. **Heads up:** the form records the email address of the Google account you're signed in with, along with your
   upload. We use it only to contact you about your submission. Your files go to the project's **private** Google Drive,
   which only maintainers can see.

We'll re-run the checks and listen to your core set. If something needs fixing, or your clips can't be used in v1
(for example the accent rule), we'll tell you.

## Changing your mind
You can withdraw at any time. Contact **[PROJECT CONTACT]** with your contributor ID. Your recordings come out of future
dataset versions and future trainings. Versions already released can't be recalled (see CONSENT.md section 4).
