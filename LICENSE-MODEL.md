# Model License (trained voice weights)

> **Decided at training time.** The trained model is a derivative of whatever base TTS model we
> fine-tune, so **the base model's license limits what we can choose.** For example, if the base
> model's license requires its own terms to pass downstream, or restricts commercial use, we must
> follow it (or pick a different base model). Shortlist only base models whose license allows
> commercial use and redistribution of fine-tuned weights.

## Options

| Option | What it means | Pros | Cons |
|---|---|---|---|
| **CC0 1.0** | No conditions at all. | Maximum reuse, simplest. | No way to forbid impersonation or fraud, even on paper. CC0 isn't designed for software. |
| **Apache-2.0** ([text](https://www.apache.org/licenses/LICENSE-2.0)) | Permissive open-source license: use, modify, and redistribute commercially, keep the notices. Includes a patent grant (section 3), and grants no trademark rights (section 6). | Widely understood. OSI-approved open source. Common for model weights. | No use restrictions. Any acceptable-use policy would only be a request. |
| **OpenRAIL-M style** ([about OpenRAIL](https://huggingface.co/blog/open_rail), templates at https://www.licenses.ai/) | Royalty-free use, redistribution, and derivatives, **plus a list of restricted uses** that must be passed on to every downstream copy and derivative. | Commercial use allowed **and** enforceable rules against impersonation and fraud travel with the model. Protects contributors best. | Not "open source" by the OSI definition. Some users and companies avoid it. Harder to enforce in practice. Must be compatible with the base model's license. |

## Recommendation: OpenRAIL-M style license, with Apache-2.0 as the fallback

**Why:** a voice model can be misused in ways a dataset mostly can't (cloning, phone scams, fake endorsements).
Contributors are giving us a voice that may sound like them. An OpenRAIL-M style license keeps the model free
for commercial use while making "don't impersonate contributors, don't commit fraud" an actual license condition
that follows every copy.
If the base model's license requires Apache-2.0 compatibility or forbids added restrictions, use **Apache-2.0**
plus the acceptable-use policy below as a published, non-binding request.

Next step: adapt an existing OpenRAIL-M template from licenses.ai (check that template's own reuse terms first)
and have a lawyer review the restriction list. Don't write a license from scratch.

## Acceptable-use policy (draft, attached as restricted uses or published alongside)

You may use the OpenSanta model for any lawful purpose, including commercial ones, **except**:

1. **No fraud or deception about a human speaker.** Don't use the voice to make someone believe a real human
   is speaking in order to defraud, scam, manipulate, or harm them (for example scam calls, fake voicemails,
   or fake "Santa calls" that collect personal or payment data under false pretenses).
2. **No impersonation of contributors.** Don't present output as being said by, or endorsed by,
   any identifiable dataset contributor, and don't try to identify or target contributors through the model.
3. **No impersonation of other real people.** Don't use or fine-tune the model to imitate a real, identifiable
   person's voice without that person's consent.
4. **No unlawful use**, including harassment, defamation, or anything that violates privacy, publicity,
   or consumer-protection law.
5. **Disclose when it matters.** Where people could reasonably think they're hearing a live human
   (for example interactive calls, or products for children), say that the voice is synthetic.

Restrictions 1–4 apply to the model and to anything derived from it. They aren't conditions on the CC BY 4.0 dataset itself,
because CC BY 4.0 section 2(a)(5)(B) bars adding terms that restrict the licensed material. Redistributors must pass them on.

## Model notice (draft)

```
OpenSanta model — version [X.Y]
Weights licensed under [LICENSE NAME + URL], subject to the restricted uses in [file].
Base model: [NAME], licensed under [BASE LICENSE + URL]. Its terms also apply.
Trained on the OpenSanta Dataset [version] by OpenSanta contributors ([CONTRIBUTORS URL]),
licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Recorded by consenting adult volunteers.
Synthetic voice. It does not represent or speak for any contributor.
Contact: [PROJECT CONTACT]
```
