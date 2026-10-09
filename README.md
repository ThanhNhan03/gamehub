# Góc Chơi Văn Phòng

GameHub tiếng Việt cho đồng nghiệp. React + Vite / Node.js + Express + Socket.IO, TypeScript strict, pnpm workspaces. Không tài khoản, database, bot hoặc tiền thật.

## Trạng thái bàn giao

- Phase 0 local: monorepo, lệnh dev chung, server `/health`, Socket.IO cùng origin, Lobby và trang bộ giao diện sáng/tối, Dockerfile multi-stage.
- Lobby là bản duyệt thiết kế. Các nút khám phá mở thông tin trò; tạo/vào phòng thông báo chưa mở. Không tạo phòng giả hoặc hiển thị người chơi giả. Online là số playerId duy nhất đang kết nối.
- Danh tính và giao diện lưu localStorage; mã văn phòng chỉ giữ sessionStorage. Server kiểm tra mã khi bắt tay socket. Đây chưa phải toàn bộ flow reconnect/phòng của Phase 1.
- Chưa triển khai online: chờ thông tin VPS của chủ dự án. Docker cần được build/test khi có Docker Engine đang chạy.
- Dừng duyệt ở design system + Lobby theo brief. Chưa triển khai màn chơi. Phase 1 tiếp theo: phòng, chat, reconnect 60 giây, chủ phòng, Cờ caro hai người thật và test trọn ván. Sau đó lần lượt Tam sao thất bản, Cá ngựa, Poker, hoàn thiện; duyệt và deploy sau mỗi phase.

## Chạy local

Node.js 24 LTS (tối thiểu 22.12), pnpm 10.28.2.

```sh
corepack enable
corepack prepare pnpm@10.28.2 --activate
pnpm install --frozen-lockfile
# Copy .env.example thành .env nếu muốn đặt ACCESS_CODE.
pnpm dev
```

- Web: http://localhost:5173
- Bộ giao diện: http://localhost:5173/design-system
- Health: http://localhost:3001/health
- Vite chuyển tiếp `/socket.io` và `/health` sang server 3001. `PORT` tùy chỉnh dành cho production; nếu đổi cổng server khi dev, cập nhật proxy trong `apps/web/vite.config.ts`.
- Bấm avatar góc trên, nhập biệt danh và mã văn phòng nếu có để kết nối. Một người mở nhiều tab được đếm một lần theo playerId. Hai trình duyệt/profile khác nhau có danh tính riêng.

## Kiểm tra

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
pnpm start
# Trong terminal khác, dùng server riêng không có người khác kết nối:
pnpm test:smoke
```

Smoke test là script client riêng trong `scripts/`, chỉ dành cho dev/test; kiểm tra HTTP, route SPA, WebSocket, đếm người, ngắt kết nối và từ chối danh tính sai. Dùng `TEST_URL` và `TEST_ACCESS_CODE` nếu server có cấu hình khác. Script hiện dành cho Phase 0; test trọn ván sẽ thêm cùng từng game.

## Build & chạy một container

```sh
docker build -t gamehub .
docker run -d --name gamehub --restart unless-stopped --init \
  --env-file .env -p 127.0.0.1:3001:3001 gamehub
```

`.env` trên VPS:

```dotenv
PORT=3001
CORS_ORIGIN=https://gamehub.example.com
ACCESS_CODE=replace-with-your-office-code
```

Thay tên miền và mã trước khi chạy. Nếu không cần mã, để ACCESS_CODE rỗng. Không đưa mã vào biến `VITE_*`, repo hoặc URL.

## Deploy VPS từng bước

1. Chuẩn bị VPS luôn bật với Docker Engine và reverse proxy HTTPS (ví dụ Nginx đã có chứng chỉ hợp lệ), một tên miền trỏ đến IP VPS. Không dùng hosting tĩnh hoặc dịch vụ tự ngủ.
2. Chuyển mã nguồn/clone repo lên VPS, tạo `.env` như trên. Giữ **đúng một container / một instance**. Tất cả state phòng sẽ giữ trong RAM; restart/deploy sẽ xóa phòng và ván hiện tại.
3. Build và chạy bằng hai lệnh Docker ở trên. Chỉ bind cổng ứng dụng vào `127.0.0.1`; public qua HTTPS ở reverse proxy.
4. Đặt cấu hình Nginx theo `deploy/nginx.conf.example`, đổi tên miền và đường dẫn chứng chỉ. Bật HTTP → HTTPS trên cổng 80. Cho phép 80/443 qua firewall.
5. Kiểm tra `https://<tên-miền>/health` trả `status: ok`, truy cập Lobby từ điện thoại, chọn nickname; kiểm tra WebSocket `/socket.io` hoạt động qua HTTPS. Client tự dùng origin hiện tại, không có URL production hard-code.
6. Sau khi duyệt Phase 0, triển khai Phase 1 và thử hai thiết bị thật: vào cùng phòng, đánh hết ván, mở lại tab trong 60 giây và thử mất mạng quá 60 giây.

### Cập nhật và đổi mã văn phòng

Chọn thời gian không có ván đang chơi. Đổi ACCESS_CODE trong `.env` trên VPS, sau đó tạo lại container; chỉ sửa file rồi `docker restart` sẽ không nạp lại environment.

```sh
docker build -t gamehub .
docker stop --time 10 gamehub
docker rm gamehub
docker run -d --name gamehub --restart unless-stopped --init \
  --env-file .env -p 127.0.0.1:3001:3001 gamehub
```

Server phát thông báo khởi động lại trước khi đóng kết nối khi nhận SIGTERM/SIGINT. Người dùng nhập lại mã mới khi kết nối. Không rolling deploy, không tăng replica vì state RAM không chia sẻ giữa instance.

## Cấu trúc

```text
apps/web/src/components   SVG, avatar, nút, dialog
apps/web/src/pages        Lobby và DesignSystem
apps/web/src/store        Danh tính, tùy chọn giao diện
apps/web/src/lib          Danh mục và kết nối socket
apps/server/src/socket   Kiểm tra payload bắt tay
packages/shared/src      Kiểu PlayerInfo, GameModule, socket events
scripts                  Client kiểm tra tự động, không nằm trong sản phẩm
deploy                   Ví dụ reverse proxy
docs                     Handoff giao diện
```

Không thêm dependency game trước phase sử dụng. `pokersolver` sẽ được dùng ở Phase 4; không tự viết bộ chấm bài.

Tài liệu chính thức đã đối chiếu: [Vite](https://vite.dev/guide/), [Tailwind với Vite](https://tailwindcss.com/docs/installation/using-vite), [Express 5 routing](https://expressjs.com/en/guide/migrating-5/), [Socket.IO server options](https://socket.io/docs/v4/server-options/).
