# Hướng dẫn sử dụng SafeMap An Thượng

SafeMap An Thượng là bản đồ số cộng đồng cho khu vực An Thượng, Đà Nẵng. Người dân và du khách có thể tìm điểm hỗ trợ, điểm thu gom rác và cửa hàng hợp tác. Cán bộ cập nhật thông tin qua trang quản trị.

Các tính năng cộng đồng và quản trị mới cần Rules Firebase mới. Người phụ trách dự án làm theo [hướng dẫn kích hoạt](docs/KICH_HOAT_TINH_NANG_MOI.md) trước khi thử lưu, khôi phục hoặc phản ánh. Tài liệu đó cũng giải thích ba điểm demo và cách kiểm tra sau khi bật.

| Đường dẫn | Dùng để |
| --- | --- |
| `/` | Xem bản đồ, tìm địa điểm và chỉ đường. Ai cũng có thể truy cập. |
| `/admin` | Quản lý địa điểm và danh mục bằng tài khoản được cấp quyền. |

## Dành cho người xem bản đồ

1. Mở trang chủ. Cuộn xuống trên máy tính hoặc vuốt lên trên điện thoại để vào bản đồ. Có thể vuốt ngang hoặc chọn các chấm để xem các slide giới thiệu.
2. Mở **Tìm địa điểm** và nhập tên hoặc địa chỉ, có thể gõ không dấu. Chọn **SafePoint**, **GreenPoint** hoặc **Đối tác xanh** để thu hẹp kết quả. **Hiển thị tất cả** mở toàn bộ kết quả của bộ lọc đang dùng. **Xóa bộ lọc** đưa bạn về danh sách chung.
3. Chọn một ghim hoặc thẻ kết quả để xem ảnh, địa chỉ, trạng thái và thông tin liên hệ. Nếu điểm có ảnh, chạm ảnh để xem lớn hoặc vuốt để chuyển ảnh. GreenPoint có thể hiển thị thêm loại rác tiếp nhận và đơn vị phụ trách.
4. Web tự yêu cầu vị trí GPS mỗi lần mở hoặc tải lại bản đồ. Lần đầu cần cho phép trong trình duyệt; khi đã cấp quyền, vị trí và khoảng cách được lấy tự động. Nút **Vị trí của tôi** dùng để thử lại hoặc đưa bản đồ về vị trí của bạn. Khi chưa có GPS, khoảng cách trong gợi ý tìm kiếm được tính từ trung tâm An Thượng.

Trong chi tiết điểm, dùng **Lưu địa điểm** để lưu ngay trên trình duyệt, **Chia sẻ** để lấy liên kết/mã QR, hoặc **Báo thông tin chưa đúng** để cán bộ kiểm tra. Bộ lọc **Đã lưu** và **Đang mở** kết hợp với nội dung tìm kiếm đang có. GreenPoint còn lọc theo loại rác tiếp nhận. Trạng thái đang mở chỉ xuất hiện khi điểm đã khai báo lịch rõ ràng, tính theo giờ Việt Nam.

Nền **Tiêu chuẩn** được chọn mặc định và ưu tiên đường, tên đường. Bộ chọn nền có hai mục **Tiêu chuẩn** và **Vệ tinh**. Nút mặt trời/mặt trăng đổi màu sáng tối cho nền Tiêu chuẩn. Thu nhỏ đến mức thấp nhất để xem Việt Nam, Biển Đông, Hoàng Sa và Trường Sa. Trên điện thoại, dùng hai ngón để xoay bản đồ và chạm **N** để trở về hướng Bắc. Nút **VI/EN** đổi ngôn ngữ giao diện. Nút **SOS** mở danh sách gọi khẩn cấp.

### Chỉ đường

