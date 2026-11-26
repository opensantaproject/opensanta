(function () {
  "use strict";

  const CONFIG = window.OPENSANTA_CONFIG || {};
  const WAV = window.OpenSantaWav;

  const ID_RE = /^C\d{4}$/;
  const PACK_RE = /^P\d{2}$/;
  const DB_NAME = "opensanta-recorder";
  const DB_STORE = "takes";

  const state = {
    screen: "welcome",
    linesData: null,
    contributorId: "",
    pack: "",
    creditName: "",
    fromUrlParams: false,
    mode: "longtake", // "longtake" | "perline"

    // Audio capture state
    mediaStream: null,
    audioCtx: null,
    workletLoaded: false,
    sourceNode: null,
    processorNode: null,
    analyserNode: null,
    isRecording: false,
    recordingTarget: null, // { kind: "test" | "consent" | "longtake" | "line", lineId?: string }
    recordedChunks: [],
    recordStartMs: 0,
    timerInterval: null,
    meterRaf: null,
    wakeLock: null,

    // Upload state
    isUploading: false,
    uploadHidden: false, // page went hidden during the current upload
    uploaded: {}, // itemKey -> fileId, for items the receiver confirmed

    // Long take navigation
    ltIndex: 0,
    plIndex: 0,

    // Recorded takes (each: { kind, lineId, wavBuffer, stats, url, warnings })
    consentTake: null,
    longtakeTake: null,
    lineTakes: {} // lineId -> take
  };

  // ---- DOM helper ----
  const $ = (id) => document.getElementById(id);

  const SCREENS = ["closed", "welcome", "id", "mic", "consent", "record", "review", "send", "done"];
  const STEP_LABELS = {
    closed: "",
    welcome: "",
    id: "Step 1 of 6",
    mic: "Step 2 of 6",
    consent: "Step 3 of 6",
    record: "Step 4 of 6",
    review: "Step 5 of 6",
    send: "Step 6 of 6",
    done: "Complete"
  };

  function receiverUrlIsPlaceholder(url) {
    return !url || url.indexOf("REPLACE_WITH_DEPLOYED_WEB_APP_ID") !== -1;
  }

  async function isReceiverOpen() {
    const url = CONFIG.RECEIVER_URL;
    if (receiverUrlIsPlaceholder(url)) return false;
    try {
      const res = await fetch(url, { method: "GET", cache: "no-store" });
      if (!res.ok) return false;
      const data = await res.json();
      return !!(data && data.ok === true && data.open === true);
    } catch (_) {
      return false;
    }
  }

  function showScreen(name) {
    state.screen = name;
    for (const s of SCREENS) {
      const el = $("screen-" + s);
      if (el) el.hidden = s !== name;
    }
    $("step-badge").textContent = STEP_LABELS[name] || "";
    $("btn-start-over").hidden = name === "welcome" || name === "done" || name === "send" || name === "closed";
    window.scrollTo({ top: 0, behavior: "auto" });

    if (name === "consent") refreshConsentUi();
    if (name === "record") refreshRecordUi();
    if (name === "review") renderReview();
  }

  function formatTimer(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }

  function localIsoDate() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  // ---- IndexedDB persistence ----
  function openDb() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
  }

  const UPLOAD_STATUS_KEY = "upload-status";

  function uploadStatusRow() {
    return {
      key: UPLOAD_STATUS_KEY,
      contributorId: state.contributorId,
      pack: state.pack,
      uploaded: { ...state.uploaded },
      updatedAt: Date.now()
    };
  }

  async function idbSaveUploadStatus() {
    try {
      const db = await openDb();
      if (!db) return;
      await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(uploadStatusRow());
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
      db.close();
    } catch (_) {
      // Ignore storage failures
    }
  }

  async function idbPutTake(key, take) {
    // A new take replaces anything sent earlier under this key, so it must be sent again.
    delete state.uploaded[key];
    try {
      const db = await openDb();
      if (!db) return;
      await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).put(uploadStatusRow());
        tx.objectStore(DB_STORE).put({
          key,
          contributorId: state.contributorId,
          pack: state.pack,
          creditName: state.creditName,
          mode: state.mode,
          kind: take.kind,
          lineId: take.lineId || "",
          wavBuffer: take.wavBuffer,
          stats: take.stats,
          warnings: take.warnings,
          updatedAt: Date.now()
        });
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
      db.close();
    } catch (_) {
      // Ignore storage failures (e.g. private browsing)
    }
  }

  async function idbLoadAll() {
    try {
      const db = await openDb();
      if (!db) return [];
      const rows = await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, "readonly");
        const req = tx.objectStore(DB_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      db.close();
      return rows;
    } catch (_) {
      return [];
    }
  }

  async function idbClearAll() {
    try {
      const db = await openDb();
      if (!db) return;
      await new Promise((resolve) => {
        const tx = db.transaction(DB_STORE, "readwrite");
        tx.objectStore(DB_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
      db.close();
    } catch (_) {
      // Ignore
    }
  }

  function revokeTakeUrl(take) {
    if (take && take.url) {
      try {
        URL.revokeObjectURL(take.url);
      } catch (_) {}
    }
  }

  function clearMemoryTakes() {
    revokeTakeUrl(state.consentTake);
    revokeTakeUrl(state.longtakeTake);
    for (const k of Object.keys(state.lineTakes)) {
      revokeTakeUrl(state.lineTakes[k]);
    }
    state.consentTake = null;
    state.longtakeTake = null;
    state.lineTakes = {};
    state.uploaded = {};
    state.ltIndex = 0;
    state.plIndex = 0;
  }

  function hydrateTake(row) {
    const blob = new Blob([row.wavBuffer], { type: "audio/wav" });
    return {
      kind: row.kind,
      lineId: row.lineId || "",
      wavBuffer: row.wavBuffer,
      stats: row.stats,
      warnings: row.warnings || [],
      url: URL.createObjectURL(blob)
    };
  }

  // ---- Script lines ----
  function getSessionLines() {
    if (!state.linesData) return [];
    const core = state.linesData.core || [];
    const packLines = (state.linesData.packs && state.linesData.packs[state.pack]) || [];
    return [
      ...core.map((l) => ({ ...l, group: "Core set" })),
      ...packLines.map((l) => ({ ...l, group: `Pack ${state.pack}` }))
    ];
  }

  async function loadLines() {
    const res = await fetch(CONFIG.LINES_URL || "./lines.json");
    if (!res.ok) throw new Error("Could not load script lines.");
    state.linesData = await res.json();

    const select = $("input-pack");
    const packKeys = Object.keys(state.linesData.packs || {}).sort();
    for (const p of packKeys) {
      const opt = document.createElement("option");
      opt.value = p;
      opt.textContent = p;
      select.appendChild(opt);
    }
  }

  // ---- Wake Lock ----
  async function acquireWakeLock() {
    if (!("wakeLock" in navigator) || state.wakeLock) return;
    try {
      state.wakeLock = await navigator.wakeLock.request("screen");
      state.wakeLock.addEventListener("release", () => {
        state.wakeLock = null;
      });
    } catch (_) {
      // Optional enhancement
    }
  }

  async function releaseWakeLock() {
    if (!state.wakeLock) return;
    try {
      await state.wakeLock.release();
    } catch (_) {}
    state.wakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (state.isRecording || state.isUploading) acquireWakeLock();
      if (state.isUploading && state.uploadHidden) {
        // Phone slept or tab was backgrounded mid-upload; the request may have been cut off.
        $("send-subtext").textContent = "The upload was paused while the screen was off. Still trying… if it stops, tap Send to finish.";
      }
    } else if (state.isUploading) {
      state.uploadHidden = true;
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (!state.isUploading) return;
    e.preventDefault();
    e.returnValue = "Your recording is still sending. Leave anyway?";
    return e.returnValue;
  });

  window.addEventListener("pagehide", () => {
    if (state.isUploading) state.uploadHidden = true;
  });

  // ---- Microphone & Audio Pipeline ----
  async function ensureAudioPipeline() {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      throw new Error("This browser does not support audio recording.");
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access requires a secure connection (HTTPS).");
    }

    const streamLive =
      state.mediaStream &&
      state.mediaStream.getAudioTracks().some((t) => t.readyState === "live");

    if (!streamLive) {
      const attempts = [
        {
          audio: {
            channelCount: { ideal: 1 },
            sampleRate: { ideal: 48000 },
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        },
        {
          audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        },
        { audio: true }
      ];

      let lastErr = null;
      for (const constraints of attempts) {
        try {
          state.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
          lastErr = null;
          break;
        } catch (err) {
          lastErr = err;
          if (err && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
            throw err;
          }
        }
      }
      if (lastErr) throw lastErr;
    }

    if (!state.audioCtx || state.audioCtx.state === "closed") {
      try {
        state.audioCtx = new AudioCtx({ sampleRate: 48000 });
      } catch (_) {
        state.audioCtx = new AudioCtx();
      }
      state.workletLoaded = false;
    }

    if (state.audioCtx.state === "suspended") {
      await state.audioCtx.resume();
    }

    if (!state.sourceNode) {
      state.sourceNode = state.audioCtx.createMediaStreamSource(state.mediaStream);
      state.analyserNode = state.audioCtx.createAnalyser();
      state.analyserNode.fftSize = 1024;
      state.sourceNode.connect(state.analyserNode);
    }

    if (!state.processorNode) {
      let usedWorklet = false;
      if (state.audioCtx.audioWorklet && !state.workletLoaded) {
        try {
          await state.audioCtx.audioWorklet.addModule("./recorder-worklet.js");
          state.workletLoaded = true;
        } catch (_) {
          state.workletLoaded = false;
        }
      }

      if (state.workletLoaded) {
        const node = new AudioWorkletNode(state.audioCtx, "pcm-recorder-processor", {
          numberOfInputs: 1,
          numberOfOutputs: 0,
          channelCount: 1
        });
        node.port.onmessage = (event) => {
          if (state.isRecording && event.data) {
            state.recordedChunks.push(event.data);
          }
        };
        state.sourceNode.connect(node);
        state.processorNode = node;
        usedWorklet = true;
      }

      if (!usedWorklet) {
        // Fallback for older browsers without AudioWorklet
        const sp = state.audioCtx.createScriptProcessor(4096, 1, 1);
        const silentGain = state.audioCtx.createGain();
        silentGain.gain.value = 0;
        sp.onaudioprocess = (e) => {
          if (!state.isRecording) return;
          const ch = e.inputBuffer.getChannelData(0);
          state.recordedChunks.push(new Float32Array(ch));
        };
        state.sourceNode.connect(sp);
        sp.connect(silentGain);
        silentGain.connect(state.audioCtx.destination);
        state.processorNode = sp;
      }
    }
  }

  function stopMediaTracks() {
    if (state.mediaStream) {
      state.mediaStream.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (_) {}
      });
      state.mediaStream = null;
    }
    if (state.sourceNode) {
      try {
        state.sourceNode.disconnect();
      } catch (_) {}
      state.sourceNode = null;
    }
    if (state.processorNode) {
      try {
        state.processorNode.disconnect();
      } catch (_) {}
      state.processorNode = null;
    }
    if (state.audioCtx && state.audioCtx.state !== "closed") {
      try {
        state.audioCtx.close();
      } catch (_) {}
      state.audioCtx = null;
      state.workletLoaded = false;
    }
  }

  function startLevelMeter(fillEl, labelEl) {
    cancelLevelMeter();
    if (!state.analyserNode) return;
    const buf = new Float32Array(state.analyserNode.fftSize);

    const tick = () => {
      if (!state.analyserNode) return;
      state.analyserNode.getFloatTimeDomainData(buf);
      let peak = 0;
      for (let i = 0; i < buf.length; i++) {
        const a = Math.abs(buf[i]);
        if (a > peak) peak = a;
      }
      const db = 20 * Math.log10(Math.max(peak, 1e-5));
      // Map -60 dBFS..0 dBFS to 0..100%
      const pct = Math.max(2, Math.min(100, ((db + 60) / 60) * 100));
      if (fillEl) fillEl.style.width = pct.toFixed(1) + "%";

      if (labelEl) {
        if (peak >= 0.96) {
          labelEl.textContent = "Too loud — step back slightly from the mic.";
        } else if (db > -25) {
          labelEl.textContent = "Good clear level.";
        } else if (db > -45) {
          labelEl.textContent = "Speak normally — a little closer if you can.";
        } else {
          labelEl.textContent = "Listening… speak a few words to test.";
        }
      }
      state.meterRaf = requestAnimationFrame(tick);
    };
    state.meterRaf = requestAnimationFrame(tick);
  }

  function cancelLevelMeter() {
    if (state.meterRaf) {
      cancelAnimationFrame(state.meterRaf);
      state.meterRaf = null;
    }
  }

  async function beginCapture(target, meterFillEl, timerEl, statusBarEl, stateTextEl) {
    await ensureAudioPipeline();
    state.recordedChunks = [];
    state.recordingTarget = target;
    state.isRecording = true;
    state.recordStartMs = Date.now();

    if (statusBarEl) statusBarEl.classList.add("is-live");
    if (stateTextEl) stateTextEl.textContent = "Recording";
    if (timerEl) timerEl.textContent = "0:00";

    clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
      if (timerEl) timerEl.textContent = formatTimer(Date.now() - state.recordStartMs);
    }, 250);

    startLevelMeter(meterFillEl, null);
    await acquireWakeLock();
  }

  async function finishCapture(statusBarEl, stateTextEl) {
    state.isRecording = false;
    clearInterval(state.timerInterval);
    state.timerInterval = null;
    cancelLevelMeter();
    if (!state.isUploading) await releaseWakeLock();

    if (statusBarEl) statusBarEl.classList.remove("is-live");
    if (stateTextEl) stateTextEl.textContent = "Saved";

    const sampleRate = state.audioCtx ? state.audioCtx.sampleRate : 48000;
    const chunks = state.recordedChunks;
    state.recordedChunks = [];
    const target = state.recordingTarget;
    state.recordingTarget = null;

    const encoded = WAV.encodeWav16(chunks, sampleRate);
    const linesCount = getSessionLines().length;
    const warnings =
      target && target.kind !== "test"
        ? WAV.analyzeTake(encoded, target.kind, linesCount)
        : [];

    const take = {
      kind: target ? target.kind : "unknown",
      lineId: (target && target.lineId) || "",
      wavBuffer: encoded.arrayBuffer,
      stats: {
        sampleRate: encoded.sampleRate,
        durationSec: encoded.durationSec,
        peakDb: encoded.peakDb,
        clippedSamples: encoded.clippedSamples,
        byteLength: encoded.byteLength
      },
      warnings,
      url: URL.createObjectURL(encoded.blob)
    };

    return take;
  }

  // ---- Screen 1: Welcome & URL params ----
  function parseUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const rawId = (params.get("id") || "").trim().toUpperCase();
    const rawPack = (params.get("pack") || "").trim().toUpperCase();
    const validId = ID_RE.test(rawId) ? rawId : "";
    const validPack =
      PACK_RE.test(rawPack) &&
      state.linesData &&
      state.linesData.packs &&
      Object.prototype.hasOwnProperty.call(state.linesData.packs, rawPack)
        ? rawPack
        : "";

    if (validId && validPack) {
      state.contributorId = validId;
      state.pack = validPack;
      state.fromUrlParams = true;
    } else {
      if (validId) state.contributorId = validId;
      if (validPack) state.pack = validPack;
      state.fromUrlParams = false;
    }
  }

  function renderIdScreen() {
    const prefilled = state.fromUrlParams && ID_RE.test(state.contributorId) && PACK_RE.test(state.pack);
    $("id-prefilled-card").hidden = !prefilled;
    $("id-manual-card").hidden = prefilled;

    if (prefilled) {
      $("id-prefilled-text").textContent = `Contributor ${state.contributorId} · Pack ${state.pack}`;
    } else {
      $("input-contributor-id").value = state.contributorId || "";
      $("input-pack").value = state.pack || "";
    }
    $("error-contributor-id").hidden = true;
    $("error-pack").hidden = true;
  }

  // ---- Screen 3: Mic check ----
  async function handleEnableMic() {
    $("mic-error-card").hidden = true;
    try {
      await ensureAudioPipeline();
      $("mic-prompt-card").hidden = true;
      $("mic-live-card").hidden = false;
      $("btn-mic-continue").disabled = false;
      startLevelMeter($("mic-meter-fill"), $("mic-meter-label"));
    } catch (err) {
      $("mic-live-card").hidden = true;
      $("mic-error-card").hidden = false;
      const isNotFound = err && (err.name === "NotFoundError" || err.name === "DevicesNotFoundError");
      $("mic-error-title").textContent = isNotFound
        ? "No microphone found"
        : "Microphone access is needed";
      $("mic-error-body").textContent = isNotFound
        ? "Please connect a microphone or check your device settings, then try again."
        : (err && err.message) || "Please allow microphone access in your browser settings to continue.";
    }
  }

  let micTestTimeout = null;
  async function handleMicTest() {
    if (state.isRecording) return;
    const btn = $("btn-mic-test");
    btn.disabled = true;
    btn.textContent = "Recording 3 seconds…";
    $("mic-test-playback").hidden = true;

    try {
      await beginCapture({ kind: "test" }, $("mic-meter-fill"), null, null, null);
      micTestTimeout = setTimeout(async () => {
        const take = await finishCapture(null, null);
        const audio = $("mic-test-audio");
        if (audio.dataset.objUrl) {
          try { URL.revokeObjectURL(audio.dataset.objUrl); } catch (_) {}
        }
        audio.src = take.url;
        audio.dataset.objUrl = take.url;
        audio.load();
        $("mic-test-playback").hidden = false;
        btn.disabled = false;
        btn.textContent = "Record another 3-second test";
        startLevelMeter($("mic-meter-fill"), $("mic-meter-label"));
      }, 3000);
    } catch (err) {
      btn.disabled = false;
      btn.textContent = "Record a 3-second test";
      $("mic-error-card").hidden = false;
      $("mic-error-body").textContent = err.message || "Could not start recording.";
    }
  }

  // ---- Screen 4: Voice consent ----
  function updateConsentQuote() {
    const rawName = ($("input-credit-name").value || "").trim();
    state.creditName = rawName;
    const spokenName = rawName || "anonymous";
    const id = state.contributorId || "C0042";
    const today = localIsoDate();
    $("consent-spoken-text").textContent =
      `“My name is ${spokenName}, contributor ID ${id}. Today is ${today}. ` +
      `I’ve read and agree to the OpenSanta consent form, version ${CONFIG.CONSENT_VERSION || "0.6"}.”`;
  }

  // Uses aria-disabled (not the disabled attribute) so a tap on the
  // not-yet-ready button can still point the person to the agreement box.
  function setConsentContinueDisabled(isDisabled) {
    $("btn-consent-continue").setAttribute("aria-disabled", isDisabled ? "true" : "false");
  }

  function handleConsentContinue() {
    if ($("btn-consent-continue").getAttribute("aria-disabled") === "true") {
      const checkbox = $("consent-agree-checkbox");
      if (!checkbox.checked && !state.isRecording) {
        const label = checkbox.closest(".agree-label");
        label.scrollIntoView({ behavior: "smooth", block: "center" });
        label.classList.remove("is-attention");
        void label.offsetWidth; // restart the highlight animation
        label.classList.add("is-attention");
        setTimeout(() => label.classList.remove("is-attention"), 1800);
        try {
          checkbox.focus({ preventScroll: true });
        } catch (_) {}
      }
      return;
    }
    showScreen("record");
  }

  function refreshConsentUi() {
    updateConsentQuote();
    const agreed = $("consent-agree-checkbox").checked;
    const hasClip = Boolean(state.consentTake);

    if (hasClip) {
      const audio = $("consent-audio");
      if (audio.src !== state.consentTake.url) {
        audio.src = state.consentTake.url;
        audio.load();
      }
      $("consent-playback-wrap").hidden = false;
      $("btn-consent-record").textContent = state.isRecording ? "Stop recording" : "Re-record consent";
      const warnBox = $("consent-warn-box");
      if (state.consentTake.warnings && state.consentTake.warnings.length > 0) {
        warnBox.textContent = state.consentTake.warnings.join(" ");
        warnBox.hidden = false;
      } else {
        warnBox.hidden = true;
      }
    } else {
      $("consent-playback-wrap").hidden = true;
      $("btn-consent-record").textContent = state.isRecording ? "OK, done" : "Record consent";
    }

    setConsentContinueDisabled(!(agreed && hasClip) || state.isRecording);

    if (!hasClip && !agreed) {
      $("consent-next-hint").textContent = "Check the agreement box and record your voice consent to continue.";
    } else if (!hasClip) {
      $("consent-next-hint").textContent = "Record your voice consent above to continue.";
    } else if (!agreed) {
      $("consent-next-hint").textContent = "Check the agreement box above to continue.";
    } else {
      $("consent-next-hint").textContent = "";
    }
  }

  async function toggleConsentRecord() {
    const btn = $("btn-consent-record");
    if (!state.isRecording) {
      btn.classList.remove("btn-record");
      btn.classList.add("btn-stop");
      btn.textContent = "OK, done";
      $("consent-playback-wrap").hidden = true;
      setConsentContinueDisabled(true);
      try {
        await beginCapture(
          { kind: "consent" },
          $("consent-meter-fill"),
          $("consent-timer"),
          $("consent-status-bar"),
          $("consent-rec-state")
        );
      } catch (err) {
        btn.classList.remove("btn-stop");
        btn.classList.add("btn-record");
        btn.textContent = "Record consent";
        alert(err.message || "Could not access microphone.");
      }
    } else {
      btn.classList.remove("btn-stop");
      btn.classList.add("btn-record");
      revokeTakeUrl(state.consentTake);
      state.consentTake = await finishCapture($("consent-status-bar"), $("consent-rec-state"));
      await idbPutTake("consent", state.consentTake);
      refreshConsentUi();
    }
  }

  // ---- Screen 5: Recording (Long take + Per-line) ----
  function refreshRecordUi() {
    const lines = getSessionLines();
    if (!lines.length) return;

    $("record-kicker").textContent = `Step 4 · Pack ${state.pack} (${lines.length} lines)`;
    $("longtake-view").hidden = state.mode !== "longtake";
    $("perline-view").hidden = state.mode !== "perline";

    if (state.mode === "longtake") {
      renderLongTakeView(lines);
    } else {
      renderPerLineView(lines);
    }
  }

  function renderLongTakeView(lines) {
    if (state.ltIndex >= lines.length) state.ltIndex = lines.length - 1;
    if (state.ltIndex < 0) state.ltIndex = 0;

    const cur = lines[state.ltIndex];
    $("tip-first-id").textContent = lines[0].id;
    $("lt-line-counter").textContent = `Line ${state.ltIndex + 1} of ${lines.length} · ${cur.group}`;
    $("lt-say-pill").textContent = `Say aloud: “${cur.id}”`;
    $("lt-line-text").textContent = cur.text;

    if (cur.direction) {
      $("lt-direction").textContent = cur.direction;
      $("lt-direction").hidden = false;
    } else {
      $("lt-direction").hidden = true;
    }

    const queue = $("lt-line-queue");
    queue.innerHTML = "";
    lines.forEach((l, idx) => {
      const li = document.createElement("li");
      if (idx === state.ltIndex) li.className = "is-current";
      else if (idx < state.ltIndex) li.className = "is-done";
      const idSpan = document.createElement("span");
      idSpan.className = "q-id";
      idSpan.textContent = l.id;
      const textSpan = document.createElement("span");
      textSpan.textContent = l.text;
      li.appendChild(idSpan);
      li.appendChild(textSpan);
      queue.appendChild(li);
    });

    const isLive = state.isRecording && state.recordingTarget && state.recordingTarget.kind === "longtake";
    const hasDone = Boolean(state.longtakeTake) && !isLive;

    $("btn-lt-start").hidden = isLive || hasDone;
    $("lt-live-controls").hidden = !isLive;
    $("lt-done-controls").hidden = !hasDone;
    $("longtake-tips").hidden = isLive;
    $("btn-switch-perline").hidden = isLive;
    $("btn-record-back-consent").hidden = isLive;

    if (isLive) {
      const isLast = state.ltIndex === lines.length - 1;
      $("btn-lt-next").textContent = isLast ? "Finish recording" : "Next line";
      $("btn-lt-prev").disabled = state.ltIndex === 0;
    }
    if (hasDone) {
      $("lt-rec-state").textContent = `Recorded (${formatTimer(state.longtakeTake.stats.durationSec * 1000)})`;
      $("lt-timer").textContent = formatTimer(state.longtakeTake.stats.durationSec * 1000);
    } else if (!isLive) {
      $("lt-rec-state").textContent = "Ready to record";
      $("lt-timer").textContent = "0:00";
    }
  }

  async function startLongTake() {
    state.ltIndex = 0;
    try {
      await beginCapture(
        { kind: "longtake" },
        $("lt-meter-fill"),
        $("lt-timer"),
        $("lt-status-bar"),
        $("lt-rec-state")
      );
      renderLongTakeView(getSessionLines());
    } catch (err) {
      alert(err.message || "Could not start microphone.");
    }
  }

  async function stopLongTake() {
    if (!state.isRecording) return;
    revokeTakeUrl(state.longtakeTake);
    state.longtakeTake = await finishCapture($("lt-status-bar"), $("lt-rec-state"));
    await idbPutTake("longtake", state.longtakeTake);
    renderLongTakeView(getSessionLines());
  }

  function renderPerLineView(lines) {
    if (state.plIndex >= lines.length) state.plIndex = lines.length - 1;
    if (state.plIndex < 0) state.plIndex = 0;

    const cur = lines[state.plIndex];
    const existing = state.lineTakes[cur.id];
    const isLive = state.isRecording && state.recordingTarget && state.recordingTarget.kind === "line";

    const pills = $("pl-pills");
    pills.innerHTML = "";
    lines.forEach((l, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "line-pill";
      if (idx === state.plIndex) b.classList.add("is-active");
      if (state.lineTakes[l.id]) b.classList.add("is-recorded");
      b.textContent = l.id;
      b.disabled = isLive;
      b.addEventListener("click", () => {
        state.plIndex = idx;
        renderPerLineView(lines);
      });
      pills.appendChild(b);
    });

    $("pl-line-counter").textContent = `Line ${state.plIndex + 1} of ${lines.length} · ${cur.group}`;
    $("pl-line-id").textContent = cur.id;
    $("pl-line-text").textContent = cur.text;
    if (cur.direction) {
      $("pl-direction").textContent = cur.direction;
      $("pl-direction").hidden = false;
    } else {
      $("pl-direction").hidden = true;
    }

    const recBtn = $("btn-pl-record");
    if (isLive) {
      recBtn.classList.remove("btn-record");
      recBtn.classList.add("btn-stop");
      recBtn.textContent = "Stop";
    } else {
      recBtn.classList.remove("btn-stop");
      recBtn.classList.add("btn-record");
      recBtn.textContent = existing ? "Re-record this line" : "Record this line";
    }

    if (existing && !isLive) {
      const audio = $("pl-audio");
      if (audio.src !== existing.url) {
        audio.src = existing.url;
        audio.load();
      }
      $("pl-playback-wrap").hidden = false;
      $("pl-rec-state").textContent = "Recorded";
      $("pl-timer").textContent = formatTimer(existing.stats.durationSec * 1000);
      const warnBox = $("pl-warn-box");
      if (existing.warnings && existing.warnings.length > 0) {
        warnBox.textContent = existing.warnings.join(" ");
        warnBox.hidden = false;
      } else {
        warnBox.hidden = true;
      }
    } else {
      $("pl-playback-wrap").hidden = true;
      if (!isLive) {
        $("pl-rec-state").textContent = "Ready";
        $("pl-timer").textContent = "0:00";
      }
    }

    $("btn-pl-prev").disabled = isLive || state.plIndex === 0;
    $("btn-pl-next").disabled = isLive || state.plIndex === lines.length - 1;
    $("btn-switch-longtake").disabled = isLive;
    $("btn-pl-back-consent").disabled = isLive;

    const recordedCount = lines.filter((l) => Boolean(state.lineTakes[l.id])).length;
    $("btn-pl-review").disabled = isLive || recordedCount === 0;
    $("btn-pl-review").textContent =
      recordedCount === lines.length
        ? "Review and send"
        : `Review and send (${recordedCount} of ${lines.length} recorded)`;
  }

  async function togglePerLineRecord() {
    const lines = getSessionLines();
    const cur = lines[state.plIndex];
    if (!cur) return;

    if (!state.isRecording) {
      try {
        await beginCapture(
          { kind: "line", lineId: cur.id },
          $("pl-meter-fill"),
          $("pl-timer"),
          $("pl-status-bar"),
          $("pl-rec-state")
        );
        renderPerLineView(lines);
      } catch (err) {
        alert(err.message || "Could not access microphone.");
      }
    } else {
      revokeTakeUrl(state.lineTakes[cur.id]);
      const take = await finishCapture($("pl-status-bar"), $("pl-rec-state"));
      state.lineTakes[cur.id] = take;
      await idbPutTake("line:" + cur.id, take);
      renderPerLineView(lines);
    }
  }

  // ---- Screen 6: Review ----
  function makeReviewCard(title, subtitle, take, onRedo) {
    const card = document.createElement("div");
    card.className = "card";

    const top = document.createElement("div");
    top.className = "script-meta";

    const h = document.createElement("strong");
    h.style.color = "var(--white)";
    h.textContent = title;
    top.appendChild(h);

    const badge = document.createElement("span");
    const hasWarn = take.warnings && take.warnings.length > 0;
    badge.className = "status-pill " + (hasWarn ? "is-warn" : "is-ok");
    badge.textContent = hasWarn ? "Check" : "Ready · " + formatTimer(take.stats.durationSec * 1000);
    top.appendChild(badge);
    card.appendChild(top);

    if (subtitle) {
      const sub = document.createElement("p");
      sub.className = "muted";
      sub.textContent = subtitle;
      card.appendChild(sub);
    }

    const audio = document.createElement("audio");
    audio.className = "audio-player";
    audio.controls = true;
    audio.preload = "auto";
    audio.src = take.url;
    card.appendChild(audio);

    if (hasWarn) {
      const warn = document.createElement("div");
      warn.className = "notice is-warn";
      warn.textContent = take.warnings.join(" ");
      card.appendChild(warn);
    }

    const redoBtn = document.createElement("button");
    redoBtn.type = "button";
    redoBtn.className = "btn btn-secondary btn-sm";
    redoBtn.textContent = "Re-record";
    redoBtn.addEventListener("click", onRedo);
    card.appendChild(redoBtn);

    return card;
  }

  function renderReview() {
    const list = $("review-list");
    list.innerHTML = "";

    if (state.consentTake) {
      list.appendChild(
        makeReviewCard(
          "Voice consent",
          `Contributor ${state.contributorId} · Consent v${CONFIG.CONSENT_VERSION || "0.6"}`,
          state.consentTake,
          () => showScreen("consent")
        )
      );
    }

    if (state.mode === "longtake" && state.longtakeTake) {
      const lines = getSessionLines();
      list.appendChild(
        makeReviewCard(
          `Your Santa lines (Pack ${state.pack})`,
          `One long take · ${lines.length} lines`,
          state.longtakeTake,
          () => {
            showScreen("record");
          }
        )
      );
    } else {
      const lines = getSessionLines();
      lines.forEach((l, idx) => {
        const t = state.lineTakes[l.id];
        if (!t) return;
        list.appendChild(
          makeReviewCard(
            `${l.id}: ${l.text}`,
            l.group,
            t,
            () => {
              state.plIndex = idx;
              showScreen("record");
            }
          )
        );
      });
    }

    const hasAudio =
      Boolean(state.consentTake) &&
      (state.mode === "longtake"
        ? Boolean(state.longtakeTake)
        : Object.keys(state.lineTakes).length > 0);
    $("btn-review-send").disabled = !hasAudio;
  }

  // ---- Screen 7: Send ----
  function buildUploadItems() {
    const items = [];
    if (state.consentTake) {
      items.push({
        key: "consent",
        label: "voice consent",
        kind: "consent",
        lineId: "",
        wavBuffer: state.consentTake.wavBuffer
      });
    }
    if (state.mode === "longtake" && state.longtakeTake) {
      items.push({
        key: "longtake",
        label: "Santa lines",
        kind: "longtake",
        lineId: "",
        wavBuffer: state.longtakeTake.wavBuffer
      });
    } else {
      const lines = getSessionLines();
      for (const l of lines) {
        if (state.lineTakes[l.id]) {
          items.push({
            key: "line:" + l.id,
            label: `line ${l.id}`,
            kind: "line",
            lineId: l.id,
            wavBuffer: state.lineTakes[l.id].wavBuffer
          });
        }
      }
    }
    return items;
  }

  function randomUploadId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let out = "u_";
    for (let i = 0; i < 16; i++) {
      out += chars[Math.floor(Math.random() * chars.length)];
    }
    return out;
  }

  const REQUEST_TIMEOUT_MS = 180000;

  // expectPartial: true for a non-final chunk (reply must say partial:true),
  // false for a whole file or final chunk (reply must carry a fileId).
  async function postJsonWithRetry(url, payload, maxAttempts, expectPartial) {
    let lastError = null;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const controller = window.AbortController ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS) : null;
        let res;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: JSON.stringify(payload),
            signal: controller ? controller.signal : undefined
          });
        } finally {
          if (timer) clearTimeout(timer);
        }
        const text = await res.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (_) {
          throw new Error("Unexpected response from server.");
        }
        if (!res.ok || !data || !data.ok) {
          const msg = (data && data.error) || `Upload failed (status ${res.status})`;
          const err = new Error(msg);
          if ((data && data.retryable === false) || msg === "closed") {
            err.retryable = false;
            throw err;
          }
          throw err;
        }
        const confirmed = expectPartial
          ? data.partial === true
          : typeof data.fileId === "string" && data.fileId.length > 0;
        if (!confirmed) {
          throw new Error("The server did not confirm it saved your audio.");
        }
        return data;
      } catch (err) {
        lastError = err;
        if (err && err.retryable === false) throw err;
        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
    }
    throw lastError || new Error("Upload failed.");
  }

  function setProgress(pct, statusText, subText) {
    const clamped = Math.max(0, Math.min(100, Math.round(pct)));
    $("send-progress-fill").style.width = clamped + "%";
    $("send-progressbar").setAttribute("aria-valuenow", String(clamped));
    if (statusText) $("send-status-text").textContent = statusText;
    if (subText) $("send-subtext").textContent = subText;
  }

  function formatMb(bytes) {
    const mb = bytes / (1024 * 1024);
    return (mb < 0.1 ? 0.1 : mb).toFixed(1) + " MB";
  }

  function showSendError(message) {
    $("send-error-box").hidden = false;
    $("send-error-message").textContent = message || "";
    $("btn-send-retry").hidden = false;
    $("btn-send-back-review").hidden = false;
    $("send-keep-open").hidden = true;
  }

  async function runUpload() {
    if (state.isUploading) return;
    showScreen("send");
    $("send-error-box").hidden = true;
    $("btn-send-retry").hidden = true;
    $("btn-send-back-review").hidden = true;

    const url = CONFIG.RECEIVER_URL;
    if (receiverUrlIsPlaceholder(url)) {
      showScreen("closed");
      return;
    }

    const items = buildUploadItems();
    const threshold = CONFIG.CHUNK_THRESHOLD_BYTES || 6 * 1024 * 1024;
    const chunkSize = CONFIG.CHUNK_SIZE_BYTES || 4 * 1024 * 1024;

    // Skip anything the receiver already confirmed on an earlier try
    const itemJobs = items
      .map((item, i) => {
        const bytes = new Uint8Array(item.wavBuffer);
        const totalChunks = bytes.byteLength > threshold ? Math.ceil(bytes.byteLength / chunkSize) : 1;
        return { item, bytes, totalChunks, position: i + 1 };
      })
      .filter((job) => !state.uploaded[job.item.key]);
    const totalItems = items.length;
    const totalRequests = itemJobs.reduce((acc, j) => acc + j.totalChunks, 0);
    let completedRequests = 0;

    state.isUploading = true;
    state.uploadHidden = document.visibilityState === "hidden";
    await acquireWakeLock();
    $("send-keep-open").hidden = false;
    setProgress(5, "Starting upload…", "Please keep this page open until it finishes.");

    try {
      for (const job of itemJobs) {
        const { item, bytes, totalChunks, position } = job;
        const uploadId = totalChunks > 1 ? randomUploadId() : "";
        const baseLabel = `Sending ${position} of ${totalItems} (${formatMb(bytes.byteLength)})`;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
          const partLabel =
            totalChunks > 1 ? `${baseLabel} · part ${chunkIndex + 1} of ${totalChunks}` : baseLabel;
          setProgress((completedRequests / totalRequests) * 95 + 5, partLabel, `Your ${item.label}`);

          const start = chunkIndex * chunkSize;
          const end = Math.min(bytes.byteLength, start + chunkSize);
          const slice = totalChunks > 1 ? bytes.subarray(start, end) : bytes;
          const dataBase64 = WAV.uint8ToBase64(slice);

          const payload = {
            id: state.contributorId,
            pack: state.pack,
            kind: item.kind,
            lineId: item.lineId,
            consentVersion: CONFIG.CONSENT_VERSION || "0.6",
            creditName: state.creditName || "",
            dataBase64
          };

          if (totalChunks > 1) {
            payload.uploadId = uploadId;
            payload.chunkIndex = chunkIndex;
            payload.totalChunks = totalChunks;
          }

          const isFinalPart = chunkIndex === totalChunks - 1;
          const data = await postJsonWithRetry(url, payload, 3, !isFinalPart);
          completedRequests++;
          if (isFinalPart) {
            state.uploaded[item.key] = data.fileId;
            await idbSaveUploadStatus();
          }
        }
      }

      setProgress(100, "Sent!", "Finishing up…");
      state.isUploading = false;
      await releaseWakeLock();
      $("send-keep-open").hidden = true;
      await idbClearAll();
      clearMemoryTakes();
      stopMediaTracks();
      $("done-summary-title").textContent = `Received for contributor ${state.contributorId} · Pack ${state.pack}`;
      showScreen("done");
    } catch (err) {
      state.isUploading = false;
      await releaseWakeLock();
      if (err && err.message === "closed") {
        $("send-keep-open").hidden = true;
        showScreen("closed");
        return;
      }
      const detail =
        err && err.name === "AbortError"
          ? "The connection timed out."
          : (err && err.message) || "Could not reach the upload receiver.";
      showSendError(detail);
      setProgress(0, "Upload paused, tap Send to finish", "Nothing was lost. Anything already sent won't be sent twice.");
    } finally {
      state.isUploading = false;
    }
  }

  // ---- Wire events ----
  function wireEvents() {
    $("btn-welcome-start").addEventListener("click", () => {
      renderIdScreen();
      showScreen("id");
    });

    $("btn-edit-id").addEventListener("click", () => {
      state.fromUrlParams = false;
      renderIdScreen();
    });

    $("btn-id-continue").addEventListener("click", () => {
      if (state.fromUrlParams && ID_RE.test(state.contributorId) && PACK_RE.test(state.pack)) {
        showScreen("mic");
        return;
      }
      const idVal = ($("input-contributor-id").value || "").trim().toUpperCase();
      const packVal = ($("input-pack").value || "").trim().toUpperCase();
      let ok = true;

      if (!ID_RE.test(idVal)) {
        $("error-contributor-id").textContent = "Enter your ID like C0042 (letter C followed by 4 digits).";
        $("error-contributor-id").hidden = false;
        ok = false;
      } else {
        $("error-contributor-id").hidden = true;
      }

      if (!PACK_RE.test(packVal)) {
        $("error-pack").textContent = "Choose your assigned pack.";
        $("error-pack").hidden = false;
        ok = false;
      } else {
        $("error-pack").hidden = true;
      }

      if (!ok) return;
      state.contributorId = idVal;
      state.pack = packVal;
      showScreen("mic");
    });

    document.querySelectorAll("[data-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cancelLevelMeter();
        showScreen(btn.getAttribute("data-back"));
      });
    });

    $("btn-enable-mic").addEventListener("click", handleEnableMic);
    $("btn-retry-mic").addEventListener("click", handleEnableMic);
    $("btn-mic-test").addEventListener("click", handleMicTest);
    $("btn-mic-continue").addEventListener("click", () => {
      cancelLevelMeter();
      showScreen("consent");
    });

    $("input-credit-name").addEventListener("input", updateConsentQuote);
    $("consent-agree-checkbox").addEventListener("change", refreshConsentUi);
    $("btn-consent-record").addEventListener("click", toggleConsentRecord);
    $("btn-consent-continue").addEventListener("click", handleConsentContinue);

    // Long take controls
    $("btn-lt-start").addEventListener("click", startLongTake);
    $("btn-lt-next").addEventListener("click", () => {
      const lines = getSessionLines();
      if (state.ltIndex < lines.length - 1) {
        state.ltIndex++;
        renderLongTakeView(lines);
      } else {
        stopLongTake();
      }
    });
    $("btn-lt-prev").addEventListener("click", () => {
      if (state.ltIndex > 0) {
        state.ltIndex--;
        renderLongTakeView(getSessionLines());
      }
    });
    $("btn-lt-stop").addEventListener("click", stopLongTake);
    $("btn-lt-review").addEventListener("click", () => showScreen("review"));
    $("btn-lt-redo").addEventListener("click", () => {
      revokeTakeUrl(state.longtakeTake);
      state.longtakeTake = null;
      state.ltIndex = 0;
      renderLongTakeView(getSessionLines());
    });
    $("btn-record-back-consent").addEventListener("click", () => showScreen("consent"));

    // Mode switching
    $("btn-switch-perline").addEventListener("click", () => {
      state.mode = "perline";
      refreshRecordUi();
    });
    $("btn-switch-longtake").addEventListener("click", () => {
      state.mode = "longtake";
      refreshRecordUi();
    });

    // Per-line controls
    $("btn-pl-record").addEventListener("click", togglePerLineRecord);
    $("btn-pl-prev").addEventListener("click", () => {
      if (state.plIndex > 0) {
        state.plIndex--;
        renderPerLineView(getSessionLines());
      }
    });
    $("btn-pl-next").addEventListener("click", () => {
      const lines = getSessionLines();
      if (state.plIndex < lines.length - 1) {
        state.plIndex++;
        renderPerLineView(lines);
      }
    });
    $("btn-pl-review").addEventListener("click", () => showScreen("review"));
    $("btn-pl-back-consent").addEventListener("click", () => showScreen("consent"));

    // Review & Send
    $("btn-review-send").addEventListener("click", runUpload);
    $("btn-review-back").addEventListener("click", () => showScreen("record"));
    $("btn-send-retry").addEventListener("click", runUpload);
    $("btn-send-back-review").addEventListener("click", () => showScreen("review"));

    // Start over & Done
    $("btn-start-over").addEventListener("click", async () => {
      if (state.isRecording) {
        await finishCapture(null, null);
      }
      clearTimeout(micTestTimeout);
      clearMemoryTakes();
      await idbClearAll();
      stopMediaTracks();
      $("consent-agree-checkbox").checked = false;
      $("mic-prompt-card").hidden = false;
      $("mic-live-card").hidden = true;
      $("mic-error-card").hidden = true;
      $("btn-mic-continue").disabled = true;
      showScreen("welcome");
    });

    $("btn-done-another").addEventListener("click", () => {
      $("consent-agree-checkbox").checked = false;
      $("mic-prompt-card").hidden = false;
      $("mic-live-card").hidden = true;
      $("btn-mic-continue").disabled = true;
      showScreen("welcome");
    });
  }

  // ---- Init ----
  async function init() {
    wireEvents();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    }

    const open = await isReceiverOpen();
    if (!open) {
      showScreen("closed");
      return;
    }

    try {
      await loadLines();
    } catch (err) {
      alert("Could not load recording script. Please reload the page.");
      return;
    }

    parseUrlParams();

    // Check IndexedDB for saved takes
    const allRows = await idbLoadAll();
    const statusRow = allRows.find((r) => r.key === UPLOAD_STATUS_KEY) || null;
    const saved = allRows.filter((r) => r.key !== UPLOAD_STATUS_KEY);
    if (saved.length > 0) {
      const sample = saved[0];
      const matchesUrl =
        !state.fromUrlParams ||
        (sample.contributorId === state.contributorId && sample.pack === state.pack);
      if (matchesUrl && sample.contributorId && sample.pack) {
        $("resume-summary").textContent = `Contributor ${sample.contributorId} · Pack ${sample.pack} (${saved.length} saved clip${saved.length === 1 ? "" : "s"}).`;
        $("resume-banner").hidden = false;

        $("btn-resume").addEventListener("click", () => {
          state.contributorId = sample.contributorId;
          state.pack = sample.pack;
          state.creditName = sample.creditName || "";
          $("input-credit-name").value = state.creditName;
          state.mode = sample.mode || "longtake";

          for (const row of saved) {
            if (row.key === "consent") state.consentTake = hydrateTake(row);
            else if (row.key === "longtake") state.longtakeTake = hydrateTake(row);
            else if (row.key.startsWith("line:") && row.lineId) {
              state.lineTakes[row.lineId] = hydrateTake(row);
            }
          }
          state.uploaded =
            statusRow &&
            statusRow.contributorId === state.contributorId &&
            statusRow.pack === state.pack &&
            statusRow.uploaded
              ? { ...statusRow.uploaded }
              : {};
          $("resume-banner").hidden = true;
          if (state.consentTake && (state.longtakeTake || Object.keys(state.lineTakes).length > 0)) {
            showScreen("review");
          } else {
            showScreen("mic");
          }
        });

        $("btn-discard-saved").addEventListener("click", async () => {
          clearMemoryTakes();
          await idbClearAll();
          $("resume-banner").hidden = true;
        });
      }
    }

    showScreen("welcome");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
