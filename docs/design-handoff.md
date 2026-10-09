# Handoff — design system & Lobby

Nguồn thị giác: prototype HTML do người dùng cung cấp. Giữ Baloo 2, vàng chấm bi, màu candy, viền tím đậm, bóng cứng và SVG vui nhộn. Phần bot, số online mẫu và logic game trong prototype không được chuyển vào sản phẩm.

## Nguồn token

`apps/web/src/styles.css`: CSS custom properties trong `:root`; Tailwind v4 dùng khối `@theme` tương ứng, không cần file config JavaScript. Màu exact theo brief. Nền chấm là SVG 26 × 26 với chấm bán kính 2px, không dùng gradient. Dark: nền #2A1B4A, chấm #3B2A66, chữ trang #FFD84D. Nền candy và chữ Ink giữ nguyên.

Baloo 2 600/800. Cỡ 14, 17, 20, 26, 34, heading clamp(36px,5vw,62px). Nội dung desktop tối đa 1160px, khoảng cách theo bội số 4px. Nút/input tối thiểu 44px; card radius 22px, input 16px, button/chip pill. Focus: outline Ink 3px + halo vàng 3px. Không chỉ dùng màu để chỉ trạng thái.

## Thành phần đã có

- Button 6 màu + icon button: mặc định, hover nâng 3px/nghiêng −1,5°, focus, active chìm 4px mất bóng, disabled.
- Input/code input: trống, có giá trị, focus, lỗi (viền đứt + thông báo), disabled.
- Avatar: 8 biến thể SVG, nút chọn với aria-pressed.
- GameCard 4 minh họa, chip, online/offline có nhãn, mẫu player seat/chat bubble.
- Dialog HTML native: modal focus containment, Escape, focus return; toast role=status.
- Trang `/design-system` có mẫu trực tiếp; layout tự đáp ứng desktop/mobile và sáng/tối.

Các component chuyên biệt trong bàn chơi, reaction, room row, countdown, reveal, kết quả sẽ được thiết kế cùng phase game sau khi duyệt. Trang này không tuyên bố đã hoàn thành mọi màn hình trong brief.

## SVG asset list

Component inline trong `apps/web/src/components/Art.tsx`:

| Tên                            | Dùng cho                  |
| ------------------------------ | ------------------------- |
| Icon/pad                       | Logo, tạo/vào phòng       |
| Icon/sun, moon                 | Đổi theme                 |
| Icon/arrow, plus, close, check | Hành động                 |
| Icon/users, spark              | Thông tin và trang trí    |
| Avatar/0…7                     | Nhân dạng người chơi      |
| GameArt/caro                   | Bàn cờ, X/O               |
| GameArt/telephone              | Bong bóng thoại, hình mèo |
| GameArt/ludo                   | Xúc xắc và quân ngựa      |
| GameArt/poker                  | Bài và chip ảo            |
| HeroArt                        | Ghép minh họa tại Lobby   |
| favicon.svg                    | Tab trình duyệt           |

Tất cả fill phẳng, stroke bo tròn, không ảnh hoặc emoji. Hình trang trí aria-hidden; ý nghĩa trò có nhãn văn bản.

## Motion

| Thành phần         | Thời lượng           | Easing      | Chuyển động                    |
| ------------------ | -------------------- | ----------- | ------------------------------ |
| Nút                | 120ms                | ease-out    | hover −3px/−1,5°; press +4px   |
| GameCard hover     | 200ms                | ease-out    | −10px / −1,5°                  |
| GameCard xuất hiện | 480ms, stagger 100ms | easeOut     | 0 → 1,06 → 1 qua Framer Motion |
| bob                | 3s lặp               | ease-in-out | nâng 12px, nghiêng 3°          |
| wiggle             | 3s lặp               | ease-in-out | ±1° quanh góc −2°              |
| pulse              | 1,8s lặp             | ease-in-out | scale 1 → 1,15                 |
| ticker             | 35s lặp              | linear      | trôi ngang, hover tạm dừng     |
| toast-in           | 200ms                | ease-out    | y 16px → 0                     |

`prefers-reduced-motion`: CSS tắt animation/transition và hover movement, Framer Motion `MotionConfig reducedMotion="user"` tắt transform. Nội dung/trạng thái không phụ thuộc animation. Game-specific motion sẽ bổ sung cùng game.

## Hành vi bản duyệt

Vào phòng kiểm tra định dạng mã rồi báo tính năng đang chuẩn bị. Tạo phòng mở lựa chọn game và thông tin, không tạo state phòng. Không có người hoặc phòng giả. ACCESS_CODE kiểm tra ở socket handshake; số online cập nhật từ server. Tên/avatar/theme lưu ở máy người dùng.
