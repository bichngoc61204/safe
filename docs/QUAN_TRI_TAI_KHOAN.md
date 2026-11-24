# Kích hoạt admin tổng và bàn giao vận hành

Cập nhật ngày 22/11/2026. Hướng dẫn áp dụng cho mã nguồn mới; cần deploy lại Vercel và hoàn tất các bước Firebase dưới đây để dùng trên website thật.

## 1. Trạng thái và phân quyền

| Tài khoản | Trạng thái | Quyền sau kích hoạt |
| --- | --- | --- |
| `safemap@gmail.com` | Đã thấy phiên admin tổng trong kiểm tra 24/11/2026; kiểm tra lại tài khoản khi bàn giao | Admin tổng: quản lý địa điểm, danh mục, công cụ dữ liệu và tài khoản con |
| `hung@gmail.com` | Tài khoản đang dùng; giữ nguyên đăng nhập và dữ liệu | Tài khoản con: đầy đủ chức năng quản lý địa điểm, danh mục và công cụ dữ liệu |

Cập nhật điều hướng 24/11/2026: **Tài khoản** nằm trong sidebar/dock của admin tổng, không còn nút trùng ở đầu trang. Dock mobile chỉ hiện icon, giữ nhãn hỗ trợ truy cập.

Admin tổng và tài khoản con có cùng quyền nghiệp vụ bản đồ. Chỉ admin tổng nhìn thấy mục **Tài khoản**, được thêm tài khoản con, khóa/mở lại quyền và xem thống kê hoạt động theo người. Không ghi mật khẩu vào tài liệu, mã nguồn, Firestore hoặc lịch sử.

Document cán bộ cũ chỉ có `active: true` vẫn hoạt động, được hiểu là tài khoản con. Không phải tạo lại tài khoản hoặc đổi mật khẩu của Hùng.

## 2. Chủ dự án kích hoạt trên Firebase Console

Thực hiện bằng tài khoản chủ dự án Firebase, không phải bằng tài khoản cán bộ đăng nhập trong SafeMap.

1. Mở đúng dự án Firebase đang dùng cho SafeMap.
2. Trong **Firestore Database → Rules**, thay nội dung bằng toàn bộ tệp [firestore.rules](../firestore.rules), rồi chọn **Publish**. Bản mới giữ quyền cán bộ hiện có, bổ sung quyền quản lý tài khoản và bỏ quyền phòng game.
3. Trong **Firestore Database → Data**, mở collection `editors`. Tạo document có ID chính xác:

   ```text
   U3YCWhmowBThCoKS2FmFSdVMYcE2
   ```

4. Điền các trường bằng đúng kiểu dữ liệu:

   | Trường | Kiểu | Giá trị |
   | --- | --- | --- |
   | `active` | boolean | `true` |
   | `role` | string | `superadmin` |
   | `email` | string | `safemap@gmail.com` |
   | `displayName` | string, tùy chọn | `Admin tổng SafeMap` |

   `active` phải là boolean, không nhập chuỗi `"true"`. UID trên đã được trả về khi tạo tài khoản trong Firebase Authentication; không tạo document theo địa chỉ email.

5. Với document UID của `hung@gmail.com`, giữ `active: true`. Có thể bổ sung `role: "editor"`, `email: "hung@gmail.com"` và tên hiển thị ngay trong Console; không cấp `superadmin` cho tài khoản con.
6. Deploy mã mới lên đúng project Vercel. Không cần thêm dịch vụ lưu ảnh hoặc biến bí mật mới cho chức năng tài khoản.
7. Đăng xuất rồi đăng nhập `/admin` bằng tài khoản admin tổng. Nút **Tài khoản** xuất hiện ở đầu trang.

Website không cho tài khoản tự nâng vai trò hoặc tạo thêm admin tổng. Việc cấp vai trò admin tổng ban đầu chỉ thực hiện bằng Firebase Console hoặc công cụ chủ dự án có quyền tương đương. Không sửa Rules thành cho phép mọi tài khoản ghi vào `editors`.

## 3. Thêm, khóa và theo dõi cán bộ

### Thêm tài khoản con

1. Admin tổng mở **Tài khoản → Thêm tài khoản**.
2. Điền tên hiển thị, email và mật khẩu; mật khẩu tối thiểu 6 ký tự, đồng thời phải đáp ứng chính sách mật khẩu của dự án Firebase nếu có cấu hình thêm.
3. Chọn **Tạo tài khoản**. Tài khoản con được cấp vai trò `editor`, có thể đăng nhập và làm việc.

Luồng tạo dùng một phiên Firebase Auth riêng chỉ giữ trong bộ nhớ, nên admin tổng không bị chuyển sang phiên của tài khoản vừa tạo. Mật khẩu chỉ gửi cho Firebase Authentication, không được lưu vào document quyền.

