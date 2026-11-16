# Recording script: OpenSanta Project

**280 lines** in `lines.tsv` (tab-separated: `line_id`, `section`, `pack`, `text`, `direction`).
Record **one WAV per line**, named `<contributorID>_<line_id>.wav` (for example `C0042_L017.wav`). See AUDIO-SPEC.md.

## How lines are assigned (blended voice)
The Santa voice will be a **blend of many contributors**, so nobody records all 280 lines. You record:

1. **The core set (required, 25 lines, `pack` = `core`):** all 15 laughs and "ho ho ho" lines, plus 10 shared
   sentences (L001, L026, L032, L051, L096, L121, L141, L197, L221, L252). Everyone records the same core, so we can
   compare contributors directly on delivery, pitch, pace, and audio quality.
2. **At least one line pack (about 42 lines):** packs `P1` to `P6`. We assign you a pack. Pick up more packs
   whenever you like. Each extra pack is just more lines, with no repeats.

**Every contributor's minimum: core + one pack, about 67 clips (roughly 20–40 minutes of recording).**

How the packs were built: lines from every section were dealt round-robin across the six packs. So each pack has a
similar mix (about 11–12 phonetic, 4 each of greetings, questions, numbers, and holiday, 5 names, 4–5 everyday,
3–4 exclamations, 2–3 stories) and 401–444 words. An espeak-ng (en-us) check shows the core set alone contains every
General American consonant and vowel, so **core + any one pack covers them all.** The rarest sounds, /ʒ/ ("measure")
and /ɔɪ/ ("boy"), are missing from some packs by themselves, which is why L032 and L051 are in the core.

Pack sizes: core 25 · P1 43 · P2 43 · P3 43 · P4 42 · P5 42 · P6 42.
We'll assign packs so each one gets roughly equal numbers of speakers.

## Accent (v1)
For v1 we're building **one classic American Santa voice**, so we're asking for **General American** accents
(the broadly "neutral" US accent common in national TV and radio). This is purely about **consistency** in the blend.
It isn't a judgment of anyone's accent: every accent is a real, valid way to speak English, and we hope future
versions can include more voices.
- We check each submission by **listening to your core set.**
- If your clips are in a different accent, we may **politely decline** them, or keep them out of **v1 training**.
  Either way, **we'll tell you.**
- Please don't put on an accent that isn't natural to you. A forced accent tends to drift and hurts consistency more
  than it helps.

## Reference performance (keep the blend consistent)
A blended voice only works if contributors sound like **the same Santa.** Before recording, aim for this delivery:
- **Who he is:** a kind, grandfatherly, classic American Santa. Warm and amused, never gruff, spooky, or sarcastic.
- **Pitch:** your comfortable lower range, a bit deeper than normal, but not pushed or growly. You should be able to
  hold it for an hour without strain.
- **Pace:** unhurried, a little slower than everyday speech. Natural pauses at commas.
- **Energy:** a gentle smile in the voice on most lines. Bigger only where the section note says so
  (exclamations, laughs), and never shouting.
- **Mic and room:** same distance, gain, and room for every clip, as AUDIO-SPEC.md says.
- **Self-check:** record the core set first, listen back to L001 and L266 ("Ho ho ho!"), and match that delivery for
  the rest of your session and in later sessions. If you come back another day, replay those two before starting.
- **Don't imitate a specific person** (a famous Santa, an actor, or another contributor). Use your own Santa voice
  within these guidelines.

## Why blending matters (plan for the training stage, not final)
- A many-speaker dataset is usually trained as **multi-speaker TTS**, where each clip is tagged with its speaker ID
  so the model learns who said what instead of mixing voices by accident.
- **One "community Santa" voice** can then come from options like: averaging or interpolating the learned speaker
  embeddings of selected contributors, picking a subset whose voices match well, or fine-tuning a single-voice model
  on the closest-matching clips. Which works best depends on the base model chosen at the training stage. We'll test
  it, not assume it.
