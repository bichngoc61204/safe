# Xem lượt truy cập SafeMap trên tên miền Vercel

Cập nhật: 24/11/2026. Có thể thử ngay bằng https://safe-murex-eta.vercel.app/; không phải chờ mua tên miền.

## 1. Xem trước trong Google Analytics

Source đã tích hợp Google Analytics 4 qua Firebase. Không cần chèn thêm đoạn `gtag` vào HTML.

1. Mở Firebase Console, chọn đúng dự án SafeMap. Vào **Project settings → Integrations → Google Analytics** để kiểm tra hoặc bật liên kết Analytics. Nếu đã liên kết, dùng thuộc tính GA4 hiện có.
2. Mở Google Analytics của dự án. Vào **Admin → Data streams → luồng Web** của SafeMap; kiểm tra Website URL là `https://safe-murex-eta.vercel.app` khi thử trên Vercel. Sao chép **Measurement ID** dạng `G-...`.
3. Vào Vercel, chọn dự án SafeMap → **Settings → Environment Variables**. Thêm hoặc cập nhật `VITE_FIREBASE_MEASUREMENT_ID` bằng Measurement ID trên, chọn môi trường **Production**. Các biến Firebase đang dùng vẫn cần được giữ lại.
4. **Deploy/redeploy bản production sau khi lưu biến.** Vite đưa cấu hình này vào JavaScript trong lúc build; sửa biến mà chưa deploy sẽ chưa thay đổi bản đang chạy.
5. Mở link công khai trên điện thoại hoặc trình duyệt khác, vào bản đồ. Mở Google Analytics → **Reports → Realtime** để kiểm tra lượt thử sau vài phút. Báo cáo thông thường có thể cần 24–48 giờ.

