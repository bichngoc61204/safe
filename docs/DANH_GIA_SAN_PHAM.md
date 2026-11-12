# Đánh giá SafeMap qua 4 góc nhìn

Ngày rà soát: 12/11/2026. Phạm vi: website SafeMap dành cho người dùng và `/admin`; không thiết kế lại `/game`.

Đây là đánh giá chuyên môn qua trình duyệt, đọc mã nguồn và kiểm thử tự động. Các mức hài lòng bên dưới là nhận định theo vai trò giả định, không phải kết quả khảo sát khách du lịch hoặc xác nhận nghiệm thu của khách hàng.

## 1. Nếu tôi là khách du lịch vừa đến An Thượng

### Hành trình thực tế

1. Mở web, thấy màn giới thiệu có ba slide và hình bản đồ minh họa thay đổi theo nội dung.
2. Cuộn xuống để vào bản đồ. Có thể chuyển slide bằng nút chấm; bàn phím hỗ trợ chuyển slide, xuống trang và Escape.
3. GPS được yêu cầu tự động theo thiết lập hiện tại. Nếu trình duyệt đã cho phép, khoảng cách được cập nhật. Chưa cho phép thì trình duyệt hỏi quyền.
4. Mở tìm kiếm, chọn SafePoint/GreenPoint/Đối tác xanh, lọc danh mục. GreenPoint có thêm trạng thái vệ sinh.
5. Xem vài gợi ý rồi mở toàn bộ kết quả **đã lọc**, chọn điểm để xem ảnh, số điện thoại, giờ hoạt động và chỉ đường.
6. Chỉ đường trong bản đồ mặc định xe máy; có thể đổi phương tiện hoặc mở Google Maps.

### Điều tạo thiện cảm

- Không cần tài khoản để dùng bản đồ; giao diện mobile nhường nhiều diện tích cho bản đồ.
- Trắng, xanh lá và màu danh mục tạo cảm giác cộng đồng, dễ chịu; ba nhóm có mục đích khác nhau rõ ràng.
- Giới thiệu có bản sắc, đẹp hơn một màn hình chỉ có logo và dòng chào.
- Thông tin liên hệ và hướng dẫn nằm cạnh bản đồ, ít chuyển trang.
- Có hướng xử lý khi GPS không hoạt động: chọn điểm xuất phát trên bản đồ.
- SOS, liên kết điện thoại và Google Maps có thể tiếp cận trực tiếp. Trong kiểm thử không thực hiện cuộc gọi thật.

### Điều khiến tôi còn do dự

- Dữ liệu hiện tại còn điểm demo, tên/danh mục chưa khớp và ảnh chưa đầy đủ. Khách không thể biết địa điểm có đáng tin chỉ nhờ giao diện đẹp.
- Chuyển sang tiếng Anh chưa đồng nghĩa toàn bộ mô tả đã được dịch: các trường tiếng Anh của địa điểm cần người quản trị nhập. Giữ nguyên tên riêng là hợp lý; mô tả, lịch hoạt động, loại rác cần nội dung tiếng Anh.
- Trạng thái “Hoạt động” là trạng thái vận hành, không phải xác nhận “đang mở cửa ngay lúc này”. Chưa có lịch tuần có cấu trúc để khẳng định giờ mở cửa theo từng ngày.
- Chưa có liên kết chia sẻ mở thẳng một địa điểm; chưa lưu danh sách yêu thích. Đây là đề xuất tiếp theo, chưa tự thêm trong đợt sửa này.
- Màn giới thiệu xuất hiện mỗi lần tải lại theo yêu cầu hiện tại. Khách mới thấy hấp dẫn, người quay lại nhiều lần có thể thấy thêm một bước. Nên cân nhắc lại sau khi có quan sát người dùng thật.

**Mức hài lòng:** khá tốt về tra cứu và giao diện; còn phụ thuộc mạnh vào chất lượng dữ liệu địa phương.

## 2. Nếu tôi là tester

### Lỗi và điểm yếu đã xử lý trong đợt này

