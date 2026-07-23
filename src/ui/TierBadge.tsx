// Badge hạng ngày với icon Phosphor — thay cho emoji.
// Quy tắc §1.3 giữ nguyên: không đỏ, 'broken' trung tính, 'minimum' là thành công xanh.

import { CircleDashed, HourglassMedium, Leaf, Medal, Snowflake, Sparkle } from '@phosphor-icons/react';
import type { DayTier } from '../types';
import { TIER_LABELS } from './labels';

export const TIER_ICONS: Record<DayTier, React.ReactNode> = {
  gold: <Medal size={14} weight="fill" />,
  silver: <Sparkle size={14} weight="fill" />,
  minimum: <Leaf size={14} weight="fill" />,
  frozen: <Snowflake size={14} weight="fill" />,
  pending: <HourglassMedium size={14} weight="bold" />,
  broken: <CircleDashed size={14} weight="bold" />,
};

export default function TierBadge({ tier, size = 'sm' }: { tier: DayTier; size?: 'sm' | 'lg' }) {
  const info = TIER_LABELS[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${info.className} ${
        size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'
      }`}
    >
      {TIER_ICONS[tier]}
      {info.label}
    </span>
  );
}
