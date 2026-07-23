// Notification API — xin quyền lần đầu, báo khi hết giờ Pomodoro.

export async function requestNotificationPermission(): Promise<void> {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

export function notify(title: string, body?: string): void {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, { body });
    } catch { /* một số trình duyệt chặn trong tab nền — bỏ qua */ }
  }
}
