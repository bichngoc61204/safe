# BÁO CÁO CHỨC NĂNG — SAFEMAP AN THƯỢNG

**Ngày lập:** 18/11/2026  
**Sản phẩm:** Bản đồ số phục vụ tìm kiếm địa điểm, hỗ trợ cộng đồng và môi trường tại An Thượng, Đà Nẵng.  
**Phạm vi:** Trang cộng đồng `/` và trang quản trị `/admin` trong mã nguồn bàn giao.

| Tài liệu đi kèm | Nội dung |
| --- | --- |
| [Hướng dẫn sử dụng](HUONG-DAN-SU-DUNG.md) | Các bước dành cho người xem, cán bộ quản trị và người triển khai |
| [Ảnh các giao diện](GIAO-DIEN.md) | Hình minh họa các màn hình trên điện thoại và máy tính |

## 1. Mục tiêu và đối tượng sử dụng

SafeMap giúp người dân và du khách tìm đúng địa điểm, xem thông tin cần thiết trước khi đến, liên hệ hoặc mở chỉ đường khi cần. Cán bộ được cấp quyền quản lý và rà soát dữ liệu tập trung qua trình duyệt.

| Đối tượng | Quyền và công việc chính |
| --- | --- |
| Người dân, du khách | Xem điểm công khai; tìm, lọc, xem chi tiết; định vị, chỉ đường; lưu/chia sẻ; gửi thông tin cần kiểm tra |
| Cán bộ quản trị | Quản lý địa điểm và danh mục; công khai/ẩn; nhập/xuất Excel; kiểm tra chất lượng; xử lý phản ánh; xem lịch sử và khôi phục |
| Chủ dự án/người vận hành | Quản lý tài khoản và quyền trong Firebase; cấu hình triển khai, Rules, Analytics; sao lưu và theo dõi hạn mức dịch vụ |

Giao diện quản trị không cấp quyền quản lý Firebase Console. Tài khoản cán bộ chỉ được ghi dữ liệu khi có quyền hoạt động tương ứng trong hệ thống.

## 2. Cấu trúc nhóm, danh mục và mức hỗ trợ

Mỗi địa điểm thuộc một danh mục; mỗi danh mục thuộc một nhóm. Ba mức hỗ trợ chỉ áp dụng cho danh mục **Hỗ trợ cộng đồng** trong nhóm **An toàn**.

| Nhóm | Màu nhận diện trên bản đồ | Danh mục điển hình |
| --- | --- | --- |
| An toàn | Cam | Công an, Y tế, Hành chính, Giáo dục, Hỗ trợ cộng đồng |
| Điểm xanh | Xanh lá nhạt | Môi trường, các điểm thu gom và phân loại |
| Đối tác xanh | Xanh lá đậm | Dịch vụ, cửa hàng/đơn vị hợp tác |

### 2.1. Ba mức của Hỗ trợ cộng đồng

| Mức đăng ký | Màu nhãn bổ sung | Phạm vi thông tin hiển thị |
| --- | --- | --- |
| **Safe Point** | Xanh dương | Hỗ trợ ban đầu, hướng dẫn, kết nối dịch vụ |
| **Family Friendly** | Hồng | Hỗ trợ phụ nữ/trẻ em, trẻ bị lạc, nghỉ ngơi/nước uống, kết nối dịch vụ |
| **Safe Hub** | Xanh lá | Kết nối công an, y tế, dịch vụ thiết yếu; hỗ trợ trong khả năng |

- Cán bộ chọn mức theo đăng ký và xác nhận của phường; hệ thống không tự gán mức cho điểm cũ.
- Ghim bản đồ của mọi điểm thuộc nhóm An toàn vẫn **màu cam**. Biểu tượng thể hiện danh mục; nhãn mức và bộ lọc có màu riêng như bảng trên.
- Điểm thuộc danh mục Công an hoặc Y tế không phải chọn một trong ba mức này.
- Khi thêm/sửa điểm Hỗ trợ cộng đồng bằng form, phải chọn một mức hợp lệ. Điểm cũ chưa được phân mức có thể được nhắc trong phần chất lượng dữ liệu.

