# Góc Chơi Văn Phòng

GameHub tiếng Việt cho đồng nghiệp. React + Vite / Node.js + Express + Socket.IO, TypeScript strict, pnpm workspaces. Không tài khoản, database, bot hoặc tiền thật.

## Trạng thái bàn giao

- Phase 0 local: monorepo, lệnh dev chung, server `/health`, Socket.IO cùng origin, Lobby và trang bộ giao diện sáng/tối, Dockerfile multi-stage.
- Phase 1 local: tạo/vào phòng bằng mã 4 ký tự, nickname/avatar, link mời, danh sách phòng, chat, chuyển chủ phòng, Cờ caro 15 × 15 hai người thật, 30 giây/nước, kết quả và chơi lại. Online là số playerId duy nhất đang kết nối.
- Phase 4 Poker local: Texas Hold’em 2–8 người, mỗi người 1.000 chip ảo, blind 10/20, lượt 30 giây, đủ preflop/flop/turn/river, fold/check/call/raise/all-in, side pot, showdown và chia chip khi hòa. Host chia ván kế tiếp; giải đấu kết thúc khi chỉ còn một người có chip. `pokersolver` chấm bài phía server.
- Spectator: từ danh sách phòng hoặc nhập mã, dùng nút biểu tượng con mắt để xem ván mà không chiếm ghế; spectator có thể gửi/nhận chat chung cùng người chơi. Danh sách spectator, trạng thái online và chat dùng cùng vòng reconnect 60 giây.
- Bất kỳ người chơi nào trong phòng có ghế trống đều mời được spectator vào ghế chơi. Spectator cũng có thể gửi yêu cầu; người chơi trong phòng duyệt/từ chối. Yêu cầu có thể chờ trong lúc ván đang chạy; nhận lời mời chỉ chuyển thành ghế khi ván không còn diễn ra.
- Khung chat desktop được mở rộng, có vùng tin nhắn cao hơn; trên mobile, bảng chat chiếm thêm chiều cao màn hình.
- Danh tính, khóa giữ ghế, mã phòng gần nhất và giao diện lưu localStorage; mã văn phòng chỉ giữ sessionStorage. Server kiểm tra mã trước khi vào Lobby, xác thực khóa giữ ghế và validate tất cả payload. Không tạo phòng hoặc người chơi giả.
- Mất kết nối: giữ ghế 60 giây, tạm dừng đồng hồ ván; reconnect cùng trình duyệt giữ đúng bàn và lượt, rồi tiếp tục thời gian còn lại. Quá 60 giây thì đối thủ thắng. Rời phòng chủ động xử thua ngay, chuyển chủ phòng cho người còn lại. Phòng trống 10 phút được xóa. Restart mất toàn bộ phòng do dùng RAM.
- Chưa triển khai online: chờ thông tin VPS của chủ dự án. Docker cần được build/test khi có Docker Engine đang chạy.
- Tam sao thất bản và Cá ngựa vẫn đang chờ triển khai. Poker được ưu tiên hoàn tất ở phase này. Deploy và kiểm tra HTTPS sẽ tiếp tục khi có thông tin VPS.

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
- Nhập biệt danh, chọn avatar và mã văn phòng nếu có ở màn vào chơi. Một người mở nhiều tab cùng origin vẫn có một danh tính và một ghế. Dùng hai trình duyệt/profile khác nhau để thử hai người. Trên máy local, cũng có thể dùng `http://localhost:5173` cho người thứ nhất và `http://127.0.0.1:5173` cho người thứ hai vì hai origin có lưu trữ riêng; nhập cùng mã phòng.

## Thử Phase 1 bằng hai người

1. Người thứ nhất tạo phòng Cờ caro, bấm **Mời đồng nghiệp** và gửi link hoặc mã 4 ký tự.
2. Người thứ hai mở bằng thiết bị/trình duyệt khác, nhập nickname và mã văn phòng nếu có, vào cùng phòng. Chỉ chủ phòng bắt đầu khi đủ 2 người online.
3. Gửi chat, đánh luân phiên X/O. Nối ít nhất 5 quân liền nhau theo hàng, cột hoặc chéo để thắng; không xét chặn hai đầu. Hết 30 giây thì thua. Chơi lại đổi người cầm X.
4. Đóng một tab, mở lại bằng đúng trình duyệt trong 60 giây: tự vào lại phòng, giữ bàn và lượt. Có người offline thì ván tạm dừng và hiện đếm ngược giữ chỗ. Để tab đóng quá 60 giây: người còn lại thắng; người quay lại phải vào phòng cho ván sau.
5. Ở sảnh, bấm nút con mắt cạnh phòng hoặc nhập mã rồi bấm nút con mắt để vào xem. Spectator theo dõi bàn cờ và chat mà không chiếm ghế; bấm **Rời phòng** khi muốn thoát.
6. Spectator bấm **Yêu cầu vào chơi**; người chơi có thể duyệt yêu cầu hoặc bấm **Mời vào chơi** cạnh tên spectator. Người được mời chấp nhận để nhận ghế; các yêu cầu vẫn chờ khi ván chưa kết thúc.
7. Trên mobile, chat nằm trong bảng kéo lên bằng nút dưới cùng. Bàn mặc định thu vừa màn hình; **Phóng to** tạo ô khoảng 44px và cho phép cuộn. Có thể chọn ô bằng phím mũi tên/Home/End, Enter để đánh.

