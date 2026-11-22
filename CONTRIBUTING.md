# Contributing to the OpenSanta Project

Thanks for lending your voice! 🎅 This guide takes you from "I'd like to help" to a finished submission.
The finished script audio is under a minute, plus the spoken consent clip. Plan on a few minutes of recording, plus setup.

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

## 2. Sign up, consent, and get your pack (one step)
First read [CONSENT.md](CONSENT.md) (what you're agreeing to). If any part of it doesn't sit right with you, don't
contribute.

Then fill in the short **sign-up form** at **[SIGNUP FORM LINK]**. It needs no Google sign-in and no files: just your
name or handle, a contact email, the eligibility checkboxes, and the **consent and audio-rights boxes**. Checking those
boxes is your consent. The moment you submit, you're assigned, and emailed within a minute or so:
- a **contributor ID**, like `C0042`
- a **pack** (`P01`–`P10`). We hand out the **least-covered pack first**, so every pack gets enough voices.
- your personal link to the **upload form** at **[FORM LINK]**, with your ID and pack already filled in.

Your ID and pack arrive by email, not on the form's thank-you screen (Google Forms can't show them there). Check spam
if it doesn't show up.

You always record the **core set** (3 lines, the same for everyone) plus your pack (10 lines, or 9 in three of the packs). That's 13 script lines, or 12 if your pack has 9.
Finished and want to do more? Ask for another pack.

## 3. Confirm consent again when you upload
When you submit your audio, the upload form asks you to check the consent and rights boxes once more, and you upload a
spoken consent clip. That ties your consent to the exact files you send. There is no separate signed text file to save
or send.

## 4. Set up and test
Follow [AUDIO-SPEC.md](AUDIO-SPEC.md): a quiet room, mic 15–20 cm away (phone 20–30 cm), no effects. Record a test line
and check that your peaks are around −6 to −3 dBFS with no clipping.

## 5. Record, in this order
1. **Consent clip:** read the spoken consent script from CONSENT.md in your normal voice, saved as `C0042_consent.wav`.
2. **Core set:** the three lines with `core` in the `pack` column of [script/lines.tsv](script/lines.tsv): L013
   ("Ho ho ho!"), L002 ("Merry Christmas!"), and L014 ("Ho ho ho! Merry Christmas!"). Then listen back to L002 and L013. That's your reference delivery for the rest of the
   session and later ones.
3. **Your pack:** every line with your pack number. Read each line as written, including reindeer names.

One line per file. Read exactly what's written. Re-record mistakes instead of editing them.
See the reference performance guide in [script/README.md](script/README.md).

## 6. Name and organize your files
Put your clips in one folder named after your ID:

```
C0042/
  C0042_consent.wav        spoken consent clip (kept private)
  C0042_L001.wav           one file per script line: <contributorID>_<lineID>.wav
  C0042_L013.wav
  ...
```

## 7. Submit (Google Form)
1. Open your upload form link (**[FORM LINK]**). **You'll need to sign in to a Google account.** Google requires this for
   file uploads. A free account works.
2. Check the required **consent and rights boxes** again. This confirms your consent covers these exact files.
3. Check that your contributor ID and pack are filled in, then upload your **13 script clips** (12 if your pack has 9
   lines) plus your **spoken consent clip**. A clip recorded
   to the audio spec is well under 10 MB.
4. Submit. **Heads up:** the form records the email address of the Google account you're signed in with, along with your
   upload. We use it only to contact you about your submission. Your files go to the project's **private** Google Drive,
   which only maintainers can see.

The project runs quality checks on intake and will listen to your core set. If something needs fixing, or your clips
can't be used in v1 (for example the accent rule), we'll tell you.

You don't have to run any software before you submit. Maintainers use [tools/qc_check.py](tools/qc_check.py) on intake;
if you want to check your own files first, you can run it too.

## Changing your mind
You can withdraw at any time. Contact **support@opensanta.org** with your contributor ID. Your recordings come out of future
dataset versions and future trainings. Versions already released can't be recalled (see CONSENT.md section 4).
