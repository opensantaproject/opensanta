class PcmRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.active = true;
    this.port.onmessage = (event) => {
      if (event.data && typeof event.data.active === "boolean") {
        this.active = event.data.active;
      }
    };
  }

  process(inputs) {
    if (!this.active) return true;
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    const ch0 = input[0];
    if (!ch0 || ch0.length === 0) return true;

    const copy = new Float32Array(ch0.length);
    if (input.length === 1) {
      copy.set(ch0);
    } else {
      // Fold multiple channels equally into mono if the device delivers >1 channel.
      const count = input.length;
      for (let i = 0; i < ch0.length; i++) {
        let sum = 0;
        for (let c = 0; c < count; c++) {
          sum += input[c][i] || 0;
        }
        copy[i] = sum / count;
      }
    }

    this.port.postMessage(copy, [copy.buffer]);
    return true;
  }
}

registerProcessor("pcm-recorder-processor", PcmRecorderProcessor);
