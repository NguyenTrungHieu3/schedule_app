// Khởi tạo dữ liệu lần đầu: nếu storage trống thì nạp seed data.
// Chạy một lần khi app khởi động, trước khi render UI.

import { SCHEMA_VERSION } from './repository';
import { repository } from './supabaseRepository';
import { SEED_SCHEDULE_BLOCKS, SEED_REWARD_SLIPS } from '../data/seed';
import { getLogicalDate, getLogicalMonth } from '../logic/date';
import type { AppSettings, StreakState } from '../types';

export async function initAppData(): Promise<void> {
  const existingVersion = await repository.get<number>('schemaVersion');

  if (existingVersion === null) {
    // Lần đầu mở app — nạp seed.
    const initialStreak: StreakState = {
      currentStreak: 0,
      longestStreak: 0,
      lastCountedDate: null,
      freezeTokensRemaining: 2,
      freezeTokensMonth: getLogicalMonth(),
    };
    const initialSettings: AppSettings = {
      soundEnabled: true,
      notificationsEnabled: true,
      // Tính từ hôm nay để lời nhắc backup xuất hiện sau đúng 30 ngày dùng app.
      lastBackupDate: getLogicalDate(),
    };

    await repository.set('schemaVersion', SCHEMA_VERSION);
    await repository.set('scheduleBlocks', SEED_SCHEDULE_BLOCKS);
    await repository.set('rewardSlips', SEED_REWARD_SLIPS);
    await repository.set('dayLogs', {});
    await repository.set('streak', initialStreak);
    await repository.set('reviewItems', []);
    await repository.set('errorEntries', []);
    await repository.set('rewardDraws', []);
    await repository.set('weeklyReviews', []);
    await repository.set('settings', initialSettings);
    console.log('[study_app] Seed data đã nạp lần đầu.');
  }

  // TODO: khi SCHEMA_VERSION tăng, viết migrate ở đây (existingVersion → SCHEMA_VERSION).

  // Giai đoạn 1 — nghiệm thu: thấy dữ liệu seed trong console.
  console.log('[study_app] scheduleBlocks:', await repository.get('scheduleBlocks'));
  console.log('[study_app] rewardSlips:', await repository.get('rewardSlips'));
  console.log('[study_app] streak:', await repository.get('streak'));
}
