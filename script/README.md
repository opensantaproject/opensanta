# Recording script: OpenSanta Project

**100 lines** in `lines.tsv` (tab-separated: `line_id`, `section`, `pack`, `text`, `direction`).
Record **one WAV per line**, named `<contributorID>_<line_id>.wav` (for example `C0042_L017.wav`). See AUDIO-SPEC.md.

## How lines are assigned (blended voice)
The Santa voice will be a **blend of many contributors**, so nobody records all 100 lines. You record:

1. **The core set (required, 3 lines, `pack` = `core`):** L013 ("Ho ho ho!"), L002 ("Merry Christmas!"),
   and L014 ("Ho ho ho! Merry Christmas!"). Everyone records the same core, so we can
   compare contributors directly on delivery, pitch, pace, and audio quality.
2. **One line pack (10 lines, or 9 in three of the packs):** packs `P01` to `P10`. We assign you a pack. Pick up more
   packs whenever you like. Each extra pack is just more lines, with no repeats.

**Every contributor's minimum: core + one pack, 13 script lines (12 if your pack has 9).**
At a steady speaking pace of about 2.5 words per second, that is roughly **30–33 seconds of speech**,
or about **45 seconds** in the files once the short lead-in and tail silence is added, plus a spoken consent clip.
Finished and want to do more? Ask for another pack. About **10 speakers, one per pack, cover the script once.**

How the packs were built: the other 97 lines were dealt into 10 packs, balanced by section and word count. Each pack
has a mix of sections (greetings, questions, list, reindeer, workshop, christmas-eve, kindness, and goodbyes;
most packs also have one laugh line). Packs are 67–71 words.

Pack sizes: core 3 · 7 packs of 10 (P01, P02, P04, P05, P08, P09, P10) · 3 packs of 9 (P03, P06, P07).
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
  (laughs), and never shouting.
- **Mic and room:** same distance, gain, and room for every clip, as AUDIO-SPEC.md says.
- **Self-check:** record the core set first, listen back to L002 ("Merry Christmas!") and L013 ("Ho ho ho!"), and match that delivery for
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
   You don't have to finish in one sitting, but use the same setup for every session.

## Reading rules
- **Read exactly what's written.** Don't add, drop, or change words, even small ones like "well" or "oh".
  If you slip, re-record the line. Don't fix it with an edit.
- **Numbers are spelled out** so there's no guessing. Read them as written.
- **"Mrs." is read "Missus".**
- **Reindeer names:** say each one as written. L047 uses "Donner"; L053 uses "Donder", the spelling from the 1823 poem.
- If the `direction` column is filled in, it tells you **how** to perform. **Don't read it aloud.** This script leaves that column empty.
- Mistakes happen. Delete the take and redo it. Only send your best take of each line.

## Sections and performance notes

| Section | Lines | Count | Performance note |
|---|---|---|---|
| greetings | L001–L012 | 12 | Warm, jolly, unhurried. Smile while you speak. Talk to one child sitting right in front of you. |
| laughs | L013–L020 | 8 | Laughs and 'ho ho ho'. Deep, from the belly, warm and genuine, never mocking or scary. Do one take per line, then STOP. Don't add extra laughs or words. Keep the mic distance the same, and lean back a little if a laugh gets loud. Transcripts are exactly as written. Write what you actually said in your notes if it differed. |
| questions | L021–L032 | 12 | Curious and kind, rising at the end where natural. Really ask. Don't just read. |
| list | L033–L042 | 10 | Warm and kind, never scolding. You're glad to see the child on your list. |
| reindeer | L043–L054 | 12 | Warm and lively. Say each reindeer name clearly, exactly as written. |
| workshop | L055–L066 | 12 | Cozy and fond of the workshop, Mrs. Claus, and the elves. "Mrs." is read "Missus". |
| christmas-eve | L067–L078 | 12 | Cozy storyteller. Unhurried, like telling a child about Christmas Eve. |
| kindness | L079–L090 | 12 | Gentle and sincere. Encouraging, never lecturing. |
| goodbyes | L091–L100 | 10 | Warm and unhurried. A kind farewell to one child. |

## Where the text comes from (copyright)
- **Most of the 100 lines were written fresh for this project** and are released with the dataset under CC BY 4.0.
- **Eight lines** are from the 1823 poem "A Visit from St. Nicholas" by Clement Clarke Moore, which is in the public domain:
  L041, L042, L053, L054, L089, L090, L099, and L100.
- **Not included, on purpose:**
  - Song lyrics and movie dialogue.
  - Trademarked characters (including Rudolph and Frosty).
  - Brands and trademarks.

## Length and coverage
Lines run from 2 to 12 words (mean 7.0), a mix of short and long, as the Coqui TTS guide recommends.

A phoneme-coverage check with espeak-ng was not rerun for this script, because espeak-ng was not available
in the environment where this version was prepared.