## 3. Chức năng trang cộng đồng

| Mã | Chức năng | Hành vi chính |
| --- | --- | --- |
| ND-01 | Lời chào và giới thiệu | Ba slide trình bày mục đích bản đồ, cách tìm điểm và các mức hỗ trợ; chuyển slide bằng chấm điều hướng/vuốt ngang; vào bản đồ bằng cuộn xuống hoặc vuốt lên |
| ND-02 | Việt–Anh | Đổi ngôn ngữ giao diện, kể cả khi đang xem lời chào; ghi nhớ lựa chọn trên trình duyệt |
| ND-03 | Khám phá theo nhóm | Khám phá tất cả hoặc chọn An toàn, Điểm xanh, Đối tác xanh; dock mobile phản ánh nhóm đang chọn |
| ND-04 | Tìm kiếm | Tìm không dấu theo tên, địa chỉ, đơn vị phụ trách và mô tả vật liệu; kết hợp với các bộ lọc hiện có |
| ND-05 | Lọc địa điểm | Lọc danh mục, điểm đang mở, điểm đã lưu; Điểm xanh có thêm loại rác và trạng thái; Hỗ trợ cộng đồng có thêm mức hỗ trợ |
| ND-06 | Gợi ý và danh sách | Mobile xem trước tối đa sáu kết quả, có khoảng cách và ảnh hoặc biểu tượng thay thế; mở toàn bộ kết quả đã lọc khi cần |
| ND-07 | Bản đồ tương tác | Chọn ghim; phóng to/thu nhỏ; về khu vực An Thượng; định vị; chọn nền Tiêu chuẩn/Vệ tinh; đổi sáng/tối cho nền Tiêu chuẩn |
| ND-08 | Chi tiết địa điểm | Tên, danh mục/mức hỗ trợ, địa chỉ, trạng thái, ảnh, giờ hoạt động, liên hệ, đơn vị phụ trách, mô tả và thông tin dữ liệu tùy nội dung đã khai báo |
| ND-09 | Hình ảnh | Ảnh chính và tối đa năm ảnh phụ; chuyển ảnh và xem lớn; dùng biểu tượng danh mục khi thiếu hoặc lỗi ảnh |
| ND-10 | Định vị và khoảng cách | Yêu cầu quyền GPS khi mở bản đồ; lấy vị trí khi được cho phép; tính khoảng cách đường thẳng và sắp kết quả gần trước khi có GPS |
| ND-11 | Chỉ đường | Tính tuyến đến điểm, chọn điểm xuất phát nếu không có GPS; hỗ trợ xe máy, đi bộ, xe đạp, ô tô; bảng bước rẽ và chế độ bám vị trí |
| ND-12 | Liên hệ và SOS | Liên kết gọi số điện thoại đã khai báo; SOS hiển thị các đầu số 113/115/114; mở Google Maps làm phương án chỉ đường khác |
| ND-13 | Lưu địa điểm | Lưu trên trình duyệt đang dùng; tìm lại bằng bộ lọc Đã lưu, không cần tài khoản người xem |
| ND-14 | Chia sẻ/QR | Sao chép liên kết mở trực tiếp địa điểm; chia sẻ bằng thiết bị nếu hỗ trợ; tạo và tải QR |
| ND-15 | Báo thông tin chưa đúng | Gửi lý do và ghi chú cho cán bộ kiểm tra: số điện thoại, vị trí, ngừng hoạt động, giờ, loại rác hoặc nội dung khác |

### 3.1. Nguyên tắc hiển thị