| Mục | Vấn đề phát hiện | Cách xử lý |
| --- | --- | --- |
| Tìm kiếm | Khoảng trắng đầu/cuối hoặc nhiều khoảng trắng có thể làm hụt kết quả | Chuẩn hóa thành các từ, tìm không dấu trên dữ liệu Việt/Anh; hỗ trợ từ nằm ở các trường khác nhau |
| Gợi ý mobile | Khi lọc có thể dựng toàn bộ danh sách trong panel gợi ý | Giới hạn 4 gợi ý; tổng số và danh sách đầy đủ vẫn theo bộ lọc hiện tại |
| Kết quả rỗng | Nút bị vô hiệu nhưng màu xanh vẫn giống nút đang dùng được | Trạng thái disabled chuyển màu trung tính rõ ràng |
| Bộ lọc PC | Khó xóa nhanh bộ lọc khi còn một ít kết quả | Thêm số kết quả và nút xóa bộ lọc trên PC |
| Ngôn ngữ ghim | Tên danh mục trợ năng trong marker vẫn là tiếng Việt khi đổi sang tiếng Anh | Đồng bộ nhãn danh mục cho cả bản đồ người dùng và quản trị |
| GPS giữa hành trình | Sau lỗi quyền GPS, bám lại vị trí chỉ đổi camera, không khởi động lại watcher đã dừng | Nút định vị khởi động lại GPS và giữ tiến độ/tuyến hiện có |
| Phản hồi định tuyến | Chưa loại hết trường hợp tọa độ ngoài phạm vi, hình học toàn điểm trùng, số liệu âm | Chặn phản hồi không dùng được trước khi vẽ tuyến |
| Bàn phím/trình đọc màn hình | Panel tìm kiếm/danh sách thu gọn vẫn có thể tồn tại trong luồng tương tác | Đặt `inert` và trạng thái ẩn theo mobile/PC; khôi phục khi mở |
| Tìm kiếm mobile | Mở panel nhưng chưa sẵn sàng nhập | Đưa focus vào ô tìm kiếm, tránh cuộn trang do focus |
| Input mobile | Font nhỏ có thể khiến Safari tự zoom trang khi focus | Font nhập liệu 16px trên mobile |
| Card admin | Địa chỉ dài khiến card không đồng đều | Một dòng có dấu ba chấm, giữ đầy đủ ở chi tiết |
| Ảnh lỗi | Ảnh không tải chỉ còn biểu tượng trống | Hiển thị thông báo ảnh không tải được; vẫn mở được các ảnh khác |
| Dropdown phương tiện | Tiếng Anh có thể xuất hiện cuộn ngang trong menu rất hẹp | Tăng chiều rộng tối thiểu của menu compact, giữ giới hạn theo màn hình |

### Các lớp kiểm thử

- **Trình duyệt thật:** trang giới thiệu, vào bản đồ, tìm kiếm rỗng, xóa bộ lọc, đổi ngôn ngữ, chọn ghim, chi tiết, SOS, chọn điểm xuất phát, gọi dịch vụ tính tuyến xe máy với tọa độ công khai, dropdown phương tiện, thoát chỉ đường, đăng nhập/quản trị/đăng xuất, xem ảnh, sửa tại chỗ rồi hủy, xuất Excel.
- **DOM tích hợp với Firebase/GPS mô phỏng:** thêm/sửa/xóa, quyền editor, xác nhận xóa, phân trang, phân nhóm, lọc, kiểm tra form, ảnh phụ trùng, lưu giờ qua đêm, xung đột/lưu lỗi, GPS xấu, di chuyển, tuyến thu ngắn dần, đi sai đường tính lại tuyến, đến nơi, khôi phục GPS sau lỗi quyền, báo cáo lượt truy cập và đồng bộ lại bản đồ.
- **Unit:** Haversine, tìm kiếm, danh mục, tính hợp lệ dữ liệu, URL ảnh, lịch giờ, chỉ dẫn kế tiếp, dữ liệu định tuyến bất hợp lệ. Bộ test hiện tại còn chạy hồi quy logic trò chơi, không sửa trò chơi.
- **Build production:** chạy Vite build để kiểm tra đóng gói.

Không thay đổi bản ghi thật trong Firebase khi kiểm tra CRUD. Thao tác sửa trên tài khoản thật được hủy; thao tác ghi/xóa chạy qua fixture kiểm thử.

### Chưa được chứng nhận bằng đợt kiểm thử này

- Chạy xe thật, khóa màn hình rồi mở lại, GPS ngoài đường hẹp hoặc dưới mái che.
- Safari iPhone thật, Android cấu hình thấp, bàn phím hệ thống thật và mạng di động chập chờn.
- Chịu tải đồng thời 100 người hoặc thời gian hoạt động liên tục nhiều giờ.
- Toàn bộ Rules đang triển khai trên Firebase, hạn mức dịch vụ thật và vận hành một năm.
- Dữ liệu thống kê GA4 của môi trường triển khai; localhost không đại diện số liệu thật.
- Mở và đối chiếu toàn bộ nội dung file Excel bằng phần mềm Excel. Đã xác nhận thao tác tạo/xuất file ở giao diện.

## 3. Nếu tôi là designer

### Nên giữ