Nếu email đã tồn tại, cần dùng đúng mật khẩu hiện tại để liên kết. Chức năng này không đặt lại mật khẩu của một tài khoản khác. Nếu tạo đăng nhập thành công nhưng cấp quyền bị lỗi, kiểm tra Rules rồi thử lại với cùng email và mật khẩu để hoàn tất; không tạo hàng loạt tài khoản mới để thử.

### Khóa hoặc mở lại quyền

Chọn **Khóa quyền**, đọc thông báo rồi xác nhận. Firestore từ chối quyền đọc dữ liệu quản trị và ghi thay đổi khi `active` không còn là `true`; phiên đang mở sẽ nhận cập nhật quyền và rời phần quản trị. Các dữ liệu đã tải trước đó không thể bị thu hồi khỏi máy người dùng.

**Mở lại quyền** cho phép tài khoản tiếp tục công việc. Khóa quyền không xóa tài khoản Firebase Authentication, không xóa địa điểm và không làm mất nhật ký. Giao diện không cho admin tổng tự khóa mình hoặc thay đổi tài khoản admin tổng khác.

### Đọc thống kê đúng cách

- Có bộ lọc **Toàn bộ lịch sử / 30 ngày / 7 ngày**. Chọn **Làm mới** để đọc dữ liệu mới nhất.
- Thống kê đọc thông tin người thực hiện và trường thay đổi từ toàn bộ `catalogHistory`, phân trang theo số phiên bản; không bị giới hạn ở 40 phiên bản của màn hình Lịch sử thay đổi.
- Chỉ tải thông tin nhật ký cần thiết, không tải toàn bộ các bản sao danh mục trước sửa.
- **Điểm đã thêm** đếm số điểm được thêm qua các lượt lưu. Một lần nhập 10 điểm được tính 10 điểm, không phải một lần.
- **Lần sửa điểm** đếm số lần một điểm được chỉnh sửa trong nhật ký. Sửa cùng một điểm nhiều lần vẫn được tính nhiều lần. **Đổi trạng thái** là một phần của số lần sửa, không cộng hai ô để ra tổng.
- **Xóa / khôi phục** gộp thao tác xóa, đưa vào thùng rác và khôi phục. **Xem hoạt động** cho biết địa điểm, hành động, các trường thay đổi và thời gian theo múi giờ Việt Nam.
- Chỉ thống kê những hoạt động đã có trong nhật ký. Dữ liệu nạp trước khi có lịch sử không tự suy ra được người thêm; số liệu phản ánh nhật ký ứng dụng, không thay thế kiểm toán độc lập ở mức máy chủ.
- Khi tải thống kê lỗi, giao diện báo lỗi hoặc dấu `—`, không hiển thị số 0 như thể tài khoản chưa làm gì.

## 4. Kiểm tra sau kích hoạt

1. Đăng nhập `safemap@gmail.com`: nhìn thấy **Tài khoản**, danh sách admin tổng và cán bộ hiện có.
2. Đăng nhập `hung@gmail.com` trong trình duyệt khác: vẫn quản lý địa điểm/danh mục/công cụ dữ liệu, không có nút quản lý tài khoản.
3. Tạo một tài khoản cán bộ thử đã được đơn vị cho phép. Xác nhận admin tổng vẫn đang đăng nhập sau thao tác.
4. Dùng tài khoản thử thêm một điểm ẩn, chỉnh sửa và đổi trạng thái. Bấm **Làm mới** trong mục Tài khoản của admin tổng, đối chiếu tên điểm, người thực hiện và số liệu.
5. Khóa tài khoản thử khi phiên đó đang mở: không được lưu thêm hoặc đọc dữ liệu riêng. Mở lại quyền và thử đăng nhập lại.
6. Chuyển điểm thử vào thùng rác theo quy trình thông thường; xác nhận lịch sử vẫn còn.
7. Mở trang khách ở cửa sổ ẩn danh: chỉ thấy điểm được công khai. Thử tìm kiếm, mở chi tiết, ảnh và nút liên hệ.

Đây là danh sách nghiệm thu cần chạy sau deploy/Rules, không phải tuyên bố các thao tác trên dữ liệu thật đã hoàn tất.

## 5. Ảnh địa điểm vẫn dùng URL

Giữ cách nhập URL ảnh hiện tại; không kích hoạt Firebase Storage. Mỗi điểm có một ảnh chính và tối đa năm ảnh phụ. Ảnh chính xuất hiện trong danh sách, ảnh phụ nằm trong bộ ảnh.

