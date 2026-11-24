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

Báo cáo trong SafeMap là **bảy ngày đã kết thúc, đến hết hôm qua** theo múi giờ thuộc tính GA4; API lưu tạm kết quả tối đa năm phút. Vì vậy lượt vừa thử hôm nay cần xem bằng **Realtime**, chưa xuất hiện ngay trong bảng này. Lượt xem và số người dùng là hai chỉ số khác nhau; tải lại trang có thể thêm lượt xem nhưng không đồng nghĩa thêm người mới.

Xem thêm [hướng dẫn quản trị và GA4](QUAN_TRI_TAI_KHOAN.md#7-lượt-truy-cập-hiện-đếm-bằng-gì).

## 3. Phân biệt với tab Analytics của Vercel

Vercel Web Analytics là dịch vụ riêng. Source hiện chưa tích hợp `@vercel/analytics`; chỉ bấm Enable trong Vercel chưa đủ. Nếu chọn dịch vụ này, cần bật Analytics trong dự án, thêm SDK/component React theo hướng dẫn và deploy. Số liệu nằm trong dashboard Vercel, không tự chuyển vào bảng GA4 của SafeMap.

Đối với bản bàn giao hiện tại, dùng GA4 có sẵn giúp giữ một nguồn số liệu. Nguồn: [Vercel Web Analytics Quickstart](https://vercel.com/docs/analytics/quickstart).

## 4. Sau khi gắn tên miền chính thức

Tiếp tục dùng cùng thuộc tính GA4 và Measurement ID để giữ lịch sử. Cập nhật Website URL của luồng Web sang tên miền chính thức và kiểm tra Realtime lần nữa. Thống nhất một tên miền chính trong Vercel để người dùng truy cập; khi cần tách lượt thử Vercel và lượt thật, xem/lọc theo hostname trong GA4. Báo cáo SafeMap hiện cộng lượt của đường dẫn `/` trong thuộc tính, không tách riêng hostname.
