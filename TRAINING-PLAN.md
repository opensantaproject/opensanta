# OpenSanta Training Plan (main voice, StyleTTS2)

> **Goal:** OpenSanta exists to make a **free, open-source, high-quality Santa voice** that anyone can use, including
> commercially. Every license and component below is judged against that goal. Anything non-commercial or otherwise
> restrictive in what we ship is flagged as a **blocker**. Where quality and size or speed trade off, **quality wins.**
> Smaller versions come later (see the end).

Status: plan only. Nothing has been trained, downloaded, or uploaded. Facts checked 2026-11-15 against the sources linked.
**Established** means documented in the StyleTTS2 repo or paper. **Experimental** means our own idea, to be tested.
This isn't legal advice. The license findings need a lawyer's review before release.

---

## 1. License check

| Component | What it is | License / terms (source) | Ends up in our released model? | Verdict vs goal |
|---|---|---|---|---|
| StyleTTS2 code | Training and inference code | **MIT** ([repo LICENSE](https://github.com/yl4579/StyleTTS2/blob/main/LICENSE)) | Code only | ✅ OK |
| LibriTTS pretrained checkpoint (`yl4579/StyleTTS2-LibriTTS`) | Multi-speaker base we'd fine-tune | **No license file** on the HF repo (no license metadata). The README's "Pre-Trained Models" terms: you must inform listeners speech is synthesized **unless you have permission to use the voice** ([README, License](https://github.com/yl4579/StyleTTS2#license)). The author says these rules apply to the pretrained models, not models you train yourself ([issue #37](https://github.com/yl4579/StyleTTS2/issues/37)). | **Yes**, our weights are derived from it | ⚠️ **Not non-commercial**, but (a) the disclosure rule passes down to us, and (b) there's no formal license grant, which is legally unclear. Lawyer check. |
| LJSpeech pretrained checkpoint (`yl4579/StyleTTS2-LJSpeech`) | Single-speaker base | Same README terms, no license file | Only if used | ⚠️ Same as above. Also single-speaker, so a poor fit for a multi-speaker blend. |
| LibriTTS dataset | Base checkpoint's training data | **CC BY 4.0** ([OpenSLR 60](https://www.openslr.org/60/)) | Indirectly (trained into the weights) | ✅ OK. Give LibriTTS attribution in the model card. |
| LJSpeech dataset | LJSpeech checkpoint's data | **Public domain** ([LJ Speech](https://keithito.com/LJ-Speech-Dataset/)) | Only if used | ✅ OK |
| PL-BERT (`Utils/PLBERT`) | Phoneme-level BERT text encoder | Code **MIT** ([yl4579/PL-BERT](https://github.com/yl4579/PL-BERT)). Weights pre-trained on English Wikipedia (README) | **Yes**, fine-tuned inside the model | ⚠️ Not non-commercial. Wikipedia text is CC BY-SA, and whether weights inherit that is unsettled. Low risk, mention to lawyer. |
| Text aligner / ASR (`Utils/ASR`) | Aligns text to audio during training | Code **MIT** ([AuxiliaryASR](https://github.com/yl4579/AuxiliaryASR)). Weights pre-trained on **LibriTTS, JVS, and AiShell** (README). **JVS audio terms allow only research and personal use; commercial use requires contacting the owners** ([JVS page](https://sites.google.com/site/shinnosuketakamichi/research-topics/jvs_corpus)). | Training-time only. Can be **stripped** from released weights (to verify) | 🚩 **Potential blocker under a strict reading.** A JVS-trained component helped train the base checkpoint and would help train ours. Fix: retrain the aligner English-only on LibriTTS + OpenSanta (MIT code), and ask a lawyer whether the base checkpoint's history matters (see the clean-chain option, §2). |
| Pitch extractor JDC (`Utils/JDC`) | F0 extractor for training losses | Code **MIT** ([PitchExtractor](https://github.com/yl4579/PitchExtractor)). Pre-trained on LibriTTS only (README) | Training-time only, strippable | ✅ OK |
| Vocoder / decoder | HiFi-GAN-style decoder in the LibriTTS model (iSTFTNet for LJSpeech) | Part of the StyleTTS2 checkpoint. Code MIT (references [hifi-gan](https://github.com/jik876/hifi-gan), [iSTFTNet](https://github.com/rishikksh20/iSTFTNet-pytorch)) | **Yes** | Same status as the checkpoint |
| WavLM (`microsoft/wavlm-base-plus`) | SLM discriminator, used during training only (`config_ft.yml`) | Repo [microsoft/unilm](https://github.com/microsoft/unilm) is MIT. The HF model page shows no license tag. Its training-data terms **not verified** | **No** (discriminator only) | ⚠️ Unclear but not shipped. Note for lawyer. |
| espeak-ng + `phonemizer` | Text → phonemes, at training and inference | **GPL-3.0** ([espeak-ng](https://github.com/espeak-ng/espeak-ng), [phonemizer](https://github.com/bootphon/phonemizer)) | **No.** Runtime tool. Weights learn from phoneme strings, not GPL code. The StyleTTS2 README itself keeps the GPL inference dependency out of the MIT repo | ✅ Weights OK. Any **inference package** that bundles or imports espeak-ng must be GPL-3.0. An MIT path exists via gruut, "albeit lower quality" (README), and gruut is now archived. |
| SpeechBrain ECAPA speaker model | Evaluation only (anti-cloning check) | **Apache-2.0** ([HF](https://huggingface.co/speechbrain/spkrec-ecapa-voxceleb)) | No | ✅ OK |

**Voice-cloning notice in the repo:** the README asks pretrained-model users to tell listeners speech is synthesized,
or to only use voices whose speakers gave permission. **We satisfy the permission branch:** every OpenSanta speaker
consented (CONSENT.md). Our acceptable-use policy also requires disclosure where people could think a live human is
speaking. We'll restate the upstream rule in our model card and pass it down.

### Verdict
- **No non-commercial term was found in anything we'd ship.** Commercial release looks achievable.
- **We must inherit:** (1) the StyleTTS2 pretrained-model disclosure rule, (2) attribution for LibriTTS (CC BY 4.0) and for the
  OpenSanta Dataset (CC BY 4.0), and (3) MIT notices for the code and components.
- **Can we use Apache-2.0 or an OpenRAIL-M style license for our weights?** Yes, either can sit on top, as long as the inherited
  disclosure rule and attributions go with it. A pure Apache-2.0 release would still carry that upstream rule as a notice,
  so it isn't completely restriction-free.
- **Recommendation: stay with an OpenRAIL-M style license** (commercial use allowed). Its short restricted-use list (no fraud
  or deception, no impersonating contributors or real people, plus the upstream disclosure rule) matches what we must inherit
  and what we promised contributors. If Gav wants strict OSI-style "open source" wording, use Apache-2.0 plus a NOTICE carrying
  the upstream rule, and publish the AUP as a request.
- **Unclear, needs a lawyer:**
  - the base checkpoint has no formal license grant (README terms only)
  - the JVS-trained aligner in the base model's history (potential blocker for "truly open"; §2 has a clean option)
  - PL-BERT trained on CC BY-SA text
  - whether trained weights are derivative works of their data at all

---

## 2. Training approach (a blended Santa from many speakers)

### Choose the chain first
- **Option A, pragmatic (recommended for v1, pending the lawyer):**
  - fine-tune the LibriTTS multi-speaker checkpoint
  - use a **retrained English-only aligner** (LibriTTS + OpenSanta) for our fine-tune
  - **strip training-only modules** (aligner, JDC, discriminators) from released weights. We still need to verify which
    keys inference needs.
- **Option B, clean chain:** train StyleTTS2 from scratch on LibriTTS (CC BY 4.0) plus OpenSanta, with every component retrained on
  commercially usable data. This removes the JVS question but costs far more compute. The repo reports 24 h of LJSpeech from
  scratch took ~2.5 days on four A100s. LibriTTS is much larger, and I found no reported figure for it.

### Data prep (established practice for StyleTTS2)
1. Take only **accepted clips** (QC passed, maintainer approved, consent on file, not withdrawn).
2. **Resample 48 kHz → 24 kHz mono.** StyleTTS2's aligner and pitch extractor are pre-trained on 24 kHz (README; `sr: 24000` in `config_ft.yml`).
3. **Trim** edge silence to ~0.1–0.2 s and keep a short tail. Drop very short clips and split anything over ~10 s so
   clips fit `max_len` (project choices to tune). Fine-tuning tips and VRAM reports: [discussion #81](https://github.com/yl4579/StyleTTS2/discussions/81).
4. **Normalize transcripts** exactly as read: numbers are already spelled out in our script. Laugh lines keep their written form.
5. **Phonemize** with espeak-ng (en-us), the same frontend as the base model, so phonemes match at inference.
6. Write lists as `filename.wav|transcription|speaker` (README), with **one speaker ID per contributor**.
7. **Split train/val by speaker:** hold out ~10% of speakers entirely, plus a few core lines from each training speaker, so
   validation also measures how well the model handles unseen voices.
8. Provide an `OOD_data` text list for SLM adversarial training (README). Use our script's sentences plus other
   public-domain or self-written text, not copyrighted text.

### Fine-tune (established)
- `train_finetune.py` with `config_ft.yml`, `multispeaker: true`, from the LibriTTS checkpoint (README).
- Quality-first settings:
  - keep style diffusion and **SLM adversarial training on**. Skipping them saves VRAM but "the quality could be worse" (README)
  - use a long `max_len` (400–800 frames ≈ 5–10 s). Short `max_len` causes start and end artifacts (#81)
  - batch size around the README's suggested 16 is unrealistic on one GPU. Use the largest that fits, (project choice)
- Single GPU, because the second-stage DDP is broken (README). Mixed-precision fine-tuning gives ~10% VRAM savings (#81).

### Getting one Santa voice
| Method | Status | Notes |
|---|---|---|
| **Style from a reference clip:** compute the style vector from a chosen reference recording at inference | **Established** (multi-speaker inference demo) | Simple. But the result sounds like that one speaker, which conflicts with the anti-cloning goal unless the reference is itself synthetic or blended. |
| **Average or interpolate style vectors** across the best-matching speakers' core-set clips to make a fixed "OpenSanta style" | **Experimental** | StyleTTS2 styles are fixed-size vectors, so averaging is mechanically easy. Whether the average sounds natural and stable has to be tested. Choose speakers by delivery match (core set) and listener ratings. |
| **Second-pass fine-tune** on a curated subset labelled as one speaker ("santa") | **Experimental** for a deliberate blend (fine-tuning itself is established) | Can give a more coherent single voice. Risk: muddy or averaged timbre, or leaning toward the subset's dominant speaker. Watch the similarity check (§5). |

**Plan:** fine-tune multi-speaker → build an averaged style from 5–15 well-matched speakers → evaluate. If it's not
coherent enough, do a second-pass fine-tune on the curated subset → evaluate again.

**Release safeguard (experimental, decision for Gav):** a multi-speaker StyleTTS2 model can mimic voices from any reference
clip (zero-shot adaptation is a headline feature, per the README abstract). To stay true to our consent promise and AUP,
release a **Santa-only package**: the weights plus the fixed OpenSanta style vector(s), without the style encoder if inference
works without it. This has to be verified technically, and it reduces cloning use but can't fully prevent it.

---

## 3. How much data
- **Reported points:**
  - The repo's default fine-tune uses **~1 hour (~1k samples)** of LJSpeech and gets quality "slightly worse" than training from
    scratch on 24 h (README).
  - Community fine-tunes report working with **30 min and 1 h** datasets ([discussion #128](https://github.com/yl4579/StyleTTS2/discussions/128))
    and a **5 h 50 min** dataset (#81).
- **OpenSanta math:** one contributor (core + one pack) ≈ 4.7–6 min of speech, so **1 hour ≈ 10–13 contributors.**
- **Suggested v1 range (a judgement extrapolated from those reports, not a published number):**
  - **Minimum to start:** ~1 h accepted audio, about **12–15 speakers**, with every pack covered by at least 2 speakers.
  - **Good v1:** ~**2–4 h**, about **25–50 speakers** (roughly 4–8 per pack). More speakers give better choices for the blend
    and a more robust model.
  - Beyond ~5 h, gains are likely from better curation rather than more hours. Untested for this project.

## 4. Compute
- **VRAM, from fine-tuning reports in #81** (default `config_ft.yml`, 5 h 50 min dataset):

  | Setup | VRAM | Fits on |
  |---|---|---|
  | Batch 4, `max_len` 100, style diffusion on, no SLM adversarial training | ~22 GB | 24 GB card |
  | Same, with SLM adversarial training | ~28 GB | Too big for 24 GB |
  | Batch 2, `max_len` 175, fp16 | <19 GB | 24 GB card (4090) |
  | Batch 4, `max_len` 800 | ~76.5 GB | 80 GB A100 |

- **Time:**
  - README: 1 h of data, 50 epochs ≈ **4 h on four A100s**.
  - #128: an A6000 (48 GB) took **~1.5 days for 30 min** and **3.5–4 days for 1 h**.
  - #128: a Colab T4 was "not very feasible" for high fidelity.
- **Options:**
  - **Rented 80 GB GPU (A100/H100): recommended** for a quality-first run, because it allows a long `max_len` with SLM adversarial training.
  - **Home 24 GB GPU (e.g. 4090):** possible only with short `max_len` and small batches, which are known quality compromises (#81).
    Good for data checks and short trials, not for the flagship run.
- **Rough cost (derived, wide):** Hugging Face lists 1× A100 (80 GB, "large") at **$2.50/hour** as Space hardware
  ([pricing](https://huggingface.co/pricing)). Other providers vary, and I didn't compare them.
  - Scaling the README's ~16 A100-hours per hour of data, one run on 1–4 h of data is roughly **16–100 GPU-hours ≈ $40–$250**.
  - With 3–5 runs for tuning and the blend experiments, budget roughly **$150–$1,000**. Treat this as an order of magnitude.

## 5. Evaluation
1. **Listening test (MOS style):**
   - volunteers rate naturalness 1–5 on a fixed set of unseen sentences, mixing real recordings (anchors) and synthetic clips in random order
   - add a 1–5 "classic warm Santa" rating, and an AI-or-human question
   - aim for 20+ raters, report mean ± confidence interval, and compare model versions
2. **Consistency against the core set:**
   - synthesize all 25 core lines and check pronunciation (ASR WER with the `qc_check.py` normalizer)
   - check prosody spread across lines and laughs
   - a human listens for "same Santa" across lines
3. **Anti-cloning check (consent safeguard):**
   - compute speaker embeddings (SpeechBrain ECAPA) for the blended voice and for **every contributor** (their core set)
   - calibrate thresholds from our own data: same-speaker scores vs different-speaker scores
   - **release only if the blend's similarity to every contributor is in the different-speaker range**, with margin
   - if one contributor scores too high, re-blend without them or with less weight, and re-test
   - publish the method and max score in the model card
4. **Safety spot-checks:** no artifacts on long text, numbers, or names, and reasonable output on non-script text.

## 6. Release
- **Model card:**
  - goal and intended use, training data (OpenSanta speakers count and hours, LibriTTS base), method, evaluation results
    (MOS, consistency, anti-cloning max similarity), limitations (General American English only, adult voices, artifacts)
  - consent statement, and withdrawal policy (removal from future versions)
- **Credit lines:**
  - "OpenSanta Dataset by OpenSanta contributors ([CONTRIBUTORS URL]), licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)."
  - LibriTTS (CC BY 4.0) attribution
  - StyleTTS2 (MIT, Li et al. 2023) and PL-BERT credits
- **License:** weights license per the decision (§1), plus the AUP from LICENSE-MODEL.md, plus the upstream StyleTTS2 disclosure rule.
- **Disclosure:** state clearly that all output is **AI-generated speech**. Ask users to disclose synthetic speech where listeners
  could think a real person is speaking (matches the upstream rule and our AUP). Give demo clips a spoken or text label.
- **Inference code:** a GPL-3.0 package if it bundles espeak-ng (best quality), or an MIT one with a different phonemizer (lower
  quality). Keep the weights' license separate from the inference code's.

---

## Later: smaller versions (future step, not part of v1)
Once the high-quality voice is released, it could generate a **synthetic Santa dataset** to train a smaller on-device model
such as **Piper**.
- Piper has moved: the old repo [rhasspy/piper](https://github.com/rhasspy/piper) (MIT) is **archived**. Development continues at
  [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl), which is **GPL-3.0** ("GPL-3.0-or-later", per its
  [LICENSING.md](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/LICENSING.md)) and embeds espeak-ng.
- Piper says it makes **no license grant over voice models**: a voice's rights come from its training data and trainer. Its
  [COMMERCIAL_USE.md](https://github.com/OHF-Voice/piper1-gpl/blob/main/docs/COMMERCIAL_USE.md) lists voices whose **whole
  fine-tuning chain** uses commercially usable data, and warns that older lessac-based voices don't qualify.
- So a small OpenSanta Piper voice would need either a commercially clean base voice or training from scratch, with its data
  (our synthetic clips) carrying our model's license and AUP. The engine stays GPL. Check all of this again at that time.

---

## 7. Paying for compute: free programs and cheapest rentals (checked 2026-11-15)
Gav's laptop GPU (RTX 2080 Max-Q, 8 GB) is fine for data prep, QC and maybe inference, but it can't do the training run.
We need one 80 GB GPU (A100/H100) for roughly 1–4 days per run. Everything below comes from official pages read on
2026-11-15. Anything I couldn't verify was dropped. Nothing was applied for or signed up.

### Free or discounted programs
| Program | What it gives | Who can get it | Fits a 1–4 day 80 GB training run? | Link |
|---|---|---|---|---|
| **AWS Cloud Credits for Open Source** | AWS promotional credits for compute and storage. Applicant requests a USD amount; credits last 1 year | Open-source *projects* with an **OSI-approved license**, active maintenance and community, not VC-funded or vendor-dominated. AWS favors projects that complement AWS. Apply with a form emailed to AWS; monthly review, **no credits issued in December** | **Possibly.** Credits cover EC2 GPUs, but the award is discretionary. Our code is MIT (OSI), but the dataset (CC BY) and model license (OpenRAIL-M) are not OSI licenses, so eligibility is unclear | [AWS blog, Mar 2025](https://aws.amazon.com/blogs/opensource/aws-cloud-credits-for-open-source-projects-affirming-our-commitment/) |
| **Modal** | Starter plan: **$30/month free compute**. **Academic grants up to $10k** in credits | Starter: anyone. Academic: "graduate students, labs, and researchers" | Starter: ~12 A100-80GB hours/month, enough for short trials only. Academic credits would cover it, if Gav qualifies (likely needs an affiliation) | [modal.com/pricing](https://modal.com/pricing) |
| **Lightning AI free tier** | Up to 30 free credits (5 at signup + 25 with a card), "~50 GPU hours on interruptible machines" | Individuals (phone number required) | **No** for the main run: on the free tier, A100/H100 sessions are limited to **4 hours**. Fine for setup tests | [lightning.ai/pricing](https://lightning.ai/pricing) |
| **NAIRR Pilot (US NSF)** | Free allocations on national GPU systems (A100/H100) and cloud partners, for 12 months; 3-month start-up projects | **US-based researchers and educators at US institutions**, including non-profits. Institutional email required (no Gmail). Outputs must be openly available | **Yes, technically**, but only with a US university or non-profit partner. Gav alone doesn't qualify | [nairrpilot.org](https://nairrpilot.org/nairr-pilot-proposal-instructions) |
| **TPU Research Cloud (Google)** | Free Cloud TPUs | Researchers who share results (papers, open source, blogs) | **Poor fit:** TPUs, not NVIDIA GPUs. StyleTTS2 is PyTorch/CUDA code and would need porting | [TRC](https://sites.research.google/trc/about/) |
| **Hugging Face community GPU grants** | Free Space hardware | Public, open demos (personal projects allowed) | **No for training.** HF staff on a grant request: "we provide grants to only inference" ([Sep 2025](https://huggingface.co/spaces/Keeby-smilyai/LLM-kitchen/discussions/1)). **Good later for the public demo Space.** ZeroGPU is also inference-style, with short function calls and daily quotas | [Spaces GPU docs](https://huggingface.co/docs/hub/spaces-gpus), [ZeroGPU](https://huggingface.co/docs/hub/spaces-zerogpu) |

**Not open to us now (checked):**
- [Google Cloud research credits](https://edu.google.com/programs/credits/research/): faculty, PhD students and postdocs at accredited institutions only.
- [AWS Cloud Credit for Research](https://aws.amazon.com/government-education/research-and-technical-computing/cloud-credit-for-research/): faculty, staff and enrolled students only, with 90–120 day reviews.
- [Azure credits for open source](https://opensource.microsoft.com/azure-credits/): "The application form is not currently open."
- Microsoft [AFMR](https://www.microsoft.com/en-us/research/collaboration/accelerating-foundation-models-research/): concluded.
- [NVIDIA Academic Grant Program](https://www.nvidia.com/en-us/industries/higher-education-research/academic-grant-program/): "currently not accepting new applications", and full-time faculty only.
- [Oracle for Research](https://go.oracle.com/research-project-award): judged partly on the PI's and institution's research experience, with regional limits. Not a fit for an individual.

**Too small:**
- [Kaggle](https://www.kaggle.com/docs/efficient-gpu-usage): free **P100 (16 GB)**, about 30 h/week.
- [Colab](https://colab.research.google.com/signup):
  - The page lists Pro+ at $49.99/month (Pro's price wasn't shown on the page I read).
  - It says "resources are not guaranteed", GPU types "vary over time", and background runs last up to 24 h.
  - Discussion #128 says the T4 is not workable for this model.

**Dropped (no verifiable public grant found in this pass):** CoreWeave, EleutherAI and LAION community compute, and any Vast.ai, RunPod or Lambda grant. Their pricing is used below.

### Cheapest on-demand 80 GB prices (1 GPU, USD/hour)
| Marketplace | A100 80 GB | H100 80 GB | Source and notes |
|---|---|---|---|
| **Vast.ai** | from **$0.52** (one host). Most offers **$0.87–$1.14** | from **$1.74** (SXM) | Live marketplace offers from Vast's public offer-search API, read 2026-11-15, 6:05 PM PST. Prices change by the minute and host reliability varies. Vast also has a cheaper "interruptible" tier. [vast.ai/pricing](https://vast.ai/pricing) |
| **RunPod** | **$1.19** (PCIe, Community Cloud). $2.09 on Secure Cloud | **$1.99** (PCIe, Community). $2.89 on Secure Cloud | Pricing page "Updated November 12, 2026", billed per second. [runpod.io/pricing](https://www.runpod.io/pricing) |
| **Modal** | **$2.50** ($0.000694/s) | **$3.95** (SXM5) | Preemptible by default. [modal.com/pricing](https://modal.com/pricing) |
| Hugging Face (reference) | $2.50 (Spaces "A100 large") | (H100 removed Dec 2025) | [Spaces GPU docs](https://huggingface.co/docs/hub/spaces-gpus) |
| Lambda (reference) | 80 GB A100 only in 8-GPU machines ($3.19 per GPU) | $3.79 (1× PCIe) | Prices listed as effective Nov 16, 2026, 00:00 UTC. [lambda.ai/pricing](https://lambda.ai/pricing) |

**What this means for the budget:** at about $1.0–1.2/hour, one 1–4 day run (24–96 GPU-hours) costs roughly **$25–$115**.
That's lower than the §4 estimate, which used HF's $2.50/hour. Practical notes:
- Save checkpoints often, because marketplace hosts can fail.
- Upload **only** the accepted training audio and transcripts.
- **Consent forms, consent clips and contributor emails never go to a rented GPU.**
