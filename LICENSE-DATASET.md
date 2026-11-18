# Dataset License

## Chosen: Creative Commons Attribution 4.0 International (CC BY 4.0)

Decided by Gav on 2026-11-15. The comparison below is kept for the record.

| | CC0 1.0 | **CC BY 4.0 ✅ CHOSEN** |
|---|---|---|
| What it does | Waives copyright and related rights as far as the law allows, which puts the work as close to the public domain as possible. | Lets anyone reuse and adapt the work, including commercially, **if they give attribution.** |
| Reuse | Maximum. No conditions. | High, but every reuser must credit the creators. |
| TTS / derivatives | Simplest. No attribution duty. | Attribution in generated audio would be awkward. Solved below: credit goes in cards and docs, not in clips (section 3(a)(2) allows "any reasonable manner"). |
| Credit for contributors | Not legally required. | **Legally required.** That's why it was chosen. |
| Revocable? | No. CC says its licenses are irrevocable. | No. Same. |
| Voice / personality rights | Not reliably covered. CC0's waiver lists "publicity and privacy rights pertaining to a person's image or likeness," which doesn't clearly include voice. | Explicitly **not** licensed (section 2(b)(1)), except a limited waiver by the licensor. **CONSENT.md grants these separately.** |

Official sources:
- CC BY 4.0 deed: https://creativecommons.org/licenses/by/4.0/
- CC BY 4.0 legal code: https://creativecommons.org/licenses/by/4.0/legalcode
- (For reference) CC0 1.0 legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode

---

## How to give attribution (practical guide)

**Credit line. Use this exactly:**

```
OpenSanta Dataset by OpenSanta contributors ([CONTRIBUTORS URL]), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). [Modified: describe changes, or omit if unmodified.]
```

**Where it goes:**
- **Yes:** the dataset card or README, the **model card** of any model trained on it, and the product's docs,
  credits, "about" or licenses page, or the description of a video or podcast.
- **No:** inside each generated audio clip. You don't need to speak, watermark, or embed credit in every synthesized
  output. The project, on behalf of the contributors, considers credit in the card and docs reasonable attribution.

**Why this satisfies CC BY 4.0 section 3(a):**
- Section 3(a)(1) asks reusers to keep: the creators' identification (in a reasonable manner the licensor requests,
  including by pseudonym), a copyright notice, a notice referring to the license and the warranty disclaimer,
  a link to the material where reasonably practicable, an indication of any modifications, and the license name with a link.
- Section 3(a)(2) says these "may" be satisfied "in any reasonable manner based on the medium, means, and context,"
  and gives as an example "providing a URI or hyperlink to a resource that includes the required information."
  The credit line does this: the group name plus the link to the contributors list (which has every credited
  name or pseudonym), the license name and link, and a note of any changes.
- Section 3(a)(3): if a contributor asks, reusers must remove that contributor's credit to the extent reasonably practicable.
- Unsettled: whether a trained model or its output counts as "Adapted Material" is still legally open. This plan
  credits the dataset in the model card either way, so users who follow it are covered whichever way that's decided.

---

## Dataset notice (draft, ships with the dataset as LICENSE / in the README)

```
OpenSanta Dataset — version [X.Y]
Copyright (c) [YEAR] OpenSanta contributors. Contributors list: [CONTRIBUTORS URL]

The audio recordings, transcripts, and metadata in this dataset are licensed
under the Creative Commons Attribution 4.0 International License (CC BY 4.0).
Full legal code: https://creativecommons.org/licenses/by/4.0/legalcode

Attribution: please credit as follows, in your dataset/model card and docs
(not inside each generated clip). See LICENSE-DATASET.md:
  "OpenSanta Dataset by OpenSanta contributors ([CONTRIBUTORS URL]),
   licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)."

Every speaker in this dataset is an adult (18+) who recorded their own voice
and agreed to the project's Contributor Consent (CONSENT.md, version [v]) by checking the boxes on the form and recording a spoken consent clip. That
consent covers AI/TTS training, public release of the recordings, and public
release of models that may produce voices resembling theirs, and it separately
grants the voice and publicity permissions that CC BY 4.0 does not cover.

Please be decent (requests, not extra license conditions):
- Don't use these recordings to impersonate, or claim endorsement by, any contributor.
- Don't use them to deceive people into believing a real human is speaking in
  order to defraud or harm them.

Withdrawn contributors are removed from future versions. Please use the latest
version where you can.

Provided "as is", without warranties. See sections 5 and 6 of the CC BY 4.0
legal code. Patent and trademark rights are not licensed.

Contact: support@opensanta.org
```
