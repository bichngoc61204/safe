# Checklist duyệt FE SafeMap

Chạy `npm run dev`, mở URL trên trình duyệt. Dùng DevTools Responsive Mode ở 390×844, 768×1024 và 1440×900.

## Người dân / khách du lịch

- [x] Desktop 1440×900: panel tìm kiếm/danh sách bên trái, bản đồ vector bên phải; không tràn ngang.
- [x] Mobile 390×844 và 320×740: tìm kiếm phía trên, các nhóm địa điểm dạng tab chữ; danh mục dạng select; bản đồ full viewport; danh sách dạng bottom sheet.
- [ ] Bản đồ mặc định đúng An Thượng, zoom 15, marker khác biểu tượng/màu theo danh mục.
- [x] Nhấn card mở chi tiết đúng địa điểm; ghim được chọn nằm giữa tìm kiếm và bottom sheet trên mobile.
- [x] Tìm `phuoc thien` trong trình duyệt; kiểm thử logic cho tìm không dấu, vật liệu và kết quả rỗng.
- [ ] Kết hợp tìm kiếm/danh mục; xóa bộ lọc trở lại đầy đủ.
- [ ] SafePoint chỉ có hỗ trợ an toàn, hành chính, y tế và giáo dục.
- [x] GreenPoint có 10 điểm trong bộ dữ liệu mới; lọc cần xử lý thấy 2 điểm mẫu.
- [ ] Đối tác xanh chỉ hiển thị các đối tác.
- [ ] Chuyển VI/EN, kiểm tra menu, trạng thái, chi tiết, form và dashboard.
- [ ] Cho phép GPS: hiển thị vị trí, tính khoảng cách và sắp xếp gần nhất.
- [ ] Từ chối GPS: thông báo phù hợp, nút có thể thử lại.
- [ ] Chỉ đường mở Google Maps đúng tọa độ trong tab mới.
- [ ] SOS mở đúng 3 đầu số. Không thực hiện cuộc gọi thật khi test.
- [ ] Thêm ảnh URL hợp lệ / ảnh lỗi: chi tiết có ảnh hoặc hình minh họa thay thế.
- [ ] Tab bằng bàn phím, mở/đóng modal với Escape, focus hiển thị rõ.

## Quản trị

- [ ] Chưa đăng nhập: hiển thị form. Sai email/mật khẩu: báo lỗi.
- [ ] Điền tài khoản demo, đăng nhập và đăng xuất được trên mobile lẫn desktop.
- [ ] Tổng quan mặc định: tổng 19; hỗ trợ 6; thu gom 10; cần xử lý 2.
- [ ] Nhấn stat/card hoặc danh mục phân bổ: chuyển đúng bảng và bộ lọc.
- [ ] Tìm kiếm, lọc danh mục/trạng thái, phân trang; trường hợp không có kết quả.
- [ ] Tạo GreenPoint: điền tên/địa chỉ/đơn vị/vật liệu, chọn tọa độ bằng map và kéo ghim.
- [ ] Sửa trạng thái thành quá tải: thống kê và cảnh báo cập nhật ngay.
- [ ] Về bản đồ cộng đồng: thông tin và marker đồng bộ.
- [ ] Tải lại trang: dữ liệu thêm/sửa vẫn còn; phiên demo còn trong tab hiện tại.
- [ ] Xóa có xác nhận; hủy xóa giữ nguyên dữ liệu; xóa thật cập nhật tổng số.
- [ ] Tạo/sửa đối tác và kiểm tra màn hình Đối tác xanh.
- [ ] Tạo danh mục, sửa tên/màu/icon, gán địa điểm, kiểm tra filter/marker.
- [ ] Xóa danh mục đang có địa điểm bị ngăn; danh mục trống xóa được.
- [ ] Xuất JSON có cả địa điểm và danh mục.
- [ ] Khi trình duyệt chặn localStorage: báo không lưu được, không hiển thị thành công giả.

## Giới hạn chưa triển khai

Không có backend, bảo mật đăng nhập thật, phân quyền nhiều cán bộ, chia sẻ dữ liệu giữa các máy, tiếng Hàn, định tuyến trong bản đồ hay GIS chuyên sâu. Đây là bản duyệt FE, không phải dữ liệu địa phương đã xác minh.

## Bản tân trang giao diện

- Mặc định bản đồ Bright có nhãn; chỉ lọc nhãn nền quanh Hoàng Sa–Trường Sa. Vệ tinh có lớp nhãn áp dụng cùng bộ lọc. Giữ các overlay SafeMap và nguồn dữ liệu.
- Marker và danh sách dùng icon danh mục Lucide cùng nét. Giao diện trắng–xanh lá; marker an toàn xanh dương, y tế đỏ hồng, hành chính/giáo dục navy, môi trường xanh lá. Cảnh báo marker có chấm vàng nhỏ.
- Đã kiểm tra dashboard demo trên mobile, không tràn ngang, thống kê 19 / 6 / 10 / 2.
- Chỉ đường Google Maps và OpenStreetMap đều là liên kết ngoài. Chưa triển khai tuyến đường nội bộ.
- Ảnh xem trước: `preview-desktop.jpg`, `preview-mobile.jpg`.
- WebGL không khả dụng: fallback nền OSM; thử trên thiết bị thật để đánh giá hiệu năng GPU và GPS.

- Đã kiểm tra PC: khi chọn địa điểm, phần giới thiệu/tab thu gọn, không có popup lặp; ghim chọn nổi bật và metadata đóng mặc định.
- Đã kiểm tra mobile 390px và 320px sau thay đổi nền màu, không tràn ngang; ghim chọn nằm giữa thanh tìm kiếm và bottom sheet.
- Chuyển động ngắn cho nội dung, ghim và camera; hỗ trợ `prefers-reduced-motion`.

## Biển đảo và nút nguồn

- Nút nguồn dùng SVG nét 10px, viền hiển thị 16px; vùng chạm trong suốt 24px.
- Có lớp GeoJSON đất nổi từ Natural Earth 1:10m và nhãn Hoàng Sa–Trường Sa độc lập với nền vector.
- Không có nút biển đảo; nhãn quần đảo là chữ thường trên bản đồ, không nền thẻ và không chấm. POI địa phương ẩn khi thu nhỏ dưới zoom 10 để tránh chồng ghim.
- Nút về An Thượng khôi phục khung nhìn địa phương và các marker.

## Nhãn nền / ảnh vệ tinh

- Địa danh và tên đường ngoài hai vùng Hoàng Sa–Trường Sa được giữ.
- Nhãn trong vùng biển đảo bị loại theo vị trí, không theo ngôn ngữ hay chuỗi tên.
- Lớp Hoàng Sa–Trường Sa và POI của SafeMap không bị bộ lọc nền tác động.
- Kiểm tra cả bản đồ màu và vệ tinh có lớp nhãn.

- Bộ đổi nền có đủ Bản đồ / Tối giản / Vệ tinh; đã kiểm tra ở chiều rộng mobile 320px.
