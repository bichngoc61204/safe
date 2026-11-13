# Kích hoạt các tính năng cộng đồng và quản trị SafeMap

Tài liệu dành cho người phụ trách Firebase và cán bộ thử nghiệm bản nâng cấp tháng 11/2026.

Code đã có các tính năng mới. **Người sở hữu dự án cần xuất bản tệp `firestore.rules` mới** để bật lưu dữ liệu quản trị mở rộng, lịch sử, thùng rác và phản ánh. Đăng nhập được `/admin` không đồng nghĩa tài khoản đó có quyền xuất bản Rules trong Firebase Console.

## 1. Các bước bật trên Firebase

### Xuất bản Firestore Rules

1. Mở [Firebase Console của SafeMap](https://console.firebase.google.com/project/safemap-82b28/firestore/rules) bằng tài khoản có quyền quản lý dự án.
2. Trong VS Code, mở tệp [firestore.rules](../firestore.rules) ở thư mục gốc dự án và sao chép **toàn bộ nội dung**.
3. Trong **Firestore Database → Rules**, thay nội dung trình soạn thảo bằng nội dung vừa sao chép, rồi bấm **Publish / Xuất bản**. Giữ nguyên đầy đủ phần `gameQuanRooms` nếu vẫn dùng `/game`; tệp của dự án đã bao gồm phần này.
4. Tải lại `/admin` và đăng nhập lại nếu cần. Tài khoản cán bộ phải có document `editors/{UID}` với trường `active` kiểu **boolean** bằng `true`.
5. Chọn một điểm demo, sửa một nội dung nhỏ và bấm **Lưu**. Đây phải là một thay đổi thật; bấm Lưu mà không thay đổi dữ liệu sẽ không tạo phiên bản mới.
6. Vào **Công cụ dữ liệu → Lịch sử thay đổi**. Nếu thấy phiên bản mới, luồng lưu nâng cấp đã hoạt động.

Nếu giao diện còn báo **“Cần xuất bản Firestore Rules mới…”**, kiểm tra đã chọn đúng dự án `safemap-82b28`, bấm Publish thành công và tải lại trang quản trị. Không đổi Rules thành `allow read, write: if true`.

Không cần tạo thủ công các collection `management`, `catalogHistory` hay `placeReports`. Chúng được tạo khi thao tác hợp lệ đầu tiên diễn ra. Không cần bật Realtime Database hoặc Firebase Storage cho các tính năng này: ảnh vẫn dùng URL.

### Cho khách gửi thông tin chưa đúng

1. Trong Firebase Console, mở **Authentication → Sign-in method**.
2. Bật nhà cung cấp **Anonymous / Ẩn danh** và lưu. Nếu đã bật để chơi Ô Ăn Quan thì giữ nguyên.
3. Mở trang cộng đồng bằng một cửa sổ riêng tư, chọn địa điểm → **Báo thông tin chưa đúng** → chọn lý do → gửi một ghi chú thử rõ ràng là dữ liệu kiểm tra.
4. Trong `/admin`, mở **Công cụ dữ liệu → Thông tin cần kiểm tra**, kiểm tra nội dung và đánh dấu xử lý.

Khách không phải tạo tài khoản hay nhập mật khẩu. Khi gửi, Firebase cấp một danh tính ẩn danh cho trình duyệt. Giới hạn hiện tại là một phản ánh cho mỗi địa điểm, mỗi danh tính trình duyệt, mỗi ngày UTC. Xóa dữ liệu trình duyệt hoặc dùng thiết bị khác tạo danh tính khác; đây chưa phải cơ chế chống spam hoàn chỉnh.

## 2. Dữ liệu được tách như thế nào?

| Vị trí Firestore | Nội dung | Ai đọc được? |
| --- | --- | --- |
| `catalogs/an-thuong` | Danh mục và các điểm đang công khai, không nằm trong thùng rác | Mọi người |
| `management/an-thuong` | Toàn bộ dữ liệu quản lý, gồm điểm ẩn, điểm trong thùng rác và thông tin rà soát | Cán bộ được cấp quyền |
| `catalogHistory/{revision}` | Người cập nhật, thời điểm, các trường thay đổi và bản dữ liệu trước thay đổi | Cán bộ được cấp quyền |
| `placeReports/{id}` | Phản ánh và kết quả xử lý | Cán bộ; người gửi chỉ đọc được phản ánh của chính mình |
| `editors/{UID}` | Trạng thái cấp quyền cán bộ | Tài khoản tương ứng đọc được quyền của mình; quyền được cấp từ Console |

Lần lưu có thay đổi đầu tiên sau khi xuất bản Rules sẽ tự chuyển từ mô hình cũ sang mô hình mới. Ứng dụng đọc danh mục hiện tại rồi thực hiện **một giao dịch** để lưu dữ liệu quản lý, bản công khai và lịch sử cùng số phiên bản. Dữ liệu cũ được giữ lại; không cần chạy lại script seed.

Các lần sau, thao tác ẩn/xóa chỉ loại điểm khỏi bản công khai. Thông tin đầy đủ vẫn nằm trong dữ liệu quản trị. Lịch sử không được sửa hoặc xóa qua giao diện. Nếu hai cán bộ cùng lưu từ một phiên bản cũ, hệ thống báo xung đột để người dùng kiểm tra dữ liệu mới trước khi lưu lại.

Không tự sửa riêng `catalogs/an-thuong` sau nâng cấp: Rules yêu cầu cập nhật bản quản trị, bản công khai và lịch sử cùng nhau. Dùng trang `/admin` để thực hiện thay đổi thông thường.

## 3. Tính năng dành cho người xem bản đồ

### Lưu và chia sẻ

- **Lưu địa điểm:** lưu danh sách trên chính trình duyệt đang dùng; không cần đăng nhập. Bộ lọc **Đã lưu** chỉ hiển thị những điểm đã lưu và còn công khai. Dữ liệu này không tự đồng bộ sang máy khác.
- **Chia sẻ:** sao chép liên kết mở thẳng đúng địa điểm, dùng menu chia sẻ của thiết bị nếu có hỗ trợ, hoặc tải mã QR dạng PNG.
- Liên kết có dạng `https://TEN-MIEN/?place=MA-DIA-DIEM`. Khi mở liên kết này, ứng dụng mở chi tiết điểm trực tiếp.
- QR tạo từ địa chỉ đang truy cập. QR của `localhost` hoặc `127.0.0.1` chỉ dùng trên máy đó; hãy tạo QR từ tên miền đã triển khai khi muốn đưa cho điện thoại khác quét.

### Lọc điểm đang mở và loại rác

- **Đang mở:** dựa trên lịch theo từng ngày và ngày đặc biệt, tính theo múi giờ Việt Nam. Điểm chưa có lịch rõ ràng sẽ không được suy đoán là đang mở.
- GreenPoint có thể lọc theo **pin cũ, rác điện tử, nhựa, giấy/carton, thủy tinh, kim loại, hữu cơ, rác sinh hoạt**, tùy dữ liệu đã khai báo.
- Các bộ lọc được kết hợp với nhóm, danh mục và nội dung tìm kiếm. **Hiển thị tất cả** mở toàn bộ kết quả vừa lọc, không tự xóa lựa chọn.

### Báo thông tin chưa đúng

Người xem có thể báo sai số điện thoại, vị trí, giờ hoạt động, loại rác tiếp nhận, địa điểm ngừng hoạt động hoặc nội dung khác. Ghi chú tối đa 500 ký tự. Đây là kênh kiểm tra dữ liệu, không phải kênh cấp cứu; không gửi thông tin cá nhân nhạy cảm.

## 4. Tính năng dành cho cán bộ

### Công khai, ẩn và trạng thái vệ sinh

**Hiển thị trên bản đồ** có hai giá trị **Công khai / Đang ẩn**, độc lập với trạng thái hoạt động hoặc vệ sinh. Ví dụ, một điểm cần vệ sinh vẫn có thể công khai để người dân biết; một địa điểm mới nhập có thể ẩn trong lúc xác minh.

Trong chi tiết điểm, có thể đổi nhanh công khai/ẩn hoặc bấm **Chỉnh sửa** để cập nhật tại khung thông tin hiện có. Bản mới nhập từ Excel và các điểm được khôi phục đều ở trạng thái ẩn để kiểm tra trước.

### Lịch hoạt động

1. Bật **Dùng lịch theo từng ngày** trong phần chỉnh sửa.
2. Mở phần **Lịch theo ngày**, khai báo từng ngày: **Nghỉ**, **24 giờ**, hoặc giờ mở và đóng bằng ô chọn thời gian.
3. Nếu các ngày giống nhau, điền Thứ Hai rồi dùng **Áp dụng Thứ Hai cho cả tuần**.
4. Thêm ngày lễ/lịch đặc biệt nếu cần, tối đa 24 ngày không trùng. Ngày đặc biệt thay thế lịch thông thường của ngày đó.

Giờ đóng nhỏ hơn giờ mở nghĩa là hoạt động qua nửa đêm sang hôm sau. Khi đã bật lịch theo ngày, ứng dụng dùng lịch này thay cho cặp giờ chung cũ; ghi chú giờ hoạt động vẫn có thể giữ để bổ sung thông tin.

### Chất lượng dữ liệu và xác minh

Mở **Công cụ dữ liệu → Chất lượng dữ liệu** để tìm điểm thiếu/cần kiểm tra số điện thoại, ảnh, nguồn, lịch theo ngày, nội dung tiếng Anh, vật liệu tiếp nhận hoặc có dấu hiệu trùng. Hệ thống cũng nhắc kiểm tra lại điểm chưa xác minh hoặc đã quá 90 ngày.

Các cảnh báo chỉ là gợi ý rà soát. Ví dụ, điểm hỗ trợ ở khu lân cận có thể hợp lệ dù ngoài vùng tham khảo. Chỉ chọn **Xác nhận đã kiểm tra** sau khi đã đối chiếu thông tin thực tế; không xác minh điểm demo như dịch vụ thật. Khi sửa thông tin chính, trạng thái rà soát được đưa về chưa xác minh.

### Thùng rác

Thao tác **Xóa** chuyển điểm vào thùng rác và ngừng hiển thị công khai. Khôi phục tại **Công cụ dữ liệu → Thùng rác** đưa điểm về trạng thái **ẩn, chưa xác minh**. Kiểm tra rồi công khai lại khi phù hợp.

Phiên bản này chưa có nút xóa vĩnh viễn hoặc tự dọn thùng rác. Điểm trong thùng rác vẫn chiếm một phần giới hạn dữ liệu. Danh mục vẫn đang được điểm trong thùng rác sử dụng cũng chưa thể xóa.

### Lịch sử và khôi phục

- Lịch sử bắt đầu từ lần lưu có thay đổi đầu tiên sau nâng cấp; không dựng lại được những lần sửa trước đó.
- Mỗi bản lưu ghi người cập nhật, thời điểm và những trường thay đổi. Giao diện tải tối đa 40 bản gần nhất; các bản cũ vẫn có thể còn trong Firestore.
- **Khôi phục ở trạng thái ẩn** cạnh một địa điểm lấy lại dữ liệu điểm đó trước lần thay đổi tương ứng; các điểm khác được giữ nguyên.
- **Khôi phục bản trước thay đổi này** trong phần mở rộng lấy lại **toàn bộ danh mục và danh sách địa điểm** của bản đó. Các điểm được khôi phục đều bị ẩn và đưa về chưa xác minh. Kiểm tra kỹ trước khi xác nhận thao tác này.
- Khôi phục tạo một phiên bản mới, không xóa lịch sử hiện tại. Lịch sử hỗ trợ thao tác nhầm nhưng không thay thế bản sao lưu độc lập của dự án.

### Xử lý phản ánh

Mở **Công cụ dữ liệu → Thông tin cần kiểm tra**, xem địa điểm và nội dung gửi về. Chọn **Xem / chỉnh sửa** để kiểm tra điểm, ghi chú cách xử lý, rồi chọn **Đánh dấu đã xử lý** hoặc **Bỏ qua**. Có thể **Mở lại** khi cần. Giao diện tải tối đa 100 phản ánh gần nhất. Người gửi chưa nhận thông báo hoặc trao đổi hai chiều trong phiên bản này.

## 5. Nhập và xuất Excel

1. Trong `/admin`, bấm **Nhập Excel → Tải file mẫu**.
2. Điền sheet đầu tiên. Các cột cần có là tên địa điểm, địa chỉ, mã danh mục, vĩ độ và kinh độ. Sheet **Danh mục** giúp tra mã phù hợp; sheet **Loại rác / Material types** liệt kê mã vật liệu; tạo danh mục còn thiếu trong web trước khi nhập.
3. Để mã địa điểm trống khi thêm mới. Với chế độ **Cập nhật theo ID có sẵn**, dùng đúng mã của địa điểm đang có; có thể lấy từ tệp xuất Excel.
4. Chọn tệp `.xlsx`, tối đa 2 MB và 200 dòng dữ liệu. Kiểm tra bảng xem trước. Nếu có một dòng lỗi, toàn bộ đợt nhập bị chặn; chưa có dữ liệu nào được ghi.
5. Sau khi các dòng đều hợp lệ, bấm **Xác nhận nhập**. Điểm vừa nhập/cập nhật ở trạng thái **ẩn, chưa xác minh**. Mở kiểm tra rồi công khai khi sẵn sàng.

Mặc định là **Chỉ thêm mới**: ID đã tồn tại bị báo trùng. Tên và địa chỉ trùng cũng được cảnh báo. Chế độ cập nhật không khôi phục điểm đang trong thùng rác. Kiểm tra kỹ các ô trống khi cập nhật vì cột có trong tệp có thể thay thế dữ liệu đang có.

Cột **Mã loại rác / Material type IDs** dùng các mã từ sheet loại rác, phân cách bằng `;` hoặc dấu phẩy. Nếu tệp cũ chỉ có mô tả loại rác, ứng dụng suy bộ lọc từ mô tả mới.

Ảnh chính là một URL; ảnh phụ có thể dùng nhiều URL phân cách bằng xuống dòng hoặc dấu `;`, tối đa năm ảnh phụ. Cột lịch ngày nhận `08:00-17:00`, `Nghỉ` hoặc `24/7`; nếu dùng lịch theo ngày, điền đủ cả bảy ngày. Cột ngày đặc biệt nhận `2026-12-31` để nghỉ hoặc `2026-12-31=08:00-12:00` để đổi giờ; phân cách nhiều ngày bằng `;`.

**Xuất Excel** tải tệp `.xlsx` với hai sheet địa điểm và danh mục. Tệp xuất có thông tin tham khảo như ID, lịch, nội dung Việt/Anh; tệp mẫu nhập là lựa chọn đơn giản nhất cho lần thêm dữ liệu đầu tiên.

## 6. Ba điểm demo đã thêm

Ba điểm sau đã được thêm để thử trên dữ liệu Firebase hiện có, không thay thế các điểm cũ. Chúng có chữ **Demo**, nguồn minh họa và số điện thoại giả; không phải các địa điểm dịch vụ đã được xác minh. Ảnh dùng URL minh họa, không khẳng định là ảnh chụp tại tọa độ đó.

| Mã địa điểm | Nhóm | Dùng để thử |
| --- | --- | --- |
| `demo-v2-visitor-support` | SafePoint | Chia sẻ/QR, lưu điểm, lịch 24 giờ |
| `demo-v2-green-collection` | GreenPoint | Lọc pin/nhựa/giấy, lịch 08:00–20:00 |
| `demo-v2-green-cafe` | Đối tác xanh | Ảnh chính/phụ, lịch 07:00–22:00, thông tin Việt/Anh |

Mở một điểm bằng `/?place=demo-v2-green-collection` trên tên miền đang chạy. Khi bàn giao dữ liệu chính thức, ẩn hoặc chuyển các điểm demo vào thùng rác.

## 7. Kiểm tra trước khi dùng chính thức

- Cửa sổ khách chỉ nhìn thấy điểm công khai. Thử ẩn một điểm demo, mở liên kết của điểm đó ở cửa sổ khách rồi kiểm tra thông báo không khả dụng.
- Xóa thử điểm demo, kiểm tra biến mất khỏi bản đồ, rồi khôi phục từ Thùng rác. Điểm chỉ xuất hiện lại sau khi công khai.
- Sửa giờ hoạt động, kiểm tra lịch và bộ lọc Đang mở; thử thêm một ngày nghỉ đặc biệt.
- Chia sẻ từ tên miền thật và quét QR bằng điện thoại thứ hai.
- Gửi phản ánh từ cửa sổ riêng tư, xử lý trong quản trị, rồi thử gửi lại cùng điểm trong ngày để kiểm tra giới hạn.
- Nhập một tệp mẫu hợp lệ và một tệp có lỗi để kiểm tra xem trước. Không dùng dữ liệu chính thức cho lần thử đầu.
- Mở cùng điểm trên hai cửa sổ quản trị và thử lưu sau khi bên còn lại đã cập nhật: phải nhận cảnh báo xung đột thay vì âm thầm ghi đè.

Các lệnh kiểm tra code trong thư mục dự án:

```bash
npm test
npm run test:ui
npm run build
```

Đây là kiểm thử logic, luồng giao diện và build. Kiểm tra Firestore Rules riêng cần Firebase CLI và Java 21 trở lên. Cấu hình emulator trong `firebase.json` dùng cổng 8089. Chạy:

```bash
firebase emulators:exec --only firestore --project demo-safemap "npm run test:rules"
```

Bộ kiểm tra này chỉ kết nối `127.0.0.1:8089`, dùng project giả lập `demo-safemap`; không trỏ kiểm thử quyền vào dữ liệu thật. Kiểm thử GPS khi di chuyển, cảm ứng và quyền trình duyệt vẫn cần điện thoại thực tế.

## 8. Giới hạn vận hành hiện tại

Danh mục quản lý gộp trong một document, tối đa **200 địa điểm, 40 danh mục, khoảng 800 KB JSON**. Điểm ẩn và điểm trong thùng rác cũng tính vào giới hạn. Mỗi thay đổi tạo một bản lịch sử có dữ liệu trước sửa, nên lưu trữ Firestore tăng theo thời gian. Số lượt đọc/ghi và lưu trữ chịu hạn mức của gói Firebase đang dùng; tài liệu này không cam kết vận hành miễn phí vô thời hạn.

Phản ánh hiện dùng Firebase Anonymous Auth, chưa có App Check, CAPTCHA, bộ lọc spam hoặc thông báo tự động. Việc xác minh là xác nhận thủ công của cán bộ. Các URL ảnh cần còn truy cập được và có quyền sử dụng phù hợp. Trước khi công bố rộng rãi, thay thông tin demo bằng dữ liệu được phường xác nhận và phân tài khoản riêng cho từng cán bộ.

## 9. Kết quả kiểm tra bản nâng cấp

Ngày 13/11/2026: 47 kiểm thử logic đạt, 147 kiểm tra luồng React DOM đạt và build production thành công. 13 nhóm kiểm tra quyền trên Firestore Emulator đạt, gồm giao dịch chuyển đổi, bảo vệ dữ liệu riêng, lịch sử bất biến và quyền gửi/xử lý phản ánh. Đã xem thử giao diện người dùng và quản trị trên PC 1440 px, mobile 390 px và hộp chia sẻ ở 320 px; đã thử tệp Excel thật trong trình duyệt với dòng đúng/sai và xác nhận nút nhập bị chặn khi có lỗi.

Ba điểm demo đã được ghi vào Firebase thật; không thay đổi năm điểm có sẵn. Sau khi chủ dự án xuất bản Rules, đã kiểm tra thành công 12 nhóm thao tác trên Firebase thật và gửi/xử lý phản ánh từ giao diện. Xem kết quả và các thay đổi UX/UI tại [báo cáo QA ngày 13/11/2026](QA_2026-11-13.md).