Link **chia sẻ công khai** của Google Drive thường là trang xem tệp, chưa chắc là địa chỉ trả về ảnh để nhúng trong web. Trước khi hướng dẫn phường dùng hàng loạt, thử một ảnh: đặt quyền xem phù hợp, mở link ở cửa sổ ẩn danh, dán vào SafeMap, kiểm tra phần xem trước và trang khách trên điện thoại. Không coi việc mở được trang Drive là bằng chứng ảnh đã hiển thị được trên bản đồ. Nếu cần dùng Drive lâu dài, phải thống nhất và thử đúng định dạng URL ảnh; dịch vụ chia sẻ tệp không bảo đảm vai trò máy chủ ảnh cho website.

## 6. Gắn tên miền mới vào Vercel

Không cần chuyển dữ liệu Firebase hoặc dựng lại web từ đầu. Thao tác cấu hình thường ngắn; thời gian dùng được phụ thuộc DNS và xác minh tên miền.

1. Sau khi sở hữu tên miền, mở project Vercel → **Settings → Domains**, thêm `safemap-anthuong.com` và chọn cách dùng `www`.
2. Điền các bản ghi DNS đúng giá trị Vercel hiển thị tại nhà quản lý tên miền. Chờ báo cấu hình hợp lệ. Vercel tự cấp SSL khi xác minh DNS thành công. [Hướng dẫn Vercel](https://vercel.com/docs/domains/set-up-custom-domain)
3. Thử `/`, `/admin`, đăng nhập, ảnh, GPS và liên kết chia sẻ. Giữ link Vercel cũ hoặc cấu hình chuyển hướng, đồng thời thử giữ nguyên đường dẫn và tham số của link/QR đã phát hành. [Chuyển hướng tên miền](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting)
4. Trong Firebase Authentication, kiểm tra **Settings → Authorized domains**. Thêm tên miền mới trước khi dùng đăng nhập Google/chuyển hướng hoặc liên kết đăng nhập qua email. Với email/mật khẩu hiện tại, vẫn kiểm tra đăng nhập trên tên miền mới; không tự thay `VITE_FIREBASE_AUTH_DOMAIN` chỉ vì đổi địa chỉ web. [Firebase Auth](https://firebase.google.com/docs/auth/faq-and-troubleshooting)

Tên miền trên là lựa chọn dự kiến của chủ dự án; tài liệu này không xác nhận tên còn được đăng ký hoặc đã mua.

## 7. “Lượt truy cập” hiện đếm bằng gì?

Trong lượt kiểm tra trên Vercel ngày 22/11/2026, mục này báo **chưa kết nối Google Analytics**. Website không có bộ đếm tự tăng trong Firestore hoặc bộ số liệu mô phỏng thay thế GA4.

Luồng đã có trong mã:

- Khi bản production mở trang bản đồ công cộng và có `VITE_FIREBASE_MEASUREMENT_ID`, ứng dụng gửi sự kiện GA4 `page_view` cho đường dẫn `/` một lần trong phiên bản ứng dụng đang chạy; tải lại trang có thể tạo lần ghi mới. Vite chạy phát triển không gửi. Trang admin không được chủ động gửi như lượt xem bản đồ.
- API `/api/traffic` kiểm tra tài khoản có quyền cán bộ rồi đọc báo cáo đường dẫn `/` theo kỳ Hôm nay / 7 ngày / 30 ngày gồm hôm nay. Có thêm Realtime 30 phút, khu vực, thiết bị và tương tác địa điểm; số người trong 30 phút không phải số kết nối đang mở ngay lúc này. Kết quả lưu tạm tối đa 60 giây, quyền người đọc vẫn được kiểm tra trước mỗi lần trả dữ liệu.
- Cần cấu hình cả đo lường phía trình duyệt và quyền đọc báo cáo phía server; chỉ thêm Measurement ID chưa đủ để dashboard đọc được báo cáo.

Khi muốn bật, làm theo mục [Báo cáo lượt truy cập trong README](../README.md#báo-cáo-lượt-truy-cập): thêm `VITE_FIREBASE_MEASUREMENT_ID`, `GA4_PROPERTY_ID`, `GA4_CLIENT_EMAIL`, `GA4_PRIVATE_KEY` trên Vercel rồi deploy lại. Private key chỉ để trong biến server, không thêm tiền tố `VITE_`.

Có thể thử GA4 bằng link Vercel hiện tại trước, sau đó cập nhật cấu hình luồng dữ liệu khi dùng domain chính thức. Bản nâng cấp 24/11/2026 hỗ trợ Hôm nay / 7 ngày / 30 ngày gồm hôm nay và ô 30 phút gần nhất. Báo cáo ngày vẫn có độ trễ. Xem [hướng dẫn mới và cách bật xếp hạng địa điểm](HUONG_DAN_LUOT_TRUY_CAP.md).
