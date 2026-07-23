// Nhãn + màu dùng chung cho UI. Quy tắc sản phẩm (§1.3): không màu đỏ,
// không chữ tiêu cực cho ngày học ít — 'broken' hiển thị xám trung tính.

import type { DayTier, Subject } from '../types';

export const SUBJECT_LABELS: Record<Subject, string> = {
  programming: 'Lập trình',
  japanese: 'Tiếng Nhật',
  toeic: 'TOEIC',
};

// Màu nhận diện môn (class Tailwind).
export const SUBJECT_COLORS: Record<Subject, { bg: string; text: string; bar: string }> = {
  programming: { bg: 'bg-sky-100', text: 'text-sky-700', bar: 'bg-sky-500' },
  japanese: { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-400' },
  toeic: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-500' },
};

export const TIER_LABELS: Record<DayTier, { label: string; emoji: string; className: string }> = {
  gold: { label: 'Ngày Vàng', emoji: '🥇', className: 'bg-amber-100 text-amber-700' },
  silver: { label: 'Ngày Bạc', emoji: '🥈', className: 'bg-slate-200 text-slate-700' },
  // Ngày Tối thiểu là THÀNH CÔNG màu xanh, không phải cảnh báo vàng.
  minimum: { label: 'Ngày Tối thiểu', emoji: '🌱', className: 'bg-emerald-100 text-emerald-700' },
  frozen: { label: 'Đóng băng', emoji: '❄️', className: 'bg-cyan-100 text-cyan-700' },
  pending: { label: 'Đang diễn ra', emoji: '⏳', className: 'bg-slate-100 text-slate-500' },
  // Không trách móc: xám trung tính, không đỏ, không "thất bại".
  broken: { label: 'Ngày trống', emoji: '·', className: 'bg-slate-100 text-slate-400' },
};
