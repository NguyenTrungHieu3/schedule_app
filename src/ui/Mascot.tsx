// Linh vật khu "Học" — nhân cách hoá ngọn lửa của favicon.svg (giữ nhất quán
// bộ nhận diện Chăm thay vì bịa một nhân vật rời rạc). SVG tự vẽ, không load
// ảnh ngoài — an toàn với CSP của app.
//
// `celebrate`: dùng ở màn "ôn xong" (2 tay giơ cao + lấp lánh); mặc định dùng
// ở hero trang Học (1 tay vẫy nhẹ).

export default function Mascot({
  size = 120,
  celebrate = false,
  className = '',
}: {
  size?: number;
  celebrate?: boolean;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 100 130" width={size} height={size} className={className} aria-hidden="true">
      {celebrate && (
        <g fill="#ffc94d">
          <path d="M12 20 l2 6 6 2 -6 2 -2 6 -2-6-6-2 6-2Z" />
          <path d="M86 30 l1.5 4.5 4.5 1.5 -4.5 1.5-1.5 4.5-1.5-4.5-4.5-1.5 4.5-1.5Z" />
        </g>
      )}

      {/* Chân */}
      <ellipse cx="38" cy="122" rx="8" ry="5" fill="#6247b0" />
      <ellipse cx="62" cy="122" rx="8" ry="5" fill="#6247b0" />

      {/* Tay */}
      {celebrate ? (
        <g stroke="#6247b0" strokeWidth="7" strokeLinecap="round" fill="none">
          <path d="M28 78 L12 52" />
          <path d="M72 78 L88 52" />
        </g>
      ) : (
        <g stroke="#6247b0" strokeWidth="7" strokeLinecap="round" fill="none">
          <path d="M26 82 L14 90" />
          <path d="M74 82 L90 62" />
        </g>
      )}

      {/* Thân — hình ngọn lửa, cùng tỉ lệ với favicon.svg */}
      <path
        d="M50 8 C66 24 83 46 80 70 C78 96 65 118 50 120 C35 118 22 96 20 70 C17 46 34 24 50 8 Z"
        fill="#7c5cd6"
      />
      {/* Ngọn lửa trong — echo màu vàng của favicon */}
      <path d="M50 40 a10 13 0 0 0 -8 20 a8 8 0 0 0 16 0 A10 13 0 0 0 50 40Z" fill="#ffc94d" opacity="0.9" />

      {/* Mặt */}
      <circle cx="30" cy="82" r="6" fill="#ffc94d" opacity="0.5" />
      <circle cx="70" cy="82" r="6" fill="#ffc94d" opacity="0.5" />
      <circle cx="39" cy="75" r="4.5" fill="#241c3a" />
      <circle cx="61" cy="75" r="4.5" fill="#241c3a" />
      <path d="M40 88 Q50 96 60 88" stroke="#241c3a" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}
