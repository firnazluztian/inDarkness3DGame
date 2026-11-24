/**
 * Small Web Audio desk. No sample files — the original clips are not in the repo.
 * Sounds are short, synthesized, and routed through one master gain.
 */
export class AudioBus {
  muted = false
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private droneGain: GainNode | null = null
  private noise: AudioBuffer | null = null
  private heartAt = 0
  private moanAt = 0

  resume(): AudioContext {
    if (!this.ctx) {
      const Ctx = window.AudioContext
      this.ctx = new Ctx()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.8
      this.master.connect(this.ctx.destination)
      this.noise = this.makeNoise(1.2)
      this.startDrone()
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  context(): AudioContext | null {
    return this.ctx
  }

  setMuted(muted: boolean) {
    this.muted = muted
    if (this.master) this.master.gain.value = muted ? 0 : 0.8
  }

  footstep() {
    this.noiseBurst(180, 0.045, 0.045)
  }

  toggleLight() {
    this.noiseBurst(1400, 0.03, 0.04)
  }

  pickup() {
    this.tone(660, 0.07, 'square', 0.02)
  }

  door() {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.35)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.04)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start()
    osc.stop(ctx.currentTime + 0.42)
  }

  blow() {
    this.noiseBurst(700, 0.18, 0.06)
  }

  relight() {
    this.tone(520, 0.12, 'triangle', 0.04)
  }

  ward() {
    this.tone(880, 0.2, 'square', 0.03)
    this.tone(1320, 0.28, 'triangle', 0.03)
  }

  unlock() {
    this.tone(196, 0.16, 'sine', 0.05)
    this.tone(294, 0.28, 'sine', 0.04)
  }

  scare() {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    this.noiseBurst(300, 0.45, 0.18)
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.55)
    gain.gain.setValueAtTime(0.08, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start()
    osc.stop(ctx.currentTime + 0.62)
  }

  win() {
    ;[523, 659, 784, 1046].forEach((freq, index) => {
      this.tone(freq, 0.18, 'triangle', 0.05, index * 0.09)
    })
  }

  lose() {
    ;[311, 233, 174, 110].forEach((freq, index) => {
      this.tone(freq, 0.22, 'sawtooth', 0.04, index * 0.1)
    })
  }

  /** Sour fragment of the birthday sting from blowBirthdayCandleHandler. */
  birthday() {
    const notes = [196, 196, 220, 196, 247, 233]
    const gaps = [0, 0.16, 0.3, 0.52, 0.74, 1.02]
    notes.forEach((freq, index) => this.tone(freq, 0.22, 'triangle', 0.05, gaps[index]))
  }

  heartbeat(closeness: number) {
    const ctx = this.ensure()
    if (!ctx) return
    const now = ctx.currentTime
    const interval = 1.05 - closeness * 0.7
    if (now < this.heartAt) return
    this.heartAt = now + interval
    this.tone(58, 0.09, 'sine', 0.05 + closeness * 0.06)
    this.tone(44, 0.12, 'sine', 0.04 + closeness * 0.04, 0.12)
  }

  moan(pan: number) {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const now = ctx.currentTime
    if (now < this.moanAt) return
    this.moanAt = now + 4.5 + Math.random() * 3
    const osc = ctx.createOscillator()
    const filter = ctx.createBiquadFilter()
    const gain = ctx.createGain()
    const panner = ctx.createStereoPanner()
    osc.type = 'triangle'
    osc.frequency.setValueAtTime(90 + Math.random() * 20, now)
    osc.frequency.linearRampToValueAtTime(70, now + 1.1)
    filter.type = 'lowpass'
    filter.frequency.value = 400
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.04, now + 0.2)
    gain.gain.linearRampToValueAtTime(0.0001, now + 1.3)
    panner.pan.value = Math.max(-1, Math.min(1, pan))
    osc.connect(filter)
    filter.connect(gain)
    gain.connect(panner)
    panner.connect(this.master)
    osc.start(now)
    osc.stop(now + 1.35)
  }

  dispose() {
    void this.ctx?.close()
    this.ctx = null
    this.master = null
    this.droneGain = null
  }

  private ensure(): AudioContext | null {
    if (!this.ctx) return null
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  private startDrone() {
    const ctx = this.ctx
    if (!ctx || !this.master || !this.noise) return
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 140
    this.droneGain = ctx.createGain()
    this.droneGain.gain.value = 0.07
    source.connect(filter)
    filter.connect(this.droneGain)
    this.droneGain.connect(this.master)
    source.start()

    const hum = ctx.createOscillator()
    const humGain = ctx.createGain()
    hum.type = 'sine'
    hum.frequency.value = 52
    humGain.gain.value = 0.02
    hum.connect(humGain)
    humGain.connect(this.master)
    hum.start()
  }

  private tone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    delay = 0,
  ) {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const time = ctx.currentTime + delay
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, time)
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(time)
    osc.stop(time + duration + 0.02)
  }

  private noiseBurst(frequency: number, duration: number, volume: number) {
    const ctx = this.ensure()
    if (!ctx || !this.master || !this.noise) return
    const source = ctx.createBufferSource()
    source.buffer = this.noise
    const filter = ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = 0.7
    const gain = ctx.createGain()
    const now = ctx.currentTime
    gain.gain.setValueAtTime(volume, now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    source.start(now)
    source.stop(now + duration + 0.02)
  }

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx
    if (!ctx) throw new Error('Audio context missing')
    const length = Math.floor(ctx.sampleRate * seconds)
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let value = 0
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1
      value = value * 0.96 + white * 0.04
      data[i] = value * 3
    }
    return buffer
  }
}
