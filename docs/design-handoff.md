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

`prefers-reduced-motion`: CSS tắt animation/transition và hover movement, Framer Motion `MotionConfig reducedMotion="user"` tắt transform. Nội dung/trạng thái không phụ thuộc animation. Phase 1 bổ sung stone-drop 240ms ease-out, last-pulse 1,8s ease-in-out, win-flash 700ms × 4, confetti-fall 1,8s ease-in. Năm quân thắng có nền vàng và nhãn trên từng ô; kết quả luôn hiện bằng văn bản.

## Hành vi Phase 1

Tạo/vào phòng Cờ caro hoạt động qua Socket.IO. ACCESS_CODE kiểm tra ở socket handshake trước Lobby; số online và danh sách phòng cập nhật từ server. Tên/avatar/theme/khóa giữ ghế/mã phòng gần nhất lưu ở máy người dùng. Mời đồng nghiệp chép link `/room/<mã>`; link đi qua màn nickname và mã văn phòng trước khi vào phòng.

Phòng chờ dùng cùng shell, màu, SVG và nét viền của Lobby, có 2 ghế online/offline và nhãn chủ phòng. Bắt đầu chỉ bật khi đủ hai người online và chỉ hiện cho chủ phòng. Caro dùng bàn cream 15 × 15, X hồng/O xanh, ô mới đánh và hàng thắng được đánh dấu; countdown 30 giây ở panel đang đến lượt. Mất mạng: banner tên + 60 giây giữ ghế và tạm dừng đồng hồ. Kết quả và chơi lại trong cùng phòng. Bảng chat desktop đặt cạnh bàn; mobile mở sheet từ nút cố định dưới cùng, có safe-area. Bàn mặc định vừa màn hình, Phóng to cho ô khoảng 44px và cuộn; mũi tên/Home/End/Enter hỗ trợ bàn phím.

Spectator dùng nút biểu tượng mắt ở danh sách phòng hoặc cạnh ô nhập mã trong sảnh; spectator không chiếm ghế, có thể theo dõi bàn và cùng chat với người chơi. Chat desktop rộng hơn và cao hơn; mobile dùng sheet cao hơn để đọc hội thoại thuận tiện.

Khi phòng có ghế trống, bất kỳ người chơi nào cũng có nút mời cạnh tên spectator. Spectator có thể gửi/yêu cầu rút yêu cầu; người chơi trong phòng có thể duyệt hoặc bỏ qua. Lời mời có chấp nhận/từ chối. Với Poker, spectator có thể tự nhận ghế trong lúc chơi hoặc nhận lời mời, nhưng chỉ được chia bài từ ván sau; Caro giữ quy tắc nhận ghế sau khi ván kết thúc hoặc phòng đang chờ.

## Bàn Poker

Texas Hold’em dùng mặt nỉ xanh oval, avatar tròn quanh bàn, pot và năm vị trí bài chung ở giữa, bài của bạn xòe trên avatar dưới cùng. Bàn thích ứng với 2–8 người và màn hình nhỏ; bài đối thủ úp cho đến showdown. Mốc Preflop / Flop / Turn / River / Showdown cho biết vòng hiện tại. Thanh hành động nằm dưới bàn, có Fold, Check/Call, Bet/Raise, thanh chọn mức cược và các mốc ½ Pot, Pot, All-in. Khung chat desktop và sheet chat mobile giữ nguyên; không có nhật ký ván. Khi kết thúc ván, bàn và bài vẫn hiển thị cùng kết quả chia chip và pháo bông. Hiệu ứng tôn trọng giảm chuyển động.

Chủ phòng có nút Game mới trong thanh công cụ để reset ngay, có hộp thoại giải thích cấp lại 1.000 chip cho mỗi người. Người rời phòng không còn avatar trên bàn; ghế mới nhận có nhãn Chờ ván sau. Popup vai trò hiển thị đầu ván, tự đóng sau 6 giây và có nút đóng; ở bàn hai người Dealer đồng thời là Small Blind.

Số chip, lượt, countdown, kết quả, pot phụ và nhãn bài đều được đồng bộ từ server. Thông tin “Chip ảo, chơi cho vui, không quy đổi tiền” xuất hiện trên bàn. Phase 2 Tam sao thất bản và Phase 3 Cá ngựa cùng component riêng vẫn chờ triển khai; client test của Poker nằm trong `scripts/`, ngoài sản phẩm.
