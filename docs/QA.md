# Kiểm thử SafeMap

Cập nhật 12/11/2026. Tài liệu này thay cho checklist của bản FE demo cũ; dữ liệu hiện lấy từ Firebase, quản trị tại `/admin`, xuất Excel và có chỉ đường trong bản đồ.

## Chạy kiểm thử

```sh
npm test
npm run test:ui
npm run build
```

- `npm test`: unit test logic dữ liệu, tìm kiếm, định tuyến và các trò chơi.
- `npm run test:ui`: kiểm thử tích hợp React trong JSDOM. Firebase, GPS, API báo cáo và định tuyến được mô phỏng. Không phải kiểm tra pixel hay kiểm thử thiết bị thật.
- `npm run build`: đóng gói production. Cảnh báo chunk lớn của Firebase/MapLibre không đồng nghĩa build thất bại; cần đánh giá tải thực tế riêng.

## Kết quả lần rà soát này

- 26 unit test đạt.
- 117 kiểm tra tích hợp DOM đạt.
- Build production đạt.
- Trình duyệt đã kiểm tra giao diện người dùng ở 320×640, 390×844, 768×1024 và 1440×900; admin ở mobile và PC.
- Đã đăng nhập Firebase thật, xem chi tiết/sửa rồi hủy và đăng xuất. Không lưu/xóa dữ liệu thật.
- Dịch vụ định tuyến xe máy đã trả được tuyến thật khi chọn điểm xuất phát công khai trên bản đồ.
- Xuất Excel báo thành công ở giao diện. Chưa kiểm tra nội dung bằng ứng dụng Microsoft Excel.

## Ma trận kiểm thử

| Phân hệ | Kiểm tra trong trình duyệt | Kiểm tra tự động |
| --- | --- | --- |
| Giới thiệu | Chuyển slide, chiều cao cố định, cuộn vào map | Thao tác vuốt/cuộn, trạng thái rời màn hình, mở lại sau reload |
| Tìm kiếm | Mở/đóng, kết quả rỗng, xóa bộ lọc, VI/EN | Từ không dấu, khoảng trắng thừa, từ ở nhiều trường, giữ bộ lọc khi xem tất cả |
| Ba nhóm | SafePoint, GreenPoint, đối tác; nhóm/danh mục/chip | Phân nhóm danh mục, lọc trạng thái rác, tổng số |
| Danh sách/chi tiết | Chọn ghim/card, trở về, bố cục mobile và PC | Giữ danh sách khi mở chi tiết, không tạo popup trùng |
| Ảnh | Slider, phóng to, đóng modal, nested modal trong admin | Điều hướng ảnh, ảnh tải lỗi và phục hồi, link ảnh phụ trùng |
| Ngôn ngữ | UI, nhãn ghim, tên đường theo khả năng dữ liệu | Lưu lựa chọn, đổi nhãn/road/controls trong cùng bản đồ |
| Bản đồ | Tiêu chuẩn, vệ tinh, nền tối, thu gọn sidebar | Pin có nhãn, danh mục, giới hạn/lớp bản đồ theo bộ lọc nguồn |
| GPS | Fallback chọn điểm khi không có vị trí | Tự yêu cầu khi mở/reload, watcher khi bắt đầu, GPS lỗi, phục hồi quyền |
| Chỉ đường | Tính tuyến xe máy thật, đổi menu phương tiện, thoát | Lựa chọn phương tiện, phản hồi lỗi, tuyến thu dần, lệch tuyến, đến nơi |
| Liên hệ | Đường dẫn tel và SOS hiển thị; không gọi thật | Số demo được phân biệt, liên kết Google Maps có tọa độ |
| Admin | Đăng nhập thật, xem/sửa tại chỗ/hủy, tab, xuất Excel | Đăng nhập sai, không có role editor, phân trang, thêm/sửa/xóa, xác nhận và lỗi lưu |
| Giờ/ảnh URL | Form chỉnh sửa và dropdown | Cặp mở/đóng, giờ qua đêm, URL ảnh, tối đa ảnh phụ và bản dịch tùy chọn |
| Báo cáo | Không xác minh GA4 thật trong đợt này | Endpoint thiếu, thiếu cấu hình, retry, phản hồi số liệu mô phỏng |
| Bàn phím | Focus vào rail, dropdown Escape, đóng modal | Dropdown, modal, bảng, nút và một phần luồng focus |

## Cần nghiệm thu trên thiết bị thật

1. iPhone Safari và Android Chrome: nhập liệu không tự zoom viewport, bàn phím không che nút chính.
2. Bóp zoom/twist trên màn cảm ứng; resize, thay đổi thanh địa chỉ và xoay màn hình.
3. Di chuyển thật: tuyến ngắn dần, đi sai tuyến, chờ GPS xấu, khôi phục sau từ chối quyền.
4. Khóa màn hình/đổi ứng dụng rồi quay lại. Web chưa có định vị nền.
5. Mạng di động yếu/mất mạng, ảnh lỗi, WebGL/context recovery, thời lượng pin khi dẫn đường lâu.
6. Kiểm tra cấu hình Firebase/GA4, quyền thực tế và route `/admin` trên bản deploy HTTPS.
7. Nghiệm thu dữ liệu phường: tên, danh mục, tọa độ, số điện thoại, lịch, ảnh và đơn vị phụ trách.
8. Kiểm thử tải đồng thời và theo dõi hạn mức dịch vụ trước khi cam kết mức phục vụ.

Chi tiết nhận xét theo khách du lịch/tester/designer/khách hàng: [DANH_GIA_SAN_PHAM.md](./DANH_GIA_SAN_PHAM.md).
