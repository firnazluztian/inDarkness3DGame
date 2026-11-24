/**
 * Port of micInput.cs.
 * Loudness is the peak sample squared, times 10 — the same figure the Unity HUD printed.
 * Browser AGC is disabled so a real blow still spikes the meter.
 */
export class MicMeter {
  level = 0
  status: 'idle' | 'on' | 'denied' = 'idle'
  private analyser: AnalyserNode | null = null
  private stream: MediaStream | null = null
  private samples = new Float32Array(256)

  async enable(ctx: AudioContext) {
    if (this.status === 'on' || this.status === 'denied') return
    if (!navigator.mediaDevices?.getUserMedia) {
      this.status = 'denied'
      return
    }
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: false,
      })
      const source = ctx.createMediaStreamSource(this.stream)
      this.analyser = ctx.createAnalyser()
      this.analyser.fftSize = 256
      source.connect(this.analyser)
      this.status = 'on'
    } catch {
      this.status = 'denied'
    }
  }

  update() {
    if (!this.analyser) {
      this.level = 0
      return
    }
    this.analyser.getFloatTimeDomainData(this.samples)
    let peak = 0
    for (let i = 0; i < this.samples.length; i += 1) {
      const squared = this.samples[i] * this.samples[i]
      if (squared > peak) peak = squared
    }
    this.level = peak * 10
  }

  stop() {
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.analyser = null
    this.status = 'idle'
    this.level = 0
  }
}
