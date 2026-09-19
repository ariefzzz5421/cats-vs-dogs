export type GameSound =
  | "ui"
  | "release"
  | "whoosh"
  | "wall"
  | "ground"
  | "hit"
  | "laugh"
  | "cat"
  | "dog"
  | "heal"
  | "victory"
  | "defeat";

let context: AudioContext | null = null;
let enabled = true;
let chargeOscillator: OscillatorNode | null = null;
let chargeGain: GainNode | null = null;
let master: GainNode | null = null;
const voices = new Set<AudioScheduledSourceNode>();

function output(audio: AudioContext) {
  if (!master) {
    master = audio.createGain();
    master.connect(audio.destination);
  }
  return master;
}

export function stopGameSounds() {
  stopChargeSound();
  for (const voice of voices) voice.stop();
  voices.clear();
}

function getContext() {
  if (typeof window === "undefined" || !enabled) return null;
  try {
    context ??= new AudioContext();
  } catch {
    return null;
  }
  if (context.state === "suspended")
    void context.resume().catch(() => {
      /* Sound is optional. */
    });
  return context;
}

function tone(
  frequency: number,
  duration: number,
  volume: number,
  type: OscillatorType = "sine",
  endFrequency?: number,
  delay = 0,
) {
  const audio = getContext();
  if (!audio) return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  const at = audio.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (endFrequency)
    oscillator.frequency.exponentialRampToValueAtTime(
      endFrequency,
      at + duration,
    );
  gain.gain.setValueAtTime(0.001, at);
  gain.gain.linearRampToValueAtTime(volume, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
  oscillator.connect(gain).connect(output(audio));
  voices.add(oscillator);
  oscillator.onended = () => { voices.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
  oscillator.start(at);
  oscillator.stop(at + duration);
}

function noise(duration: number, volume: number, cutoff: number) {
  const audio = getContext();
  if (!audio) return;
  const length = Math.ceil(audio.sampleRate * duration);
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1)
    data[index] = Math.random() * 2 - 1;
  const source = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const gain = audio.createGain();
  source.buffer = buffer;
  filter.type = "lowpass";
  filter.frequency.value = cutoff;
  gain.gain.setValueAtTime(volume, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
  source.connect(filter).connect(gain).connect(output(audio));
  voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); filter.disconnect(); gain.disconnect(); };
  source.start();
}

export function setSoundEnabled(next: boolean) {
  enabled = next;
  if (!next) stopGameSounds();
  if (master && context) master.gain.setValueAtTime(next ? 1 : 0, context.currentTime);
}

export function playGameSound(sound: GameSound, intensity = 1) {
  const amount = Math.max(0.35, Math.min(1, intensity));
  if (sound === "ui") tone(420, 0.06, 0.035, "square", 520);
  if (sound === "release") {
    tone(210, 0.12, 0.07 * amount, "sawtooth", 620);
    noise(0.08, 0.03, 1800);
  }
  if (sound === "whoosh") noise(0.22, 0.045 * amount, 2400);
  if (sound === "wall") {
    noise(0.15, 0.08 * amount, 620);
    tone(115, 0.13, 0.06, "square", 70);
  }
  if (sound === "ground") noise(0.18, 0.055 * amount, 420);
  if (sound === "hit") {
    noise(0.12, 0.1 * amount, 1200);
    tone(160, 0.18, 0.08 * amount, "square", 80);
  }
  if (sound === "laugh") {
    tone(430, 0.09, 0.045, "triangle", 610);
    tone(520, 0.1, 0.04, "triangle", 690, 0.09);
  }
  if (sound === "victory") {
    tone(392, 0.16, 0.055);
    tone(523, 0.18, 0.06, "sine", undefined, 0.15);
    tone(659, 0.25, 0.065, "sine", undefined, 0.31);
  }
  // Original stylized vocal gestures, not samples from the reference game.
  if (sound === "cat") {
    tone(720, 0.12, 0.035, "sawtooth", 1100);
    tone(1100, 0.23, 0.03, "triangle", 440, 0.08);
  }
  if (sound === "dog") {
    tone(190, 0.13, 0.055, "sawtooth", 85);
    tone(230, 0.15, 0.04, "triangle", 95, 0.16);
    noise(0.09, 0.025, 700);
  }
  if (sound === "heal") {
    tone(523, 0.1, 0.045, "triangle");
    tone(784, 0.22, 0.045, "sine", 1046, 0.1);
  }
  if (sound === "defeat") tone(240, 0.42, 0.05, "triangle", 90);
}

export function startChargeSound() {
  const audio = getContext();
  if (!audio || chargeOscillator) return;
  chargeOscillator = audio.createOscillator();
  chargeGain = audio.createGain();
  chargeOscillator.type = "sawtooth";
  chargeOscillator.frequency.setValueAtTime(100, audio.currentTime);
  chargeGain.gain.setValueAtTime(0.018, audio.currentTime);
  chargeOscillator.connect(chargeGain).connect(output(audio));
  chargeOscillator.start();
}

export function updateChargeSound(power: number) {
  if (!context || !chargeOscillator) return;
  chargeOscillator.frequency.setTargetAtTime(100 + Math.max(0, Math.min(100, power)) * 4.2, context.currentTime, 0.025);
}

export function stopChargeSound() {
  if (!chargeOscillator || !chargeGain || !context) return;
  chargeGain.gain.exponentialRampToValueAtTime(
    0.001,
    context.currentTime + 0.05,
  );
  chargeOscillator.stop(context.currentTime + 0.06);
  const oscillator = chargeOscillator, gain = chargeGain;
  oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  chargeOscillator = null;
  chargeGain = null;
}