- Khách chỉ nhận các điểm **công khai, chưa bị xóa**. Điểm ẩn và điểm trong thùng rác không xuất hiện trên bản đồ cộng đồng.
- Tên/địa chỉ dài được rút gọn trong danh sách; thông tin đầy đủ nằm trong chi tiết điểm. Danh mục và mức hỗ trợ được trình bày cùng hàng khi có mức.
- Tên riêng được giữ khi đổi ngôn ngữ. Nội dung tiếng Anh của từng điểm dùng dữ liệu cán bộ nhập; trường chưa có bản dịch có thể hiển thị nội dung gốc.
- Khi chưa có GPS, gợi ý tìm kiếm dùng trung tâm An Thượng làm mốc và có chú thích. Khoảng cách này không phải quãng đường chạy xe.
- Trạng thái đang mở tính theo giờ Việt Nam; lịch không rõ ràng không được tự coi là đang mở.
- Giao diện có bố cục mobile, chuyển động cho panel/danh sách và phản hồi thao tác. Các hiệu ứng hỗ trợ giảm chuyển động theo tùy chọn của thiết bị/trình duyệt.

## 4. Chức năng quản trị

| Mã | Phân hệ | Chức năng chính |
| --- | --- | --- |
| QT-01 | Đăng nhập | Firebase Email/Password; kiểm tra cán bộ còn quyền hoạt động; đăng xuất |
| QT-02 | Tổng quan điều hành | Số điểm đang quản lý, công khai/ẩn; phân bố ba nhóm và danh mục; các việc ưu tiên kiểm tra; truy cập nhanh công cụ dữ liệu |
| QT-03 | Danh sách địa điểm | Tìm kiếm, lọc nhóm/danh mục/mức hỗ trợ/trạng thái phù hợp, phân trang; mở thông tin và bản đồ của điểm |
| QT-04 | Thêm địa điểm | Nhập thông tin; chọn nhóm/danh mục; vị trí, hình ảnh, giờ/lịch, mức hỗ trợ nếu áp dụng; kiểm tra trước khi lưu |
| QT-05 | Sửa tại khung thông tin | Chuyển dữ liệu sang chế độ chỉnh sửa trong khung chi tiết; lưu hoặc hủy bản nháp |
| QT-06 | Vị trí | Nhập vĩ độ/kinh độ; chọn trên bản đồ; kéo ghim; chuyển Plus Code hợp lệ thành tọa độ |
| QT-07 | Công khai/ẩn | Quản lý việc xuất hiện ở trang cộng đồng độc lập với trạng thái hoạt động/vệ sinh |
| QT-08 | Xóa và khôi phục | Xóa mềm vào thùng rác; khôi phục về trạng thái ẩn, chưa xác minh để kiểm tra lại |
| QT-09 | Danh mục | Thêm/sửa tên Việt–Anh và biểu tượng; nhóm cố định sau khi tạo; chặn xóa danh mục còn được sử dụng |
| QT-10 | Nhập Excel | Tải mẫu, đọc `.xlsx`, xem trước lỗi/trùng; thêm mới hoặc cập nhật theo ID; chỉ ghi khi toàn bộ đợt nhập hợp lệ |
| QT-11 | Xuất Excel | Xuất thông tin địa điểm và danh mục, gồm ID và các trường hỗ trợ cập nhật dữ liệu |
| QT-12 | Lượt truy cập | Báo cáo GA4 cho bảy ngày đã kết thúc gần nhất khi đã cấu hình Analytics và API server |

Quản trị dùng **tiếng Việt**. Việc cung cấp nội dung tiếng Anh cho khách được thực hiện trong các trường dữ liệu của địa điểm/danh mục.

### 4.1. Công cụ dữ liệu

| Công cụ | Nội dung và cách xử lý |
| --- | --- |
| **Chất lượng dữ liệu** | Danh sách cần rà soát, mới cập nhật trước; tìm và lọc theo nhóm vấn đề; checklist cho từng điểm; mở chỉnh sửa; ghi nhận xác minh sau khi đối chiếu |
| **Thông tin cần kiểm tra** | Các phản ánh đã gửi; lọc chờ xử lý/đã xử lý/bỏ qua; đọc lý do và ghi chú; mở điểm liên quan, ghi kết quả, hoàn tất hoặc mở lại |
| **Lịch sử thay đổi** | Gom theo ngày, mới nhất trước; ghi hành động thêm/sửa/xóa và trường thay đổi; so sánh dữ liệu trước/sau; khôi phục một điểm hoặc toàn bộ phiên bản |
| **Thùng rác** | Sắp theo thời gian xóa mới nhất; xem tên/địa chỉ và khôi phục ở trạng thái ẩn |