1. Mở chi tiết địa điểm và bấm **Chỉ đường trên bản đồ**. Hệ thống tính tuyến **xe máy** mặc định từ vị trí GPS. Nếu GPS không khả dụng, chạm một điểm trên bản đồ để đặt nơi xuất phát.
2. Xem trước các bước rẽ hoặc đổi sang **Đi bộ**, **Xe đạp** hay **Ô tô** trong menu phương tiện. Chọn **Bắt đầu dẫn đường** khi muốn camera theo dõi vị trí.
3. Khi di chuyển, đường tuyến thu dần theo phần đã đi. Ứng dụng tính lại tuyến khi xác nhận bạn đi lệch đường. Kéo hoặc xoay bản đồ sẽ tạm ngừng bám camera. Bấm nút biểu tượng **Vị trí của tôi** trên bản đồ để tiếp tục bám vị trí. Nút này cũng thử lại GPS nếu quyền vị trí vừa được cấp lại.
4. Bấm nút **X / Thoát chỉ đường** ở góc trên bên phải card hành trình để dừng. Khi đang ở giao diện chỉ đường, nút thu phóng và SOS được ẩn để giữ bản đồ gọn. **Google Maps** là phương án dự phòng khi muốn mở tuyến bên ngoài SafeMap hoặc khi tính tuyến trong web gặp lỗi.

## Dành cho cán bộ quản trị

Mở đường dẫn **`/admin`** trên cùng tên miền và đăng nhập bằng tài khoản được cấp.

