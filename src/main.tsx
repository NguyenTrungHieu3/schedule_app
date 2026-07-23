import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const root = createRoot(document.getElementById('root')!);

// Màn hình khi khởi động thất bại — ví dụ thiếu VITE_SUPABASE_URL/ANON_KEY
// trong .env.local (supabaseClient.ts throw ngay khi import) hoặc trình duyệt
// chặn storage. Import App/AuthGate ĐỘNG (không import tĩnh ở đầu file) để lỗi
// throw lúc load module rơi vào .catch() này thay vì làm trắng trang im lặng.
function renderFatal(message: string): void {
  root.render(
    <StrictMode>
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-extrabold text-slate-800">App không khởi động được</p>
        <p className="max-w-md text-sm font-semibold text-slate-500">
          Có thể thiếu cấu hình Supabase (.env.local) hoặc trình duyệt đang chặn lưu trữ. Chi tiết: {message}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-3d rounded-2xl bg-primary px-6 py-3 font-extrabold text-white [--edge:#5a41a3]"
        >
          Tải lại trang
        </button>
      </div>
    </StrictMode>,
  );
}

Promise.all([import('./App'), import('./components/AuthGate'), import('./components/ErrorBoundary')])
  .then(([{ default: App }, { default: AuthGate }, { default: ErrorBoundary }]) => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <AuthGate>
            <App />
          </AuthGate>
        </ErrorBoundary>
      </StrictMode>,
    );
  })
  .catch((err: unknown) => {
    console.error('[study_app] Khởi động thất bại:', err);
    renderFatal(err instanceof Error ? err.message : String(err));
  });