Nguồn: [Firebase Analytics cho Web](https://firebase.google.com/docs/analytics/web/get-started), [kiểm tra dữ liệu GA4](https://developers.google.com/analytics/devguides/collection/ga4/troubleshoot).

### Nếu chưa thấy lượt thử

- Kiểm tra đúng dự án/thuộc tính/luồng Web và Measurement ID; kiểm tra bản production đã deploy sau khi sửa biến.
- Thử trình duyệt không chặn Analytics và có Internet. Trong DevTools → Network, yêu cầu đến `google-analytics.com/g/collect` hoặc `analytics.google.com/g/collect` trả 200/204 giúp xác nhận gửi thành công.
- Thử trang bản đồ `/`, không thử riêng `/admin`. Chạy `npm run dev` trên máy không gửi lượt xem trong cách tích hợp hiện tại.
- Không có dữ liệu hồi tố cho thời gian chưa bật thu thập.

## 2. Hiển thị số liệu ngay trong admin SafeMap

Việc gửi lượt xem và việc đọc báo cáo là hai bước riêng. Chỉ có Measurement ID thì có thể xem trong Google Analytics; để đọc trong **Tổng quan → Lượt truy cập** của SafeMap, cần cấu hình thêm:

1. Bật **Google Analytics Data API** trong Google Cloud; tạo service account.
2. Trong GA4 → **Admin → Property access management**, thêm email service account với quyền **Viewer**.
3. Thêm các biến server trong Vercel, môi trường Production:

| Biến | Nội dung |
| --- | --- |
| `GA4_PROPERTY_ID` | ID thuộc tính dạng số; không phải mã `G-...` |
| `GA4_CLIENT_EMAIL` | Email service account được cấp quyền xem thuộc tính |
| `GA4_PRIVATE_KEY` | Private key của service account |

Giữ khóa ở biến server; không thêm tiền tố `VITE_`, không đưa khóa vào Git hay tài liệu bàn giao. API còn sử dụng `VITE_FIREBASE_PROJECT_ID` hiện có để xác minh quyền tài khoản quản trị qua Firestore.

4. Deploy lại, đăng nhập SafeMap tại `/admin` → **Tổng quan → Lượt truy cập**.

Bản nâng cấp ngày 24/11/2026 có **Hôm nay / 7 ngày / 30 ngày, đều gồm hôm nay** theo múi giờ thuộc tính GA4, cùng ô **30 phút gần nhất**. API lưu tạm kết quả tối đa 60 giây, trang tự làm mới mỗi phút khi đang hiển thị. Báo cáo theo ngày có độ trễ xử lý nên lượt mới có thể hiện ở ô 30 phút trước khi hiện trong biểu đồ ngày. Lượt xem và số người dùng là hai chỉ số khác nhau; tải lại trang có thể thêm lượt xem nhưng không đồng nghĩa thêm người mới.

Xem thêm [hướng dẫn quản trị và GA4](QUAN_TRI_TAI_KHOAN.md#7-lượt-truy-cập-hiện-đếm-bằng-gì).

## 3. Phân biệt với tab Analytics của Vercel

Vercel Web Analytics là dịch vụ riêng. Source hiện chưa tích hợp `@vercel/analytics`; chỉ bấm Enable trong Vercel chưa đủ. Nếu chọn dịch vụ này, cần bật Analytics trong dự án, thêm SDK/component React theo hướng dẫn và deploy. Số liệu nằm trong dashboard Vercel, không tự chuyển vào bảng GA4 của SafeMap.

Đối với bản bàn giao hiện tại, dùng GA4 có sẵn giúp giữ một nguồn số liệu. Nguồn: [Vercel Web Analytics Quickstart](https://vercel.com/docs/analytics/quickstart).

## 4. Sau khi gắn tên miền chính thức

Tiếp tục dùng cùng thuộc tính GA4 và Measurement ID để giữ lịch sử. Cập nhật Website URL của luồng Web sang tên miền chính thức và kiểm tra Realtime lần nữa. Thống nhất một tên miền chính trong Vercel để người dùng truy cập; khi cần tách lượt thử Vercel và lượt thật, xem/lọc theo hostname trong GA4. Báo cáo SafeMap hiện cộng lượt của đường dẫn `/` trong thuộc tính, không tách riêng hostname.


## 5. Bật xếp hạng địa điểm

Bản nâng cấp gửi các sự kiện `place_open`, `route_request`, `directions_external`, `phone_click`, `place_save`, `share_place` với thông số `place_id`. Khách không cần tài khoản Firebase để gửi thống kê. Không gửi GPS, số điện thoại khách, email, tên người dùng hoặc từ khoá tìm kiếm qua các sự kiện này.

Trong giao diện GA4 tiếng Việt:

1. **Quản trị → Hiển thị dữ liệu → Định nghĩa tuỳ chỉnh**.
2. Chọn **Tạo phương diện tuỳ chỉnh**.
3. Điền **Tên phương diện: Mã địa điểm**; **Phạm vi: Sự kiện**; **Thông số sự kiện: `place_id`**.
4. Lưu. Nếu thông số chưa có trong danh sách, nhập trực tiếp đúng `place_id`.
5. Deploy source mới, mở bản đồ công khai và mở thử một địa điểm. Có thể kiểm tra sự kiện trong Realtime; bảng xếp hạng theo phương diện mới thường cần 24–48 giờ để GA4 xử lý.

Không cần tạo thêm chỉ số tuỳ chỉnh hay API key cho bước này. Email service account vẫn chỉ cần quyền Người xem. Nếu chưa khai báo phương diện, tổng truy cập, khu vực, thiết bị và tổng thao tác vẫn dùng được; ô xếp hạng hiện hướng dẫn cấu hình thay vì báo lỗi toàn trang.

Nguồn: [phương diện sự kiện qua Data API](https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema#custom_dimensions), [thời gian xử lý phương diện tuỳ chỉnh](https://support.google.com/analytics/answer/14240153?hl=vi).

## 6. Đọc các phần trên dashboard

- **Hoạt động gần đây:** người dùng có sự kiện trang/tương tác SafeMap trong 30 phút, không phải số kết nối đang mở ngay lúc này. Báo cáo Realtime theo toàn thuộc tính GA4; dùng thuộc tính dành riêng SafeMap để tránh trộn website khác. Biểu đồ phút đếm sự kiện `page_view`.
- **Nhịp truy cập:** lượt xem bản đồ `/` theo ngày. Số người dùng được GA4 tính trên toàn kỳ, không cộng số người từng ngày để thay thế tổng.
- **Khách truy cập từ đâu:** tối đa 10 thành phố/khu vực do GA4 ước tính, không định vị GPS đến từng phường/đường. Một người đi qua nhiều khu vực có thể xuất hiện ở nhiều hàng.
- **Khách dùng SafeMap thế nào:** mở chi tiết, yêu cầu chỉ đường trong web, mở Google Maps, bấm gọi, lưu điểm, mở khung chia sẻ/QR. Đây là thao tác yêu cầu, không xác nhận cuộc gọi, chuyến đi hoặc lượt chia sẻ đã hoàn tất.
- **Địa điểm được quan tâm:** tối đa 20 điểm theo lần mở chi tiết. Dữ liệu cũ chưa ghi sự kiện không thể dựng lại. Tên và địa chỉ lấy từ danh bạ hiện tại; các điểm đã xóa không còn nút mở quản trị. Chỉ đường trong bảng cộng yêu cầu trong web và mở Google Maps.
- **Bản đồ mức độ quan tâm:** vị trí các điểm trong bảng, vòng tròn lớn hơn nghĩa là nhiều lượt mở hơn. Không vẽ vị trí của khách; các điểm không còn tọa độ hợp lệ sẽ không được vẽ.
- **Thiết bị truy cập:** số người dùng theo điện thoại, máy tính, máy tính bảng; không phải số thiết bị vật lý đã xác minh.

GA4 có thể bị chặn bởi trình duyệt/tiện ích hoặc áp dụng ngưỡng dữ liệu. Số người dùng là số liệu ước tính theo cơ chế GA4, không phải danh sách người thật đã xác minh. Một người đổi trình duyệt/thiết bị có thể được tính khác nhau. Không cần tạo tài khoản hay nhập thông tin cá nhân chỉ để xem bản đồ.
