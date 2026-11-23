/**
 * Client-side mono 16-bit PCM WAV encoder, resampler, and plain-language level checker.
 * Keeps 48000 Hz or 44100 Hz untouched; resamples other device rates to 48000 Hz.
 */
(function (global) {
  "use strict";

  const ACCEPTED_RATES = [48000, 44100];
  const TARGET_RATE = 48000;

  function concatFloat32(chunks) {
    let total = 0;
    for (let i = 0; i < chunks.length; i++) {
      total += chunks[i].length;
    }
    const out = new Float32Array(total);
    let offset = 0;
    for (let i = 0; i < chunks.length; i++) {
      out.set(chunks[i], offset);
      offset += chunks[i].length;
    }
    return out;
  }

  function resampleMono(samples, fromRate, toRate) {
    if (fromRate === toRate || samples.length === 0) {
      return { samples, sampleRate: fromRate };
    }
    const ratio = fromRate / toRate;
    const outLength = Math.max(1, Math.round(samples.length / ratio));
    const out = new Float32Array(outLength);

    if (ratio > 1) {
      // Simple box-averaged interpolation when downsampling to reduce aliasing.
      for (let i = 0; i < outLength; i++) {
        const start = i * ratio;
        const end = Math.min(samples.length, (i + 1) * ratio);
        const idx0 = Math.floor(start);
        const idx1 = Math.max(idx0 + 1, Math.ceil(end));
        let sum = 0;
        let count = 0;
        for (let j = idx0; j < idx1 && j < samples.length; j++) {
          sum += samples[j];
          count++;
        }
        out[i] = count > 0 ? sum / count : 0;
      }
    } else {
      for (let i = 0; i < outLength; i++) {
        const pos = i * ratio;
        const idx = Math.floor(pos);
        const frac = pos - idx;
        const s0 = samples[idx] || 0;
        const s1 = samples[Math.min(idx + 1, samples.length - 1)] || 0;
        out[i] = s0 + (s1 - s0) * frac;
      }
    }
    return { samples: out, sampleRate: toRate };
  }

  function writeAscii(view, offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  function encodeWav16(chunks, inputSampleRate) {
    const raw = concatFloat32(chunks);
    const outRate = ACCEPTED_RATES.includes(inputSampleRate) ? inputSampleRate : TARGET_RATE;
    const { samples, sampleRate } = resampleMono(raw, inputSampleRate, outRate);

    const numSamples = samples.length;
    const dataBytes = numSamples * 2;
    const buffer = new ArrayBuffer(44 + dataBytes);
    const view = new DataView(buffer);

    // RIFF header
    writeAscii(view, 0, "RIFF");
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(view, 8, "WAVE");

    // fmt chunk (16-bit mono PCM)
    writeAscii(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byteRate
    view.setUint16(32, 2, true); // blockAlign
    view.setUint16(34, 16, true); // bitsPerSample

    // data chunk
    writeAscii(view, 36, "data");
    view.setUint32(40, dataBytes, true);

    let peak = 0;
    let clippedSamples = 0;
    let offset = 44;

    for (let i = 0; i < numSamples; i++) {
      let s = samples[i];
      if (!Number.isFinite(s)) s = 0;
      const abs = Math.abs(s);
      if (abs > peak) peak = abs;
      if (abs >= 0.999) clippedSamples++;

      const clamped = Math.max(-1, Math.min(1, s));
      const int16 = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
      view.setInt16(offset, int16, true);
      offset += 2;
    }

    const peakDb = 20 * Math.log10(Math.max(peak, 1e-10));
    const durationSec = sampleRate > 0 ? numSamples / sampleRate : 0;
    const blob = new Blob([buffer], { type: "audio/wav" });

    return {
      blob,
      arrayBuffer: buffer,
      sampleRate,
      numSamples,
      durationSec,
      peak,
      peakDb,
      clippedSamples,
      byteLength: buffer.byteLength
    };
  }

  function analyzeTake(stats, kind, lineCount) {
    const warnings = [];
    if (!stats || stats.durationSec < 0.2) {
      warnings.push("No sound was captured. Check your microphone and try recording again.");
      return warnings;
    }
    if (stats.clippedSamples >= 3) {
      warnings.push("Parts of this sounded too loud or distorted. Step back slightly from the mic and try again.");
    }
    if (stats.peakDb < -20) {
      warnings.push("This sounded quite quiet. Move a little closer to the mic and try again.");
    }
    if (kind === "consent" && stats.durationSec < 8) {
      warnings.push("This consent clip seems very short. Make sure you read the whole statement out loud.");
    } else if (kind === "line" && stats.durationSec < 0.8) {
      warnings.push("This clip seems very short — check that the start or end wasn't cut off.");
    } else if (kind === "longtake") {
      const minExpected = Math.max(4, (lineCount || 12) * 1.5);
      if (stats.durationSec < minExpected) {
        warnings.push("This take seems shorter than usual — make sure you read every line with a short pause between them.");
      }
    }
    return warnings;
  }

  function uint8ToBase64(uint8) {
    // Process in multiples of 3 bytes (24576) to avoid base64 padding issues mid-stream and stack limits.
    const chunkSize = 24576;
    const parts = [];
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const slice = uint8.subarray(i, Math.min(i + chunkSize, uint8.length));
      let binary = "";
      for (let j = 0; j < slice.length; j++) {
        binary += String.fromCharCode(slice[j]);
      }
      parts.push(btoa(binary));
    }
    return parts.join("");
  }

  function arrayBufferToBase64(buffer) {
    return uint8ToBase64(new Uint8Array(buffer));
  }

  global.OpenSantaWav = Object.freeze({
    encodeWav16,
    analyzeTake,
    uint8ToBase64,
    arrayBufferToBase64
  });
})(window);