Các cảnh báo chất lượng dựa trên thông tin thiếu hoặc dấu hiệu cần kiểm tra: liên hệ, vị trí, ảnh chính, giờ hoạt động, tiếng Anh, nguồn, mức hỗ trợ, vật liệu, trùng điểm và xác minh quá 90 ngày. Đây là gợi ý cho cán bộ, không tự sửa dữ liệu hay thay thế việc xác nhận thực tế.

Lịch sử chỉ trình bày so sánh khi có bản dữ liệu phù hợp; không lấy thông tin hiện tại để thay cho bản lịch sử còn thiếu. Các lượt chỉ đồng bộ định dạng được tách khỏi thay đổi nội dung. Khôi phục tạo phiên bản mới và không xóa lịch sử đã có.

## 5. Dữ liệu, quyền truy cập và đồng bộ

| Vị trí dữ liệu | Nội dung |
| --- | --- |
| `catalogs/an-thuong` | Danh mục và điểm được công bố cho khách |
| `management/an-thuong` | Dữ liệu quản lý, gồm điểm ẩn/thùng rác và rà soát nội bộ |
| `catalogHistory/{revision}` | Bản dữ liệu trước thay đổi, hành động, người cập nhật và thời điểm |
| `placeReports/{id}` | Phản ánh, trạng thái và ghi chú xử lý |
| `editors/{UID}` | Quyền cán bộ; `active: true` cho phép quản trị, `role: "superadmin"` cấp quản lý tài khoản; thiếu `role` được hiểu là tài khoản con |

- Giao dịch lưu đồng thời bản quản trị, bản công khai và lịch sử với số phiên bản. Trường hợp máy khác đã cập nhật, hệ thống yêu cầu kiểm tra dữ liệu mới trước khi lưu lại.
- Thông tin rà soát nội bộ và thông tin xóa mềm không được đưa vào bản công khai. Mọi trường còn lại trong bản công khai phải được đơn vị quản lý cho phép công bố.
- Khách gửi phản ánh bằng Firebase Anonymous Auth khi được cấu hình. Giới hạn hiện tại: một phản ánh cho mỗi địa điểm, mỗi danh tính trình duyệt, mỗi ngày UTC.
- Ảnh lưu dưới dạng **URL**, không có luồng tải ảnh lên Firebase Storage trong bản này.
- Màn hình Lịch sử thay đổi hiển thị tối đa 40 phiên bản gần nhất; phản ánh tải tối đa 100 bản gần nhất. Thống kê theo tài khoản của admin tổng đọc metadata toàn bộ lịch sử theo từng trang, không bị giới hạn ở 40 phiên bản.

## 6. Điều kiện vận hành và giới hạn

| Nội dung | Điều kiện/giới hạn hiện tại |
| --- | --- |
| Danh mục quản lý | Tối đa 200 địa điểm, 40 danh mục, 800.000 byte JSON; điểm ẩn và thùng rác cũng tính vào giới hạn |
| Kết nối | Cần Internet cho dữ liệu, nền bản đồ, tính tuyến và URL ảnh; không có chế độ offline hoàn chỉnh |
| GPS | Phụ thuộc HTTPS, quyền trình duyệt và độ chính xác thiết bị; bị từ chối quyền vẫn có thể tìm điểm/chọn nơi xuất phát thủ công |
| Dẫn đường | Tuyến, thời gian và khoảng cách là ước tính từ dịch vụ tính tuyến; không phải báo cáo giao thông trực tiếp |
| Plus Code | Giải mã trên trình duyệt; mã rút gọn dùng mốc An Thượng–Đà Nẵng; không tìm tọa độ từ tên địa danh tự do |
| Lưu điểm | Chỉ tại trình duyệt đang dùng; không đồng bộ tài khoản hoặc giữa thiết bị |
| Phản ánh | Chưa có hội thoại hai chiều/thông báo tự động cho người gửi; giới hạn danh tính ẩn danh không thay thế hệ thống chống spam đầy đủ |
| Thùng rác/lịch sử | Chưa có nút xóa vĩnh viễn hoặc tự dọn; lịch sử không thay thế bản sao lưu độc lập |
| Dịch vụ ngoài | Firebase, nền bản đồ, tính tuyến, máy chủ ảnh và GA4 chịu cấu hình/hạn mức của đơn vị cung cấp |