- Giới thiệu có lớp hình minh họa riêng cho từng slide và chuyển tiếp vào bản đồ.
- Bản đồ làm trung tâm; tìm kiếm và danh sách mở theo nhu cầu trên điện thoại.
- Màu nhóm nhất quán, nhóm an toàn/y tế/môi trường có biểu tượng phân biệt.
- Dẫn đường chia thành banner hướng đi phía trên và tóm tắt hành trình phía dưới.
- Admin sửa ngay trong card chi tiết, không chuyển sang màn hình khác.

### Đã tinh chỉnh

- Danh sách xuất hiện từ opacity 0, trượt ngang với độ trễ tăng dần; không chạy lại toàn bộ animation theo mỗi cập nhật GPS.
- Chữ nhãn, số điện thoại và nội dung chi tiết có tương phản rõ hơn.
- Giờ mở/đóng nằm cạnh nhau để quét thông tin nhanh; thông tin dài vẫn nằm trên hàng riêng.
- Trạng thái rỗng/disabled/ảnh lỗi rõ nghĩa hơn.
- Hỗ trợ giảm chuyển động cho các thành phần của bản đồ, quản trị và modal.

### Còn thiếu để nổi bật hơn

- **Bản sắc đến từ nội dung thật:** ảnh khu phố, mô tả ngắn có ích, vật liệu tiếp nhận cụ thể. Không cần thêm trang trí ngẫu nhiên.
- **Mức độ tin cậy có quy trình:** ai phụ trách, cập nhật lần cuối, liên hệ xác minh. Có thể làm nhãn xác minh nếu phường cung cấp quy trình; không tự gắn nhãn “đã xác minh”.
- **Tình huống sử dụng rõ:** khách muốn tìm nhà thuốc/công an/điểm tái chế; nên đánh giá các đường đi này với người thật trước khi thêm các nút mới.
- **Chuyển động trên thiết bị thật:** trình duyệt desktop giả lập mobile không chứng minh được 60fps trên điện thoại. Blur và WebGL vẫn tiêu thụ GPU; tránh tăng số lớp blur và animation liên tục.

**Mức hài lòng:** hình thức và cấu trúc đã có hướng riêng. Phần tiếp theo nên là độ rõ ràng và tính nhất quán khi dùng lâu, không tăng hiệu ứng ở mọi nơi.

## 4. Nếu tôi là khách hàng thuê làm website

Tôi có thể duyệt phần giao diện và luồng chức năng hiện tại để chuyển sang giai đoạn ráp dữ liệu và nghiệm thu thực tế. Tôi chưa nên ký nghiệm thu “đã vận hành ổn định cả năm” chỉ vì bản demo đẹp.

### Những gì có thể nhìn thấy

- Website riêng cho cộng đồng và đường dẫn quản trị riêng.
- Quản lý ba nhóm, danh mục con, ảnh URL, liên hệ, lịch giờ, tọa độ và trạng thái GreenPoint.
- Đăng nhập Firebase, đồng bộ bản đồ, xuất Excel, báo cáo truy cập có tích hợp đầu vào cấu hình riêng.
- Có quy trình báo lỗi khi lưu thất bại; xóa có xác nhận; danh mục đang được dùng không xóa trực tiếp.

### Những gì cần chốt trước bàn giao

1. Danh sách địa điểm chính thức: tên, nhóm, tọa độ, điện thoại, người phụ trách, giờ, vật liệu và ảnh được phép sử dụng.
2. Ai cập nhật dữ liệu, ai xác nhận thông tin sai; lịch rà soát mỗi tháng/quý.
3. Tài khoản vận hành riêng và thay mật khẩu demo trước khi công khai.
4. Deploy thật, tên miền/HTTPS, cấu hình Firebase/GA4, kiểm tra truy cập `/admin` và tải lại các trang.
5. Chuyến kiểm thử ngoài đường trên ít nhất iPhone và Android: GPS, lệch tuyến, đến nơi, mất mạng, thoát dẫn đường.
6. Xác nhận phương án dịch vụ bản đồ/định tuyến, nguồn và giấy phép sử dụng trước khi bàn giao. Không coi dịch vụ cộng đồng bên ngoài là cam kết SLA một năm.
7. Sao lưu dữ liệu, đầu mối bảo trì và tiêu chí nghiệm thu theo công việc thực tế, thay vì chỉ duyệt screenshot.

## Kết luận

SafeMap đã vượt mức một màn hình demo tĩnh: có luồng người dùng, quản trị và dữ liệu hoạt động cùng nhau. Giá trị tiếp theo nằm ở dữ liệu đáng tin, hồi phục lỗi và thao tác ổn định. Giao diện hiện tại đủ cơ sở để duyệt FE; mức sẵn sàng bàn giao cho người dân còn phải được xác nhận bằng dữ liệu chính thức và một đợt nghiệm thu trên thiết bị thật.