| Màn hình | Công việc |
| --- | --- |
| **Tổng quan → Phân bố** | Xem tổng số điểm, số điểm theo nhóm và biểu đồ trạng thái. Chọn nhóm hoặc trạng thái trên biểu đồ để mở danh sách tương ứng. |
| **Tổng quan → Cập nhật** | Xem địa điểm vừa cập nhật và các GreenPoint cần vệ sinh hoặc quá tải. |
| **Tổng quan → Lượt truy cập** | Xem lượt xem bản đồ, số người dùng và biểu đồ theo ngày trong 7 ngày đã kết thúc gần nhất. Cần cấu hình Google Analytics theo mục [Báo cáo lượt truy cập](README.md#báo-cáo-lượt-truy-cập). |
| **Địa điểm** | Xem toàn bộ danh sách, tìm kiếm và lọc theo nhóm, danh mục. Có thể chọn trạng thái từ biểu đồ Tổng quan để xem các điểm tương ứng. Bấm tên một điểm để xem vị trí và thông tin. |
| **SafePoint / GreenPoint / Đối tác xanh** | Mở riêng danh sách của từng nhóm. |
| **Danh mục** | Quản lý danh mục theo nhóm, sửa tên Việt/Anh, màu và biểu tượng. Muốn xóa danh mục đang có địa điểm, chuyển các địa điểm sang danh mục khác trước. |
| **Công cụ dữ liệu** | Rà soát chất lượng, lịch sử/khôi phục, thùng rác và xử lý thông tin người dân gửi về. |
| **Xuất Excel / Nhập Excel** | Tải tệp `.xlsx`; nhập theo file mẫu, xem trước và sửa các lỗi trước khi xác nhận. Điểm nhập ở trạng thái ẩn để kiểm tra. |

### Thêm hoặc cập nhật địa điểm

1. Chọn **Thêm địa điểm** hoặc bấm **Chỉnh sửa** ở điểm hiện có. Chọn **Nhóm** trước, rồi chọn **Danh mục**. Nếu nhóm chưa có danh mục phù hợp, tạo danh mục trong màn **Danh mục** trước.
2. Điền tên, địa chỉ, số liên hệ và trạng thái. Có thể nhập vĩ độ, kinh độ, chạm bản đồ hoặc kéo ghim để đặt tọa độ. Với điểm thu gom, cập nhật loại rác tiếp nhận và tình trạng thực tế.
3. Khai báo giờ mở/đóng, hoặc bật **Dùng lịch theo từng ngày** để đặt ngày nghỉ, mở 24 giờ và lịch lễ riêng. Dán link ảnh chính. Với mỗi ảnh bổ sung, bấm **Thêm ảnh phụ** rồi dán một link vào ô mới. Có thể thêm tối đa năm ảnh phụ, hiển thị theo thứ tự được đánh số. Bấm ảnh thu nhỏ để xem trước hoặc bấm nút xóa bên cạnh để bỏ ảnh đó.
4. Chọn **Công khai / Đang ẩn**. Trạng thái hiển thị này độc lập với vệ sinh/hoạt động. Chỉ đánh dấu đã kiểm tra sau khi đối chiếu dữ liệu thật.
5. Bấm **Lưu**. Điểm công khai được cập nhật lên bản đồ cộng đồng; điểm ẩn vẫn có trong quản trị. Nếu có thông báo dữ liệu vừa được người khác cập nhật, mở lại điểm và kiểm tra thông tin mới trước khi lưu lại.

**Xóa** chuyển điểm vào thùng rác. Muốn lấy lại, mở **Công cụ dữ liệu → Thùng rác → Khôi phục ở trạng thái ẩn**; kiểm tra rồi công khai lại. Lịch sử lưu người cập nhật và bản trước sửa, cho phép khôi phục một điểm hoặc toàn bộ phiên bản; khôi phục toàn bộ sẽ đưa các điểm của bản đó về trạng thái ẩn. Xem [hướng dẫn quản trị mở rộng](docs/KICH_HOAT_TINH_NANG_MOI.md#4-tính-năng-dành-cho-cán-bộ) trước khi sử dụng khôi phục toàn bộ.

### Cách xếp nhóm và danh mục

Mỗi địa điểm thuộc một **danh mục**, và mỗi danh mục thuộc một **nhóm**. Ví dụ:

| Nhóm | Danh mục | Địa điểm minh họa |
| --- | --- | --- |
| SafePoint | Công an, Y tế, Hành chính, Giáo dục, Hỗ trợ cộng đồng | Công an phường, trạm y tế, trường học |
| GreenPoint | Môi trường | Điểm thu gom pin, điểm phân loại chai nhựa và giấy |
| Đối tác xanh | Dịch vụ | Quán cà phê xanh, cửa hàng tạp hóa hợp tác |


## Dành cho người phụ trách triển khai

Mở thư mục dự án trong VS Code. Với Node.js 22 trở lên, chạy:

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal. Thêm `/admin` vào địa chỉ đó để vào quản trị. Danh mục và đăng nhập cần cấu hình Firebase.

- **Firebase.** Điền bốn biến Web config theo [mẫu cấu hình](.env.example), bật Authentication bằng Email/Password và dùng Cloud Firestore. Bật thêm Anonymous để khách gửi phản ánh. Bản công khai nằm tại `catalogs/an-thuong`, bản quản trị tại `management/an-thuong`; lịch sử và phản ánh nằm riêng. Quyền ghi thuộc về tài khoản có document `editors/{UID}` với trường `active` kiểu boolean bằng `true`. Đặt `active` thành `false` để thu hồi quyền. Xuất bản [Firestore Rules](firestore.rules) theo [hướng dẫn kích hoạt](docs/KICH_HOAT_TINH_NANG_MOI.md).
- **Nạp bản sao.** Chạy `npm run seed:firebase -- backup.json` để kiểm tra tệp, rồi thêm `--write` trước tên tệp để nạp vào dự án Firebase trống. Xem [script nạp dữ liệu](scripts/seed-firebase.js).
- **Vercel.** Đặt các biến Firebase trong môi trường deploy và dùng `npm run build` để tạo thư mục `dist`. Dự án có cấu hình để mở trực tiếp `/admin` khi tải lại trang. Cấu hình Firebase cần có trước khi build bản triển khai. Xem [cấu hình Vercel](vercel.json).
- **Kiểm tra.** Chạy `npm test` và `npm run test:ui`. Khi nghiệm thu, thử tìm kiếm, mở địa điểm, dẫn đường trên điện thoại và thêm hoặc sửa một điểm từ tài khoản quản trị.
