// Trang 404 — route "*" bắt mọi URL không khớp.
// Trước đây gõ sai URL chỉ thấy trang trắng có sidebar.

import { Link } from 'react-router-dom';
import { Compass } from '@phosphor-icons/react';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center py-24 text-center">
      <Compass size={48} weight="fill" className="text-slate-300" />
      <p className="mt-4 text-xl font-extrabold text-slate-700">Trang này không tồn tại</p>
      <p className="mt-2 text-sm font-semibold text-slate-400">Có thể đường link bị gõ nhầm.</p>
      <Link to="/" className="btn-3d mt-6 rounded-2xl bg-primary px-6 py-3 font-extrabold text-white [--edge:#5a41a3]">
        Về trang Hôm nay
      </Link>
    </div>
  );
}
