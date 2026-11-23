/**
 * OpenSanta Recorder configuration.
 * Replace RECEIVER_URL with the deployed Google Apps Script Web App URL before going live.
 * Keep no secrets in this file — it is served publicly on GitHub Pages.
 */
window.OPENSANTA_CONFIG = Object.freeze({
  RECEIVER_URL: "https://script.google.com/macros/s/AKfycbxeOoaBqcGHyPpf6MiK0Vy_bAzDR5x4ta6o4OGvW0ZyCkO6oABdMq-LwK9O_EZ_XEq0ew/exec",
  CONSENT_VERSION: "0.6",
  LINES_URL: "./lines.json",
  CHUNK_THRESHOLD_BYTES: 6 * 1024 * 1024,
  CHUNK_SIZE_BYTES: 4 * 1024 * 1024
});
