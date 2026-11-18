# Audio Spec: how to record for the OpenSanta Project

## The short version
- **Quiet room, same setup every time, one clip per script line.**
- **Record raw:** no effects, no cleanup, no "enhance" buttons.
- **Not too loud:** the loudest parts should land around −6 to −3 dBFS, and must **never** hit 0 (clipping).
- Leave **a short pause (about half a second)** before and after you speak.
- Save as **WAV** named `<contributorID>_<lineID>.wav`. Your consent clip is `<contributorID>_consent.wav`.

## Technical table

| Setting | Target | Accepted | Basis |
|---|---|---|---|
| Format | WAV (PCM), uncompressed | No MP3/AAC/M4A/OGG | LJSpeech notes its MP3-sourced clips "may contain artifacts introduced by the MP3 encoding". |
| Sample rate | **48 kHz** | 44.1 kHz (we'll resample) | VCTK is distributed at 48 kHz. Training usually downsamples (LJSpeech 22.05 kHz; Piper 16/22.05 kHz; Coqui suggests ~16–22.05 kHz for training), so recording higher keeps options open. |
| Bit depth | **24-bit** | 16-bit | VCTK was recorded at 24-bit and distributed as 16-bit; LJSpeech is 16-bit PCM. |
| Channels | **Mono** | Stereo with identical channels (we'll fold down) | LJSpeech and VCTK are single-channel. |
| Clips | **One line per file**, exactly the script text | | LJSpeech: one clip per transcript, 1–10 s (mean 6.6 s). |
| Peaks | **−6 to −3 dBFS** on the loudest words or laughs | Anything below 0 dBFS, if not clipped | Adapted from ACX audiobook rules: peaks no higher than −3 dB; ACX suggests tracking with peaks around −7 dB. |
| Clipping | **None.** Any sample at 0 dBFS means re-record. | | ACX: 0 dB peaks during recording mean lower the gain and re-record. |
| Noise floor | **About −60 dBFS or quieter** (measured in a silent part) | Somewhat higher may pass QC case by case | ACX's maximum noise floor is −60 dB. Coqui: background noise hurts alignment and output quality. |
| Lead-in / tail silence | **About 0.3–0.5 s** of room silence at the start and end | 0.2–1.0 s | **Project choice**, not a published standard. Enough room tone to trim cleanly. VCTK clips were "manually end-pointed"; Piper Recording Studio's exporter trims silence automatically. |
| Processing | **None.** No EQ, compression, limiting, reverb, noise reduction, normalization, or pitch or speed changes. | | Coqui: dataset quality and consistency drive model quality, and "what it sees is all it learns". Processing can't be undone, and any needed processing is applied evenly later. |
| Consistency | Same mic, room, distance, gain, and Santa voice across all sessions | | Coqui: keep tone and pitch consistent among clips. |

## Which lines you record
The voice is a blend of many contributors. You record the **core set** (3 lines, the same for everyone) plus **at
least one 6-line pack** (5 lines in five of the packs) that we assign (`pack` column in `script/lines.tsv`). Extra packs are welcome.
See `script/README.md` for details and the **reference performance guideline.**

**Consistency matters even more for a blend.** Your clips will be compared and combined with other people's, so:
- Record the core set first, and replay your L001 and L266 before every later session to match your own delivery.
- Keep the same mic, distance, gain, room, and Santa voice every time. Changing setup halfway through a pack is
  worse than a slightly imperfect setup kept the same.
- If you change mic or room between packs, tell us when you submit.

## Accent (v1)
v1 uses **General American** accents only, so the blend sounds like one classic American Santa. It's about consistency,
not about any accent being wrong. We check submissions by listening to the core set. Clips in other accents may be
politely declined or kept out of v1 training, and we'll always tell you. See `script/README.md`.

## Your room
- **Small and soft beats big and bare.** A closet full of clothes, or a bedroom with curtains, rug, and bed, works well.
  Avoid kitchens, bathrooms, and empty rooms (echo).
- **Kill steady noise:** turn off fans, AC or heating if you can, the fridge hum nearby, and notifications. Close windows.
- **Check your noise floor:** record 5 seconds of silence and look at the level. Aim for about −60 dBFS or lower.
  If you can hear a hum on playback with headphones, fix the room before recording.

## Your mic

**USB or XLR mic (preferred)**
- Put it **about 15–20 cm (6–8 in)** from your mouth, slightly off to the side, so breaths and "p" sounds don't hit it straight on.
- Use a **pop filter** (or a thin sock over a wire hanger) about 5 cm in front of the mic.
- Set gain so a normal line peaks around −10 to −6 dBFS, leaving headroom for "HO HO HO!" to stay at or below −3.
- Turn off any "auto gain", "AGC", "voice enhancement", or "noise suppression" in the mic's app or your OS.

**Phone (accepted for v1 if you follow these tips)**
- **Export uncompressed WAV**, or the highest-quality lossless option your recorder app offers. Many built-in voice-memo
  apps save compressed audio (for example AAC/M4A) by default. Check your app's settings, and if it can't save WAV or
  lossless, use a different recorder app. We don't accept compressed voice-memo files.
- Turn off **auto gain (AGC), noise suppression, "enhance", or voice-processing** options wherever your app or phone lets
  you. Some phones don't let you turn all of these off. That's OK, just switch off what you can and keep it the same every session.
- Put the phone on a stand or a pile of books, mic end toward you, about **20–30 cm** away. Don't hold it (handling noise).
- Turn on airplane mode or do-not-disturb so calls and notifications don't interrupt.
- Do a test clip first. Phone mics clip easily on loud laughs, so back off a little for the laughs section.
- **The same spec and quality checks apply to phone clips as to any other mic:** format, sample rate, peaks, no clipping,
  noise floor, silence, and consistency (see the table above).

**Not accepted:** headset or earbud mics, laptop built-in mics (fan noise), and video-call or messaging apps
(they compress and process audio).

## Recording each line
1. Silence (about 0.5 s), then read the line, then silence (about 0.5 s). Stop.
2. Listen back now and then with headphones: clipping, clicks, background noise, and wrong words all mean re-record.
3. Keep your mic distance steady. For loud lines, lean back. Don't turn the gain down mid-session.
4. Take breaks and drink water. A tired voice drifts away from the character.

## File naming
- Script lines: `<contributorID>_<lineID>.wav`, for example `C0042_L001.wav`. `lineID` comes from `script/lines.tsv`.
- Consent clip: `<contributorID>_consent.wav` (see CONSENT.md). It's kept private and never used for training.
- Re-takes: send only your final take, using the same name.

## Sources checked (2026-11-15)
- LJ Speech Dataset: https://keithito.com/LJ-Speech-Dataset/ (22,050 Hz, 16-bit, mono PCM WAV; clips 1–10 s; MP3 artifacts note)
- CSTR VCTK Corpus 0.92: https://datashare.ed.ac.uk/handle/10283/3443 (recorded at 96 kHz/24-bit, distributed as 16-bit, 48 kHz; manually end-pointed)
- Coqui TTS, "What makes a good TTS dataset": https://docs.coqui.ai/en/latest/what_makes_a_good_dataset.html
- Piper TRAINING.md: https://github.com/rhasspy/piper/blob/master/TRAINING.md (16,000 / 22,050 Hz quality levels)
  and Piper Recording Studio: https://github.com/rhasspy/piper-recording-studio (LJSpeech-format export with silence trimming)
- ACX (audiobook) requirements, via ACX's own blog: https://www.acx.com/mp/blog/mastering-audiobooks-with-alex-the-audio-scientist
  (peaks ≤ −3 dB, noise floor ≤ −60 dB, RMS −23 to −18 dB). These are audiobook rules. We borrow the peak and noise
  numbers as sensible targets for home recording, not as a TTS standard.
- Mic distances and phone tips are common recording practice, not taken from a single cited source.
