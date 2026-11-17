# Model License (trained voice weights)

## Chosen: Apache License, Version 2.0 (Apache-2.0)

Decided by Gav on 2026-11-17, so the trained voice is official open source (OSI-approved) and can sit alongside the MIT code and the CC BY 4.0 dataset.

Anyone may use, modify, and redistribute the model and its weights, including commercially, if they keep the license and notice files. Apache-2.0 includes a patent grant (section 3) and grants no trademark rights (section 6).

Official text (do not edit):
- In this repository: [LICENSE-MODEL](LICENSE-MODEL)
- https://www.apache.org/licenses/LICENSE-2.0
- SPDX identifier: Apache-2.0

> **The base model's license still limits what we can choose at training time.** The trained model is a derivative of whatever base TTS model we fine-tune. Shortlist only base models whose license allows commercial use and redistribution of fine-tuned weights under Apache-2.0 (or a compatible license). If a candidate base model requires its own terms to pass downstream, we follow those terms or pick a different base model.

Apache-2.0 does not add use restrictions. Requests about impersonation, scams, and harassment are in [RESPONSIBLE-USE.md](RESPONSIBLE-USE.md). That guideline is not a license condition. Upstream rules we must still honor (for example the StyleTTS2 disclosure rule, and attribution for LibriTTS and the OpenSanta Dataset) go in the model card and NOTICE, not as extra license terms.

## Model notice (draft)

```
OpenSanta model — version [X.Y]
Copyright [YEAR] OpenSanta contributors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

or see LICENSE-MODEL in this repository.

Base model: [NAME], licensed under [BASE LICENSE + URL]. Its terms also apply.
Trained on the OpenSanta Dataset [version] by OpenSanta contributors ([CONTRIBUTORS URL]),
licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/). Recorded by consenting adult volunteers.
Synthetic voice. It does not represent or speak for any contributor.
Please see RESPONSIBLE-USE.md for non-binding use requests.
Contact: support@opensanta.org
```
