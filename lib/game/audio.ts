export type GameSound = "ui" | "release" | "whoosh" | "wall" | "ground" | "hit" | "laugh" | "victory" | "defeat";

let context: AudioContext | null = null;
let enabled = true;
let chargeOscillator: OscillatorNode | null = null;
let chargeGain: GainNode | null = null;

function getContext() {
  if (typeof window === "undefined" || !enabled) return null;
  context ??= new AudioContext();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(frequency: number, duration: number, volume: number, type: OscillatorType = "sine", endFrequency?: number) {
  const audio = getContext();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audio.currentTime);
  if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, audio.currentTime + duration);
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime + duration);
}

function noise(duration: number, volume: number, cutoff: number) {
  const audio = getContext();
  if (!audio) return;
  const length = Math.ceil(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start();
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  if (!next) stopChargeSound();
}

export function playGameSound(sound: GameSound, intensity = 1) {
  const amount = Math.max(0.35, Math.min(1, intensity));
  if (sound === "ui") tone(420, 0.06, 0.035, "square", 520);
  if (sound === "release") { tone(210, 0.12, 0.07 * amount, "sawtooth", 620); noise(0.08, 0.03, 1800); }
  if (sound === "whoosh") noise(0.22, 0.045 * amount, 2400);
  if (sound === "wall") { noise(0.15, 0.08 * amount, 620); tone(115, 0.13, 0.06, "square", 70); }
  if (sound === "ground") noise(0.18, 0.055 * amount, 420);
  if (sound === "hit") { noise(0.12, 0.1 * amount, 1200); tone(160, 0.18, 0.08 * amount, "square", 80); }
  if (sound === "laugh") { tone(430, 0.09, 0.045, "triangle", 610); window.setTimeout(() => tone(520, 0.1, 0.04, "triangle", 690), 90); }
  if (sound === "victory") { tone(392, 0.16, 0.055); window.setTimeout(() => tone(523, 0.18, 0.06), 150); window.setTimeout(() => tone(659, 0.25, 0.065), 310); }
  if (sound === "defeat") tone(240, 0.42, 0.05, "triangle", 90);
}

export function startChargeSound() {
  const audio = getContext();
  if (!audio || chargeOscillator) return;
  chargeOscillator = audio.createOscillator();
  chargeGain = audio.createGain();
  chargeOscillator.type = "sawtooth";
  chargeOscillator.frequency.setValueAtTime(100, audio.currentTime);
  chargeOscillator.frequency.exponentialRampToValueAtTime(520, audio.currentTime + 1.4);
  chargeGain.gain.setValueAtTime(0.018, audio.currentTime);
  chargeOscillator.connect(chargeGain).connect(audio.destination);
  chargeOscillator.start();
}

export function stopChargeSound() {
  if (!chargeOscillator || !chargeGain || !context) return;
  chargeGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.05);
  chargeOscillator.stop(context.currentTime + 0.06);
  chargeOscillator = null;
  chargeGain = null;
}
