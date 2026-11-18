# Maintainer notes

Notes for people running the OpenSanta Project repo and site. For the project overview, see [README.md](README.md).

## Current status: Formation

We are establishing the project, its ideals, the consent process, and this public home. Voice submissions are **not open**. The project email is support@opensanta.org. The sign-up form and upload form still need to be created.

The five stages are: **Formation** (now) → Recording → Dataset → Training → Release.

The main recording window is planned for **December 1, 2026 through January 2027**. A good v1 is aimed at late winter or spring 2027. See [ROADMAP.md](ROADMAP.md) and the [website roadmap](roadmap.html).

### How to update the progress tracker

The site's status bar is driven by [`status.json`](status.json), at the repository root.

1. Set `"current"` to one of: `formation`, `recording`, `dataset`, `training`, `release`.
2. Update `"updated"` (YYYY-MM-DD) and the short `"note"`.
3. For visitors with JavaScript turned off, also edit the tracker markup in `index.html` and `roadmap.html`: move the `is-current` class and `aria-current="step"` to the new stage, mark earlier stages `is-done`, and later ones `is-upcoming`. Keep `data-current` in sync.

The bar still shows the current stage if JavaScript is off, as long as those HTML classes match `status.json`.

## Documents

| File | What it is |
|---|---|
| [CONSENT.md](CONSENT.md) | Contributor consent and rights declaration (draft, not yet reviewed by a lawyer) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to record and submit, once forms exist |
| [AUDIO-SPEC.md](AUDIO-SPEC.md) | How to record (format, room, mic, phone tips) |
| [script/README.md](script/README.md) | Recording script, packs, and performance guide |
| [script/lines.tsv](script/lines.tsv) | The 280 script lines |
| [LICENSE-DATASET.md](LICENSE-DATASET.md) | Dataset license: CC BY 4.0 |
| [LICENSE-MODEL.md](LICENSE-MODEL.md) | Model license: Apache-2.0 |
| [LICENSE-MODEL](LICENSE-MODEL) | Official Apache-2.0 license text |
| [RESPONSIBLE-USE.md](RESPONSIBLE-USE.md) | Non-binding use requests (not license conditions) |
| [LICENSE](LICENSE) | Website code and tools: MIT |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Contributor Covenant 2.1 |
| [TRAINING-PLAN.md](TRAINING-PLAN.md) | Technical training plan for the main voice |
| [ROADMAP.md](ROADMAP.md) | Public stages and timeline |
| [tools/qc_check.py](tools/qc_check.py) | Maintainer/intake quality-check script (optional self-check) |

Placeholders such as `[SIGNUP FORM LINK]`, `[FORM LINK]`, and `[PROJECT CONTACT]` stay in the drafts until those things actually exist. Do not treat them as live links.

## Website

The public site is plain HTML and CSS at the repository root (`index.html`, `how-it-works.html`, `roadmap.html`, `faq.html`, `licenses.html`, `donate.html`). The site uses a self-hosted copy of Figtree (SIL Open Font License 1.1; see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)). No external fonts, no analytics, no trackers.

To preview locally:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

When this repo is published, GitHub Pages can be set to serve from the root of the default branch. The official logo (hat, gold sound-wave beard, and the OpenSanta Project wordmark) and a circular icon are in [`assets/logo/`](assets/logo/). SVG masters are `opensanta-logo.svg` and `opensanta-icon.svg`, from the final approved package. Colors, type, and the centering rule are in [`assets/logo/README.md`](assets/logo/README.md).
