# Rà soát mã nguồn trước bàn giao

Ngày kiểm tra: 24/11/2026. Phạm vi: source hiện tại, kiểm tra tự động và các đường dẫn công khai của https://safe-murex-eta.vercel.app/.

## Kết quả và bản sửa

Chưa phát hiện lỗi chặn build hoặc lỗi trong các kiểm tra tự động đã chạy. Có một lỗi đường dẫn trên bản đang triển khai: `/admin` trả HTTP 200 nhưng `/admin/` trả 404. Đã thêm rewrite `/admin/` đến `/index.html` trong `vercel.json`. Cần deploy source mới để bản sửa có hiệu lực.

README được cập nhật theo giao diện quản trị hiện tại và tên nhóm An toàn / Điểm xanh; bổ sung hướng dẫn kiểm tra lượt truy cập.

## Kiểm tra đã chạy

| Hạng mục | Kết quả |
| --- | --- |
| `npm test` | 65 test đạt |
| `npm run test:ui` | 212 kiểm tra tích hợp React DOM đạt; không phải kiểm tra hình ảnh/bố cục |
| `npm run test:sync` | Đạt: lưu chậm, observer cũ, metadata xác nhận, lỗi và đăng xuất; SDK giả lập, không ghi dữ liệu thật |
| `npm run build` | Thành công; còn cảnh báo kích thước chunk Firebase/MapLibre |
| `npm audit --omit=dev` | 0 lỗ hổng dependency production được báo tại thời điểm kiểm tra |
| `/` và `/admin` trên Vercel | HTTP 200 |
| `/admin/` trên Vercel | HTTP 404; đã sửa trong source, chờ deploy |
| `/game` trên Vercel | HTTP 404, đúng với yêu cầu gỡ game |
| `/api/traffic` không có token | HTTP 401, không cung cấp báo cáo cho khách chưa xác thực |

Đợt UX/UI ngay trước đó đã kiểm tra trực quan ở 320×640, 390×844 và 1280×800. Chi tiết và ảnh nằm trong [báo cáo UX/UI](UNSLOP_UXUI_2026-11-24.md).

## Source thiếu hoặc thừa

- `/game` đã gỡ khỏi ứng dụng và bản build.
- Git chỉ theo dõi `.env.example` trong nhóm tệp cấu hình môi trường được quét. Không thấy private key PEM hoặc mật khẩu mẫu tài khoản trong mã ứng dụng được quét; đây không phải chứng nhận bảo mật toàn diện.
- Logo cũ trong `src/assets` là bản tham chiếu được ghi chú trong `branding.md`, không được ứng dụng import và không đóng vào bản build. Giữ lại không làm tăng tải trang.
- Các script test và tài liệu bàn giao phục vụ bảo trì; không phải tài nguyên được tải vào giao diện production.
- Chức năng ảnh vẫn dùng URL theo quyết định hiện tại. Link ảnh phải truy cập công khai và trả nội dung ảnh; link mở trang xem Google Drive không mặc nhiên là URL ảnh trực tiếp.

## Giới hạn còn lại cần biết

- Chưa deploy thay đổi của lượt kiểm tra này. Phải kiểm tra lại `/admin/` sau deploy.
- Không thực hiện lại CRUD trên dữ liệu khách hàng trong lượt rà soát này. Không xác nhận lại GPS di chuyển thực tế trên điện thoại, quyền Console hay thu thập Analytics đầu cuối bằng tài khoản chủ dự án.
- Giới hạn source hiện tại: 200 địa điểm kể cả ẩn/thùng rác, 40 danh mục, khoảng 800 KB dữ liệu JSON. Lịch sử lưu bản dữ liệu trước sửa nên cần theo dõi dung lượng khi vận hành lâu dài.
- Firebase/MapLibre còn chunk lớn; build vẫn thành công. Chưa thay kiến trúc tải bản đồ trong giai đoạn chốt bàn giao.
- Đã có tích hợp GA4 nhưng việc thu thập/đọc báo cáo còn phụ thuộc cấu hình Production trên Vercel và quyền GA4. Hướng dẫn: [Lượt truy cập](HUONG_DAN_LUOT_TRUY_CAP.md).

## Sau lần deploy cuối

Mở `/`, `/admin` và `/admin/`; đăng nhập, kiểm tra dữ liệu thật hiển thị và kiểm tra Realtime theo hướng dẫn Analytics. Không cần thêm tính năng mới để xử lý các phát hiện trong lượt rà soát này.
