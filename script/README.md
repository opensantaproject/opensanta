# Recording script: OpenSanta Project

**280 lines** in `lines.tsv` (tab-separated: `line_id`, `section`, `pack`, `text`, `direction`).
Record **one WAV per line**, named `<contributorID>_<line_id>.wav` (for example `C0042_L017.wav`). See AUDIO-SPEC.md.

## How lines are assigned (blended voice)
The Santa voice will be a **blend of many contributors**, so nobody records all 280 lines. You record:

1. **The core set (required, 3 lines, `pack` = `core`):** L266 ("Ho ho ho!"), L270 ("Ha ha ha! Oh, that's a good one."),
   and L001 ("Well, hello there! Come in, come in, and get warm by the fire."). Everyone records the same core, so we can
   compare contributors directly on delivery, pitch, pace, and audio quality.
2. **One line pack (6 lines, or 5 in five of the packs):** packs `P01` to `P47`. We assign you a pack. Pick up more
   packs whenever you like. Each extra pack is just more lines, with no repeats.

**Every contributor's minimum: core + one pack, 9 script lines (8 if your pack has 5), roughly 2–4 minutes of recording,**
plus a spoken consent clip. Nobody records more than 9 script lines. About **47 speakers, one per pack, cover the script once.**

How the packs were built: the other 277 lines were dealt into 47 packs, balanced by section and word count. Each pack
has 1 or 2 phonetic lines and a mix of the other sections (names, everyday, greetings, questions, numbers, holiday,
exclamations, stories, and laughs), with no section stacked above one line. Packs are 45–74 words. An espeak-ng (en-us)
check shows that **core + any one pack covers every General American consonant and vowel except a few rarer sounds.**
/ʒ/ ("measure") appears in only 4 lines of the whole script, and /ɔɪ/ ("boy") in only 9, so they cannot be in every pack
without writing new lines. Those lines were spread as far as they go: four packs include both sounds, five more include
/ɔɪ/, and the other 38 packs miss both. /tʃ/ and /dʒ/ also appear in only 34 and 30 lines, so some packs miss those too.
Recording a second pack helps fill those gaps.

Pack sizes: core 3 · 42 packs of 6 · 5 packs of 5 (P05, P14, P23, P32, P41).
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
9 times in the full script. The rarest are /ʒ/ (9) and /ɔɪ/ (14); the rest mostly appear 40 or more times. That's only
an automated estimate: a contributor's accent and actual pronunciation will differ.

The 3-line core is mostly two short laughs plus one greeting, so **the core alone does not contain every phoneme.**
Core + any one pack still covers all of them except /ʒ/ and /ɔɪ/ (and, in some packs, /tʃ/ or /dʒ/), which there are
not enough lines to put in every pack (see "How lines are assigned" above).

Lines run from 3 to 29 words (mean 9.6), a mix of short and long, as the Coqui TTS guide recommends.
