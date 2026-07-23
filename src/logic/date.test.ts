// Test ranh giới ngày logic (§4.1) — nơi dễ sai nhất là quanh 04:00 và nửa đêm.

import { describe, expect, it } from 'vitest';
import {
  addDaysToDate,
  blockDurationMinutes,
  daysBetween,
  getDayOfWeek,
  getLogicalDate,
  getLogicalMonth,
  getNowLogicalMinutes,
  minutesBetweenTimes,
  timeRangesOverlap,
  timeToLogicalMinutes,
} from './date';

// Giờ VN = UTC+7. Dùng mốc UTC cố định để test chạy đúng ở mọi máy.
describe('getLogicalDate — ngày bắt đầu 04:00 giờ VN', () => {
  it('03:59 giờ VN vẫn thuộc ngày hôm trước', () => {
    // 03:59 VN ngày 19/7 = 20:59 UTC ngày 18/7
    expect(getLogicalDate(new Date('2026-07-18T20:59:00Z'))).toBe('2026-07-18');
  });

  it('04:00 giờ VN sang ngày mới', () => {
    // 04:00 VN ngày 19/7 = 21:00 UTC ngày 18/7
    expect(getLogicalDate(new Date('2026-07-18T21:00:00Z'))).toBe('2026-07-19');
  });

  it('00:30 giờ VN (học khuya) vẫn tính vào hôm trước — tiêu chí nghiệm thu §8', () => {
    // 00:30 VN ngày 19/7 = 17:30 UTC ngày 18/7
    expect(getLogicalDate(new Date('2026-07-18T17:30:00Z'))).toBe('2026-07-18');
  });

  it('getLogicalMonth đi theo ngày logic, không theo tháng dương', () => {
    // 02:00 VN ngày 01/08 → ngày logic vẫn 31/07
    expect(getLogicalMonth(new Date('2026-07-31T19:00:00Z'))).toBe('2026-07');
  });
});

describe('timeToLogicalMinutes — trục ngày logic 04:00 → 28:00', () => {
  it('giờ thường giữ nguyên', () => {
    expect(timeToLogicalMinutes('07:30')).toBe(7 * 60 + 30);
  });

  it('giờ sau nửa đêm được cộng 24h (thuộc ngày logic hôm trước)', () => {
    expect(timeToLogicalMinutes('00:30')).toBe(24 * 60 + 30);
    expect(timeToLogicalMinutes('03:59')).toBe(24 * 60 + 3 * 60 + 59);
  });

  it('04:00 là đầu trục ngày logic', () => {
    expect(timeToLogicalMinutes('04:00')).toBe(4 * 60);
  });
});

describe('getNowLogicalMinutes', () => {
  it('khớp với timeToLogicalMinutes của giờ VN tương ứng', () => {
    // 00:30 VN = 1470 phút trên trục ngày logic
    expect(getNowLogicalMinutes(new Date('2026-07-18T17:30:00Z'))).toBe(24 * 60 + 30);
  });
});

describe('các hàm tiện ích ngày', () => {
  it('minutesBetweenTimes tính đúng số phút của block', () => {
    expect(minutesBetweenTimes('07:00', '09:30')).toBe(150);
    expect(minutesBetweenTimes('21:45', '22:15')).toBe(30);
  });

  it('addDaysToDate qua ranh tháng/năm', () => {
    expect(addDaysToDate('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysToDate('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDaysToDate('2026-07-15', -1)).toBe('2026-07-14');
  });

  it('daysBetween là (b - a), âm khi b < a', () => {
    expect(daysBetween('2026-07-18', '2026-07-20')).toBe(2);
    expect(daysBetween('2026-07-20', '2026-07-18')).toBe(-2);
    expect(daysBetween('2026-07-18', '2026-07-18')).toBe(0);
  });

  it('getDayOfWeek: 0 = Chủ nhật', () => {
    expect(getDayOfWeek('2026-07-19')).toBe(0); // 19/7/2026 là Chủ nhật
    expect(getDayOfWeek('2026-07-20')).toBe(1);
    expect(getDayOfWeek('2026-07-25')).toBe(6);
  });
});

describe('blockDurationMinutes — thờilượng block, hỗ trợ qua nửa đêm', () => {
  it('block thường trong ngày', () => {
    expect(blockDurationMinutes('07:00', '09:30')).toBe(150);
  });

  it('block qua nửa đêm: 22:00–00:30 = 150 phút', () => {
    expect(blockDurationMinutes('22:00', '00:30')).toBe(150);
    expect(blockDurationMinutes('23:00', '02:00')).toBe(180);
  });

  it('nhập ngược rõ ràng (09:00–07:00) → âm → form chặn được', () => {
    expect(blockDurationMinutes('09:00', '07:00')).toBeLessThan(0);
  });
});

describe('timeRangesOverlap — phát hiện block chồng giờ', () => {
  it('chồng nhau một phần / bao trọn / chạm mép', () => {
    expect(timeRangesOverlap('07:00', '09:00', '08:00', '10:00')).toBe(true);
    expect(timeRangesOverlap('07:00', '11:00', '08:00', '09:00')).toBe(true);
    expect(timeRangesOverlap('07:00', '09:00', '09:00', '10:00')).toBe(false); // chạm mép không chồng
    expect(timeRangesOverlap('07:00', '08:00', '09:00', '10:00')).toBe(false);
  });

  it('chồng nhau qua nửa đêm', () => {
    expect(timeRangesOverlap('22:00', '00:30', '23:30', '01:00')).toBe(true);
    expect(timeRangesOverlap('22:00', '23:00', '23:30', '01:00')).toBe(false);
  });
});
