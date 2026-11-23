# OpenSanta Recorder PWA

Mobile-first static progressive web app for contributor voice consent and line recording.

## Updating script lines

The recorder reads `record/lines.json`, generated from `script/lines.tsv`. Whenever `script/lines.tsv` changes, run:

```bash
python3 tools/build_record_lines.py
```

## Receiver configuration

Set `RECEIVER_URL` in `record/config.js` to the deployed Google Apps Script Web App URL (from `opensanta-drafts/record-receiver/Code.gs`) before publishing. Keep no secrets in `record/`.

On load, the page `GET`s that URL and checks `open`. If the receiver is off, unreachable, or `RECEIVER_URL` is still the placeholder, it shows “Recording opens soon” and hides the record buttons. The same screen appears if an upload returns `error: "closed"`. Flip intake with `switchOn()` / `switchOff()` in the Apps Script editor — no repo push is needed.
