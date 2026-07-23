// Icon môn học dùng chung (Phosphor).

import { Code, Headphones, Translate } from '@phosphor-icons/react';
import type { Subject } from '../types';

export function SubjectIcon({ subject, size = 14 }: { subject: Subject; size?: number }) {
  const Icon = { programming: Code, japanese: Translate, toeic: Headphones }[subject];
  return <Icon size={size} weight="bold" />;
}
