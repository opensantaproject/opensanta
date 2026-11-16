# OpenSanta Project

**Free Santa voice for the masses.**

The OpenSanta Project is a volunteer effort to build a free, open, high-quality classic American Santa text-to-speech (TTS) voice. People contribute their own Santa voice recordings, with documented consent. Those recordings will be published as an open dataset and used to train a voice that anyone can use for stories, games, and other lawful projects, including commercial ones.

This repository holds the project's public docs and a simple website (GitHub Pages, once a remote exists). **Nothing here has been published yet.** The project is in formation.

## Current status: Formation

We are establishing the project, its ideals, the consent process, and this public home. Voice submissions are **not open**. The sign-up form, upload form, and project email still need to be created.

The five stages are: **Formation** (now) → Recording → Dataset → Training → Release.

The main recording window is planned for **December 26, 2026 through January 2027**. A good v1 is aimed at late winter or spring 2027. See [ROADMAP.md](ROADMAP.md) and the [website roadmap](roadmap.html).

### How to update the progress tracker

The site's status bar is driven by [`status.json`](status.json), at the repository root.

1. Set `"current"` to one of: `formation`, `recording`, `dataset`, `training`, `release`.
2. Update `"updated"` (YYYY-MM-DD) and the short `"note"`.
3. For visitors with JavaScript turned off, also edit the tracker markup in `index.html` and `roadmap.html`: move the `is-current` class and `aria-current="step"` to the new stage, mark earlier stages `is-done`, and later ones `is-upcoming`. Keep `data-current` in sync.

The bar still shows the current stage if JavaScript is off, as long as those HTML classes match `status.json`.

## Ideals

1. **Santa belongs to everyone.** He's part of our shared holiday traditions, so his voice should belong to the people: free, open, and owned by no one company.
2. **Consent comes first.** Every contributor is an adult who signs a consent form and records a short spoken consent clip. We don't train on a voice without that.
3. **Contributor-owned audio only.** We only accept recordings the contributor owns, made for this project (or fully owned, with the speaker's written consent).
4. **Open licenses.** The dataset is planned for release under [Creative Commons Attribution 4.0 (CC BY 4.0)](LICENSE-DATASET.md). The [model license](LICENSE-MODEL.md) is still being decided.
5. **No cloning real people without consent.** Don't imitate a famous Santa, an actor, or anyone else. Use your own Santa voice.
6. **No scraped or ripped audio.** We never use audio taken from YouTube, TV, films, podcasts, hotlines, stock sites, or other sources that ban AI training (for example Pixabay, Uppbeat, Envato).

## Documents

| File | What it is |
|---|---|
| [CONSENT.md](CONSENT.md) | Contributor consent and rights declaration (draft, not yet reviewed by a lawyer) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to record and submit, once forms exist |
| [AUDIO-SPEC.md](AUDIO-SPEC.md) | How to record (format, room, mic, phone tips) |
| [script/README.md](script/README.md) | Recording script, packs, and performance guide |
| [script/lines.tsv](script/lines.tsv) | The 280 script lines |
| [LICENSE-DATASET.md](LICENSE-DATASET.md) | Dataset license: CC BY 4.0 |
| [LICENSE-MODEL.md](LICENSE-MODEL.md) | Model license options (not decided) |
| [TRAINING-PLAN.md](TRAINING-PLAN.md) | Technical training plan for the main voice |
| [ROADMAP.md](ROADMAP.md) | Public stages and timeline |
| [tools/qc_check.py](tools/qc_check.py) | Submission quality-check script |

Placeholders such as `[SIGNUP FORM LINK]`, `[FORM LINK]`, and `[PROJECT CONTACT]` stay in the drafts until those things actually exist. Do not treat them as live links.

## Website

The public site is plain HTML and CSS at the repository root (`index.html`, `how-it-works.html`, `roadmap.html`, `faq.html`, `licenses.html`). Headings use a self-hosted copy of Nunito (SIL Open Font License 1.1; see [`assets/fonts/OFL.txt`](assets/fonts/OFL.txt)). No external fonts, no analytics, no trackers.

To preview locally:

```bash
python3 -m http.server 8080
```

Then open <http://localhost:8080/>.

When this repo is published, GitHub Pages can be set to serve from the root of the default branch. The official logo (hat, gold sound-wave beard, and the OpenSanta Project wordmark) and a circular icon are in [`assets/logo/`](assets/logo/).

## License

- Script lines and, when released, the dataset: [CC BY 4.0](LICENSE-DATASET.md).
- Model weights: not decided. See [LICENSE-MODEL.md](LICENSE-MODEL.md).
- The consent form is a project document, not a software license.

A license for the website code and remaining repo files has not been chosen yet.