- That's why the **core set** matters: it gives the same lines from everyone, for comparing and selecting speakers.
  And it's why **consistent delivery** matters: the closer contributors are to one style, the cleaner any blend should be.
- Each clip's speaker is only identified by contributor ID (see CONSENT.md).


1. Record your **spoken consent clip** first (`<contributorID>_consent.wav`), in your normal voice (see CONSENT.md).
2. Warm up with a glass of water. Do the greetings section first. It's the easiest way into the voice.
3. Keep the **same Santa voice, mic distance, and room** for the whole set. Consistency matters more than perfection.
   You don't have to do all 280 in one sitting, but use the same setup for every session.

## Reading rules
- **Read exactly what's written.** Don't add, drop, or change words, even small ones like "well" or "oh".
  If you slip, re-record the line. Don't fix it with an edit.
- **Numbers are spelled out** so there's no guessing. Read them as written.
- **"Mrs." is read "Missus".**
- **Names:** say each one the way the name's owners usually say it. If you're not sure, check a pronunciation
  resource or skip that line. **A skipped line is better than a wrong one.** Tell us which lines you skipped.
- The `direction` column (only on a few laugh lines) tells you **how** to perform. **Don't read it aloud.**
- Mistakes happen. Delete the take and redo it. Only send your best take of each line.

## Sections and performance notes

| Section | Lines | Count | Performance note |
|---|---|---|---|
| greetings | L001–L025 | 25 | Warm, jolly, unhurried. Smile while you speak. Talk to one child sitting right in front of you. |
| phonetic | L026–L095 | 70 | Warm and natural, a little less 'performed'. Clear, steady pace, like reading a story aloud. |
| questions | L096–L120 | 25 | Curious and kind, rising at the end where natural. Really ask. Don't just read. |
| exclamations | L121–L140 | 20 | Big and bright, but don't shout into the mic. Lean back a little on the loud ones and keep peaks below the limit. |
| numbers | L141–L165 | 25 | Clear and friendly. Read the words exactly as written. Numbers are spelled out, so there's no guessing. |
| names | L166–L195 | 30 | Warm and personal, like reading a letter addressed to you. Say each name carefully and correctly. If you're unsure how to say a name, check it or skip the line (see Reading rules). |
| holiday | L196–L220 | 25 | Cozy storyteller. Savor the holiday words and let them sound special. |
| everyday | L221–L250 | 30 | Natural and conversational, still your warm voice, but not 'in character'. These help the voice handle any text. |
| stories | L251–L265 | 15 | Bedtime storyteller. Unhurried, warm, with natural pauses at commas. Breathe between sentences, not in the middle of a phrase. |
| laughs | L266–L280 | 15 | Laughs and 'ho ho ho'. Deep, from the belly, warm and genuine, never mocking or scary. Do one take per line, then STOP. Don't add extra laughs or words. Keep the mic distance the same, and lean back a little if a laugh gets loud. Transcripts are exactly as written. Write what you actually said in your notes if it differed. |

## Where the text comes from (copyright)
- **All 280 lines were written fresh for this project** and are released with the dataset under CC BY 4.0.
- **Not included, on purpose:**
  - Song lyrics, and passages from "A Visit from St. Nicholas" ("'Twas the Night Before Christmas").
  - Named characters other than generic Santa and Mrs. Claus.
  - Brands and trademarks.
  - Standard sentence sets like the Harvard/IEEE sentences or the Rainbow Passage. Their public-domain status
    wasn't confirmed, so I wrote phonetically varied sentences instead.
- **Names in the names section are common first names chosen for variety. They don't refer to real people.**

## Phoneme coverage check (draft)
Ran the 280 lines through espeak-ng (en-us) to get IPA. Every General American consonant and vowel appears at least
9 times. The rarest are /ʒ/ (9) and /ɔɪ/ (12); the rest mostly appear 40 or more times. That's only an automated
estimate: a contributor's accent and actual pronunciation will differ.
Lines run from 3 to 29 words (mean 9.6), a mix of short and long, as the Coqui TTS guide recommends.
