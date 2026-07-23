// Bắt lỗi RENDER trong cây route — khác renderFatal trong main.tsx vốn chỉ bắt
// lỗi lúc KHỞI ĐỘNG (load storage/seed). Không có ErrorBoundary thì một page bị
// lỗi runtime (ví dụ dữ liệu hỏng khiến component throw) = trang trắng im lặng.

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[study_app] Lỗi khi hiển thị trang:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-xl font-extrabold text-slate-800">Trang gặp lỗi hiển thị</p>
          <p className="max-w-md text-sm font-semibold text-slate-500">
            Dữ liệu có thể bị lỗi ở đúng màn hình này. Thử tải lại; nếu vẫn lỗi, vào Cài đặt export
            backup rồi báo lại. Chi tiết: {this.state.error.message}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-3d rounded-2xl bg-primary px-6 py-3 font-extrabold text-white [--edge:#5a41a3]"
          >
            Tải lại trang
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