## 7. Phạm vi bàn giao và nghiệm thu triển khai

Tài liệu này mô tả chức năng có trong mã nguồn, không xác nhận một bản triển khai production mới đã được xuất bản. Kết quả chạy kiểm tra cần gắn với đúng bản build bàn giao; kiểm tra React DOM không thay thế kiểm tra cảm ứng và GPS trên điện thoại thật.

Khi nghiệm thu trên tên miền chính thức, đối chiếu các nhóm sau:

1. Trang khách chỉ thấy điểm công khai; số liệu/ảnh/điện thoại/giờ và mức hỗ trợ đã được phường xác nhận.
2. Tìm kiếm, lọc, mở chi tiết, lưu/chia sẻ/QR hoạt động trên mobile và máy tính.
3. Quyền GPS được xử lý khi cho phép và từ chối; chỉ đường được thử trên thiết bị thật.
4. Tài khoản cán bộ thêm/sửa/ẩn/xóa được; máy khách nhận dữ liệu tương ứng.
5. Lịch sử ghi đúng thay đổi; khôi phục về ẩn; phản ánh gửi được và xử lý được.
6. Excel hợp lệ được xem trước và nhập; tệp lỗi bị chặn trước khi ghi.
7. Firestore Rules và quyền cán bộ đúng; không có bí mật server trong mã phía trình duyệt.

Cập nhật ngày 22/11/2026: đã gỡ `/game` khỏi mã nguồn và bản build. Bản nâng cấp bổ sung admin tổng, tài khoản con và thống kê hoạt động theo người; tài khoản cán bộ cũ giữ nguyên quyền nghiệp vụ. Cần deploy mã mới, xuất bản Firestore Rules và cấp vai trò ban đầu theo [hướng dẫn kích hoạt](../QUAN_TRI_TAI_KHOAN.md).

## 8. Kiểm tra bản mã bàn giao ngày 18/11/2026

| Hạng mục | Kết quả | Phạm vi |
| --- | --- | --- |
| `npm test` | 68 bài đạt | Kiểm tra logic trong kho mã, gồm phần bản đồ và trò chơi |
| `npm run test:ui` | 205 kiểm tra đạt | React DOM với dữ liệu giả lập; có đổi ngôn ngữ trong popup, đồng bộ dock/bộ lọc, nội dung và luồng quản trị |
| `npm run test:sync` | Đạt | SDK giả lập: lưu chậm, phản hồi quan sát cũ, metadata và lỗi đăng xuất; không ghi dữ liệu thật |
| `npm run build` | Thành công | Tạo bản build trong `dist/`; còn cảnh báo dung lượng chunk của thư viện bản đồ |
| Kiểm tra trình duyệt | Đã thực hiện | Mobile 320/390 px, popup Việt–Anh, hàng danh mục/mức hỗ trợ cùng dòng, danh sách/chi tiết, header và các màn quản trị minh họa |
| Liên kết tài liệu/ảnh | Đã đối chiếu | Ba file Markdown và thư mục ảnh đi kèm |

Các kết quả trên áp dụng cho bản chạy cục bộ. GPS đang di chuyển, cuộc gọi thực tế và cấu hình trên tên miền chính thức cần được đơn vị triển khai đối chiếu khi nghiệm thu; ảnh quản trị sử dụng dữ liệu minh họa trong bộ nhớ.
