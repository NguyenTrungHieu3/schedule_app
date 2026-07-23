// Cổng đăng nhập (magic link qua email) — bọc ngoài <App/>. Sau khi có session:
// init() SupabaseRepository (nạp cache) → migrate dữ liệu cũ trong máy (nếu có
// và cloud đang rỗng) hoặc seed mới → load() store → hydrate() timer → render.
//
// Vì sao migrate/seed nằm ở ĐÂY chứ không phải main.tsx: cả hai đều phụ thuộc
// userId, chỉ biết được SAU khi đăng nhập.

import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { supabase } from '../storage/supabaseClient';
import { repository } from '../storage/supabaseRepository';
import { localStorageRepository } from '../storage/repository';
import { initAppData } from '../storage/init';
import { useAppStore } from '../store/appStore';
import { useTimerStore } from '../store/timerStore';

type Phase = 'checking' | 'signedOut' | 'linkSent' | 'bootstrapping' | 'ready' | 'error';

async function bootstrapAfterLogin(userId: string): Promise<void> {
  await repository.init(userId);
  if (!repository.hasAnyData()) {
    // Cloud rỗng: máy này có dữ liệu cũ (từ trước khi có Supabase) thì migrate
    // 1 lần lên cloud (tái dùng exportAll/importAll — bỏ qua key transient);
    // không thì đây là lần dùng app đầu tiên → seed như bình thường.
    const hasOldLocalData = (await localStorageRepository.get<number>('schemaVersion')) !== null;
    if (hasOldLocalData) {
      await repository.importAll(await localStorageRepository.exportAll());
    } else {
      await initAppData();
    }
  }
  await useAppStore.getState().load();
  await useTimerStore.getState().hydrate();
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>('checking');
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState('');
  const [bootError, setBootError] = useState('');

  useEffect(() => {
    let cancelled = false;

    function runBootstrap(userId: string) {
      setPhase('bootstrapping');
      bootstrapAfterLogin(userId)
        .then(() => {
          if (!cancelled) setPhase('ready');
        })
        .catch((err: unknown) => {
          console.error('[study_app] Bootstrap sau đăng nhập thất bại:', err);
          if (!cancelled) {
            setBootError(err instanceof Error ? err.message : String(err));
            setPhase('error');
          }
        });
    }

    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const userId = data.session?.user.id;
      if (userId) runBootstrap(userId);
      else setPhase('signedOut');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_IN' && session) {
        runBootstrap(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        // Store/cache trong bộ nhớ có thể còn dữ liệu của user cũ — reload cho
        // sạch, giống cách deleteAllData() đã làm (xem appStore.ts).
        window.location.reload();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSendLink(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSending(true);
    setFormError('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setSending(false);
    if (error) setFormError(error.message);
    else setPhase('linkSent');
  }

  if (phase === 'checking' || phase === 'bootstrapping') {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="font-semibold text-slate-400">Đang tải…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-xl font-extrabold text-slate-800">Không tải được dữ liệu</p>
        <p className="max-w-md text-sm font-semibold text-slate-500">Chi tiết: {bootError}</p>
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

  if (phase === 'linkSent') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-xl font-extrabold text-slate-800">Đã gửi link đăng nhập</p>
        <p className="max-w-sm text-sm font-semibold text-slate-500">
          Mở email <span className="font-bold text-slate-700">{email}</span> và bấm vào link — link mở lại app này.
        </p>
        <button type="button" onClick={() => setPhase('signedOut')} className="mt-2 text-sm font-bold text-slate-400 hover:text-slate-600">
          Dùng email khác
        </button>
      </div>
    );
  }

  if (phase === 'signedOut') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <p className="text-xl font-extrabold text-slate-900">🔥 Chăm</p>
          <p className="mt-1 text-sm font-semibold text-slate-500">Đăng nhập bằng email để đồng bộ dữ liệu giữa các máy.</p>
          <form onSubmit={(e) => void handleSendLink(e)} className="mt-4 flex flex-col gap-2.5">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={sending}
              className="btn-3d rounded-2xl bg-primary py-2.5 font-extrabold text-white disabled:opacity-50 [--edge:#5a41a3]"
            >
              {sending ? 'Đang gửi…' : 'Gửi link đăng nhập'}
            </button>
          </form>
          {formError && <p className="mt-2 text-sm text-amber-600">{formError}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
