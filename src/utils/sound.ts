// Âm thanh báo hết giờ / bốc thưởng — dùng WebAudio, không cần file asset.

let audioContext: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  return audioContext;
}

function beep(frequency: number, startAt: number, duration: number): void {
  const ctx = getContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.2, ctx.currentTime + startAt);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
  oscillator.connect(gain).connect(ctx.destination);
  oscillator.start(ctx.currentTime + startAt);
  oscillator.stop(ctx.currentTime + startAt + duration);
}

// 3 tiếng "ting" đi lên — hết giờ làm việc.
export function playTimerEndSound(): void {
  try {
    beep(660, 0, 0.25);
    beep(880, 0.3, 0.25);
    beep(1100, 0.6, 0.4);
  } catch {
    // AudioContext có thể bị chặn khi chưa có tương tác — bỏ qua, không crash.
  }
}

// Tiếng nhẹ hơn — hết giờ nghỉ.
export function playBreakEndSound(): void {
  try {
    beep(880, 0, 0.2);
    beep(660, 0.25, 0.3);
  } catch { /* bỏ qua */ }
}

// Tiếng mở thưởng.
export function playRewardSound(): void {
  try {
    beep(523, 0, 0.15);
    beep(659, 0.15, 0.15);
    beep(784, 0.3, 0.15);
    beep(1047, 0.45, 0.5);
  } catch { /* bỏ qua */ }
}