Mã văn phòng có thể đặt trong `.env` với `ACCESS_CODE`; lệnh dev đọc file này. Sau khi đổi mã, khởi động lại server. Không xóa localStorage giữa ván: khóa danh tính/giữ ghế sẽ mất. Bài kiểm tra trên URL HTTPS và thiết bị thật chờ VPS.

## Thử Poker

1. Ở Lobby, chọn Poker và tạo phòng. Mời từ 2 đến 8 người vào ghế; người khác có thể vào xem bằng biểu tượng con mắt, chat chung và gửi yêu cầu nhận ghế.
2. Chủ phòng bắt đầu ván khi có ít nhất 2 người. Mỗi người nhận hai lá riêng; bài của đối thủ và spectator luôn bị ẩn cho tới showdown. Chỉ server xáo bài, quyết định lượt, chấm bài và cập nhật chip.
3. Theo lượt, chọn **Fold**, **Check/Call**, **Bet/Raise** với thanh chọn mức cược hoặc **All-in**. Hết 30 giây server tự check nếu hợp lệ, nếu không thì fold. Khi một người còn lại, pot được trao; nếu còn nhiều người, vòng cược đi tiếp qua flop, turn, river và showdown.
4. Side pot được chia riêng theo mức all-in; pot hòa được chia đều và chip lẻ đi theo thứ tự từ bên trái dealer. Host bấm **Chia ván tiếp** để giữ nguyên số chip và tiếp tục giải đấu. Khi chỉ còn một stack, host có thể khởi động lại giải đấu.
5. Chủ phòng có thể bấm **Game mới** bất kỳ lúc nào để kết thúc game hiện tại, chia bài mới và cấp lại 1.000 chip cho mọi ghế. Spectator có thể tự nhận ghế trống trong lúc chơi hoặc nhận lời mời từ bất kỳ người chơi nào; ghế hiện **Chờ ván sau**, không được đánh hay nhận bài giữa ván. Người rời phòng biến mất khỏi bàn ngay; mất kết nối tạm thời vẫn được giữ ghế 60 giây.
6. Avatar trên bàn dạng tròn, kèm nhãn chip và trạng thái. Đầu ván, popup báo vai trò Dealer / Small Blind / Big Blind, gồm cả hai vai trò của Dealer ở bàn hai người. Có pháo bông khi thắng và tắt hiệu ứng khi thiết bị bật giảm chuyển động. Các nút cược dùng thuật ngữ tiếng Anh; khung chat giữ bố cục hiện tại, không có nhật ký ván. Mọi chip chỉ là chip ảo, không quy đổi tiền.

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
# Tự khởi chạy server production cô lập và chơi trọn ván:
pnpm test:phase1
# Thêm kiểm tra mất mạng đủ 60 giây thực tế:
pnpm test:phase1:long
# Chạy Poker với ba người chơi và một spectator qua server production cô lập:
pnpm test:phase4
```

Smoke test là script client riêng trong `scripts/`, chỉ dành cho dev/test; kiểm tra HTTP, route SPA, WebSocket, đếm người, ngắt kết nối và từ chối danh tính sai. Dùng `TEST_URL` và `TEST_ACCESS_CODE` nếu server có cấu hình khác. `test:phase1` tự build và mở một server riêng ở cổng ngẫu nhiên, kiểm tra ACCESS_CODE, chống chiếm danh tính, quyền chủ phòng, phòng đầy, validation, chat rate limit, thắng trọn ván, rematch đổi X/O, reconnect giữ state và chuyển host. Bản `:long` chờ hết 60 giây thực tế. Unit test kiểm tra 4 hướng thắng, overline, draw, timeout, absence, chuyển host, giữ ghế, xóa phòng trống và giới hạn sự kiện. Không có client test nào được đưa vào bản web/server production.

Phase 1 trước đó đã qua 31 unit test, typecheck, lint, build và script production cô lập; URL HTTPS, thiết bị thật và Docker vẫn chờ VPS/Docker Engine. Phase 4 có thêm unit test cho cược, timeout, showdown, side pot và chip khi hòa, cùng script client production cô lập cho nhiều người, quyền riêng tư, spectator, chat, yêu cầu nhận ghế và ván tiếp theo.

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
6. Thử Phase 1 theo mục kiểm tra hai người ở trên qua URL HTTPS trên hai thiết bị thật. Giữ đúng một instance; không tự ngủ, không bật autoscale.

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
apps/web/src/pages        Lobby, DesignSystem và RoomPage
apps/web/src/games/caro   Bàn 15 × 15 và điều khiển bàn phím
apps/web/src/games/poker  Bàn Texas Hold’em và thanh hành động thích ứng
apps/web/src/store        Danh tính, tùy chọn giao diện
apps/web/src/lib          Danh mục và kết nối socket
apps/server/src/socket   Xác thực, validation và giới hạn sự kiện
apps/server/src/rooms    RoomStore, timer, reconnect, host và chat RAM
packages/shared/src      Game contracts, logic Caro và logic Poker
scripts                  Client kiểm tra tự động, không nằm trong sản phẩm
deploy                   Ví dụ reverse proxy
docs                     Handoff giao diện
```

`pokersolver` chỉ được nạp ở server qua subpath Poker; bundle trình duyệt không chứa bộ chấm bài.

Tài liệu chính thức đã đối chiếu: [Vite](https://vite.dev/guide/), [Tailwind với Vite](https://tailwindcss.com/docs/installation/using-vite), [Express 5 routing](https://expressjs.com/en/guide/migrating-5/), [Socket.IO server options](https://socket.io/docs/v4/server-options/).
