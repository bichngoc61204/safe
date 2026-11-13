# SAFEMAP AN THƯỢNG · React + Firebase

Bản đồ số an toàn – tiện ích cộng đồng – môi trường xanh.

Dự án **React + Vite + Leaflet + MapLibre** dùng Firebase Auth và Firestore. Chạy dự án qua Vite với cấu hình Firebase trong `.env.local`.

Bản nâng cấp có lưu/chia sẻ địa điểm và QR, lịch theo ngày, bộ lọc đang mở/loại rác, phản ánh, ẩn/công khai, thùng rác, lịch sử khôi phục và nhập Excel. **Cần xuất bản `firestore.rules` mới để dùng đầy đủ phần quản trị mở rộng.** Xem [hướng dẫn kích hoạt và kiểm tra](docs/KICH_HOAT_TINH_NANG_MOI.md); chủ dự án tự xuất bản Rules từ Firebase Console.

## Chạy dự án

Cần Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in trong terminal, mặc định http://127.0.0.1:5173/.

```bash
npm test
npm run test:ui
npm run build
npm run preview
```

`dist/` là kết quả build. Chạy qua HTTP/HTTPS, không mở file bằng `file://`.

## Các màn hình đã có

- **Khám phá bản đồ:** bản đồ An Thượng tại `[16.0505, 108.2435]`, zoom 15; tìm kiếm không dấu theo tên, địa chỉ, đơn vị, vật liệu; lọc danh mục; danh sách và chi tiết địa điểm; hình ảnh tùy chọn; liên hệ; GPS; khoảng cách Haversine; chỉ đường Google Maps; SOS.
- **SafePoint:** nhóm an toàn, hành chính, y tế và giáo dục.
- **GreenPoint:** vật liệu tiếp nhận, đơn vị phụ trách, trạng thái sạch/cần vệ sinh/quá tải/tạm ngưng; lọc theo vật liệu và trạng thái.
- **Đối tác xanh:** các cửa hàng/đơn vị hợp tác, thông tin liên hệ và vật liệu tiếp nhận.
- **Quản trị tại `/admin`:** đăng nhập bằng tài khoản Firebase được cấp.
- **Tổng quan quản trị:** biểu đồ nhóm, trạng thái, điểm cần xử lý và địa điểm mới cập nhật. Tab lượt truy cập đọc báo cáo GA4 khi đã cấu hình API phía server.
- **Tất cả địa điểm và từng nhóm SafePoint, GreenPoint, Đối tác xanh:** tìm kiếm, lọc, phân trang, thêm/sửa, công khai/ẩn, chuyển vào thùng rác có xác nhận, chọn tọa độ bằng click bản đồ hoặc kéo ghim.
- **Quản lý danh mục:** thêm, đổi tên Việt/Anh, biểu tượng, màu; ngăn xóa danh mục đang chứa địa điểm. Nhóm chức năng không đổi sau khi tạo để tránh thay đổi ý nghĩa dữ liệu hiện có.
- **Công cụ dữ liệu:** cảnh báo chất lượng, xác minh thủ công, lịch sử thay đổi/khôi phục, thùng rác và xử lý phản ánh. Nhập Excel có xem trước, kiểm tra trùng và lỗi trước khi xác nhận.
- **Tiện ích cộng đồng:** lưu điểm trên trình duyệt, liên kết chia sẻ mở thẳng điểm và QR, lịch tuần/ngày đặc biệt, lọc đang mở và gửi thông tin chưa đúng.
- Chuyển Việt/Anh, bố cục responsive, danh sách dạng bottom sheet trên mobile, trạng thái rỗng, lỗi định vị/lưu dữ liệu/ảnh, xuất danh sách địa điểm và danh mục ra Excel.

## Kết nối Firebase

1. Tạo dự án Firebase và đăng ký một **Web App**. Sao chép `.env.example` thành `.env.local` rồi điền bốn trường Web config. Khi deploy lên Vercel, thêm bốn biến tương ứng ở phần Environment Variables và build lại.
2. Bật **Authentication → Sign-in method → Email/Password** và tạo Cloud Firestore ở **Production mode**. Triển khai tệp `firestore.rules` từ Firebase Console hoặc dùng `firebase deploy --only firestore:rules --project PROJECT_ID` với Firebase CLI đã đăng nhập.
3. Tạo tài khoản cán bộ trong **Authentication → Users**. Sao chép UID và tạo document `editors/{UID}` trong Firestore với trường **`active` kiểu boolean = `true`**. Đặt trường này thành `false` để thu hồi quyền. Mỗi cán bộ dùng một tài khoản riêng.
4. Với dự án mới, có thể nạp bản sao danh mục bằng script bên dưới. Bản công khai nằm trong `catalogs/an-thuong`. Lần lưu có thay đổi đầu tiên sau nâng cấp tự tạo bản riêng `management/an-thuong` và `catalogHistory/{revision}` bằng một giao dịch. Bản riêng giữ điểm ẩn/thùng rác; khách chỉ nhận điểm công khai. Không cần nạp lại dữ liệu cũ. Ảnh chính lưu trường `image`, ảnh phụ lưu trong `images`; quản trị nhận URL ảnh và bản đồ hiển thị qua slider.
5. Bật **Authentication → Sign-in method → Anonymous** nếu muốn khách gửi phản ánh. Dữ liệu nằm trong `placeReports`; khách không đọc được phản ánh của người khác. Các bước kích hoạt, kiểm tra và giới hạn nằm trong [tài liệu nâng cấp](docs/KICH_HOAT_TINH_NANG_MOI.md).

Danh mục và địa điểm được lưu cùng một document cho mỗi bản công khai/quản trị. Phiên bản hiện tại giới hạn 200 địa điểm (kể cả điểm ẩn/thùng rác), 40 danh mục và khoảng 800 KB dữ liệu JSON. Số phiên bản được kiểm tra khi lưu để phát hiện thay đổi từ máy khác. Mỗi thay đổi tạo lịch sử có bản trước sửa; cần theo dõi dung lượng Firestore khi sử dụng lâu dài. Dữ liệu công khai chỉ nên chứa thông tin địa điểm được phép công bố.

### Ô Ăn Quan trên hai điện thoại

1. Trong Firebase Console, mở **Authentication → Sign-in method → Anonymous** và bật đăng nhập ẩn danh. Người chơi nhận một danh tính tự động khi tạo hoặc vào phòng.
2. Xuất bản bản cập nhật `firestore.rules` trong **Firestore Database → Rules**. Phần `gameQuanRooms` dùng mã phòng ngẫu nhiên, khóa hai ghế theo tài khoản và giới hạn lượt ghi. Phòng hết hạn sau 24 giờ.
3. Deploy lại lên Vercel với cùng bốn biến cấu hình Firebase `VITE_FIREBASE_*` của dự án. Hai điện thoại mở cùng một tên miền tại `/game` và chọn **Ô Ăn Quan**. Máy đầu tạo phòng rồi gửi link hoặc mã 8 ký tự. Máy thứ hai mở link mời và bấm **Vào phòng**.

Mỗi lượt được kiểm tra trong giao dịch Firestore rồi đồng bộ đến hai máy. Trình duyệt dựng lại bàn từ nhật ký nước đi. Ô Ăn Quan và ba trò arcade cũng có chế độ chơi chung máy.

### Báo cáo lượt truy cập

- Liên kết dự án Firebase với Google Analytics, sau đó đặt `VITE_FIREBASE_MEASUREMENT_ID` của Web App trên Vercel và deploy lại. Bản production ghi lượt mở bản đồ công cộng. Máy phát triển dùng Vite không gửi lượt xem.
- Bật **Google Analytics Data API** trong Google Cloud, tạo service account và cấp email của tài khoản này quyền **Viewer** trong **Property access management** của GA4. Đặt ba biến server trên Vercel gồm `GA4_PROPERTY_ID` (ID thuộc tính dạng số), `GA4_CLIENT_EMAIL` và `GA4_PRIVATE_KEY`. Giữ private key trong biến bí mật phía server. Dùng `vercel dev` nếu cần chạy API cùng giao diện trên máy phát triển.
- Mở **Tổng quan → Lượt truy cập** bằng tài khoản quản trị. Báo cáo đọc số lượt xem và người dùng trong bảy ngày đã kết thúc theo múi giờ của thuộc tính GA4. API kiểm tra quyền quản trị qua Firestore và lưu tạm báo cáo trong bộ nhớ tối đa năm phút.

### Nạp bản sao danh mục

```bash
npm run seed:firebase -- backup.json
npm run seed:firebase -- --write backup.json
```

Lệnh đầu kiểm tra tệp JSON có `categories` và `places`. Lệnh thứ hai tạo danh mục trong dự án Firebase trống. Khi ghi, cần cấu hình Firebase và đặt `SAFEMAP_SEED_EMAIL`, `SAFEMAP_SEED_PASSWORD` trong `.seed.local` bằng tài khoản có quyền quản trị.

## Dữ liệu và bản đồ

- Danh mục công khai đọc từ Firestore. Ảnh chính và ảnh phụ dùng URL trên từng địa điểm. Mục còn tham chiếu ảnh mẫu đã bỏ sẽ hiện biểu tượng danh mục khi chưa có ảnh thay thế.
- SOS hiển thị đầu số khẩn cấp toàn quốc 113 / 115 / 114.
- Có hai nền bản đồ, Tiêu chuẩn (OpenFreeMap Positron) và Vệ tinh. Nền Tiêu chuẩn mặc định ưu tiên đường và tên đường, với dấu nền nhà mờ khi zoom gần. Nút mặt trời/mặt trăng đổi màu sáng tối cho nền Tiêu chuẩn. Nhãn nền được giới hạn theo vùng đất Việt Nam, còn nhãn hai quần đảo do SafeMap hiển thị. Không cần API key. Nếu thiết bị không hỗ trợ WebGL hoặc dịch vụ vector lỗi, ứng dụng dùng ảnh vệ tinh không nhãn từ nhà cung cấp.
- Bấm **Chỉ đường trên bản đồ** để xem ngay tuyến xe máy từ GPS. Nếu GPS không khả dụng, chạm bản đồ để chọn điểm xuất phát. Đổi phương tiện trong bảng tuyến, rồi bấm **Bắt đầu dẫn đường**. Đường xanh thu ngắn theo phần đường đã đi và ứng dụng tính lại tuyến nếu GPS xác nhận bạn đi lệch. Google Maps vẫn là lựa chọn thay thế.
- Cần Internet cho bản đồ vector/OSM, font và ảnh URL tùy chọn. React, Leaflet và biểu tượng được cài bằng npm, đóng gói khi build.

## Cấu trúc

```text
src/
  App.jsx                  # Khung ứng dụng và phiên Firebase
  main.jsx                 # Entry point
  styles.css               # Khung bố cục responsive
  theme.css                # Hệ màu trắng–xanh và component thị giác
  components/
    PublicApp.jsx          # Panel tìm kiếm, danh sách và chi tiết
    Admin.jsx              # Login và các màn hình quản trị
    PlaceForm.jsx          # Thêm/sửa địa điểm
    MapView.jsx             # Leaflet và bản đồ chọn tọa độ
    Modal.jsx               # Dialog truy cập bằng bàn phím
    Icon.jsx                # Bộ biểu tượng thống nhất
  lib/
    mapCenter.js            # Tọa độ mặc định
    domain.js               # Tìm kiếm, khoảng cách và kiểm tra dữ liệu
    basemap.js              # Nền vector, worker và phương án dự phòng
    domain.test.js          # Kiểm thử logic
    i18n.js                 # Từ điển Việt/Anh
```

## Kiểm tra giao diện

Xem [docs/QA.md](docs/QA.md). Đã kiểm tra bằng trình duyệt ở kích thước desktop và mobile, gồm bản đồ vector, tìm kiếm, lọc, chi tiết và bottom sheet. Các DOM test không thay thế kiểm tra trên thiết bị thực tế.

Cần xác minh danh sách địa điểm, số điện thoại và đơn vị phụ trách trước khi công bố dữ liệu cho người dân.

## Tham khảo nền bản đồ

- OpenFreeMap: https://openfreemap.org/quick_start/
- Thư viện cầu nối Leaflet: https://github.com/maplibre/maplibre-gl-leaflet
- OpenStreetMap directions: https://www.openstreetmap.org/directions

Bản đồ giữ ghi nguồn OpenStreetMap / OpenFreeMap / OpenMapTiles. Không dùng dịch vụ CARTO không key hay đưa Mapbox token vào dự án.

## Nhận diện giao diện

Giao diện trắng và xanh lá là màu chủ đạo; marker an toàn màu xanh dương, y tế đỏ hồng, hành chính/giáo dục navy, môi trường xanh lá và dịch vụ màu ấm. Icon Tabler cùng hệ nét được dùng xuyên suốt tab, card, marker và dashboard; không dùng số làm ký hiệu địa điểm. Điểm cần vệ sinh/quá tải có chấm cảnh báo nhỏ trên marker. Bố cục mobile vẫn giữ tìm kiếm phía trên và bottom sheet phía dưới.

Trên PC, khi mở địa điểm, phần giới thiệu thu gọn; thông tin kỹ thuật nằm trong mục mở rộng. Không hiển thị đồng thời popup và panel chi tiết. Chuyển động ngắn cho lọc, panel, ghim chọn và bản đồ; tự tắt khi bật Reduce Motion.

Dòng ghi nguồn bản đồ hiển thị khi tải rồi thu gọn sau 5 giây thành nút ⓘ. Nút có nhãn truy cập bằng bàn phím, mở lại đầy đủ liên kết nguồn/giấy phép; không xóa nội dung ghi nguồn.

## Lớp biển đảo

- Lớp GeoJSON riêng bổ sung đường nét đất nổi và nhãn Quần đảo Hoàng Sa / Quần đảo Trường Sa, không phụ thuộc nhãn của nền bản đồ.
- Dữ liệu tham khảo: Natural Earth 1:10m Land (v5.1.1) và Minor Islands (v4.1.0), public domain. Đã trích 39 mảnh polygon trong vùng hiển thị hai quần đảo; đây là dữ liệu bản đồ khái quát, không phải danh mục đầy đủ mọi đảo/bãi đá hay ranh giới hành chính, lãnh hải.
- Không có nút định vị biển đảo riêng. Hai tên quần đảo hiển thị như chữ địa danh thông thường, không thẻ nền hay chấm đánh dấu.
- GeoJSON nằm ở `src/data/archipelagos.geojson.json`, lớp hiển thị ở `src/lib/archipelagos.js`.
- Nguồn: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ và https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-minor-islands/ .

## Phạm vi hiển thị và nhãn bản đồ

- Mức thu nhỏ tối đa dựa trên kích thước khung, đủ nhìn Việt Nam và khu vực Hoàng Sa–Trường Sa. Vùng giới hạn camera phục vụ điều hướng trên màn hình.
- SafeMap chỉ cho phép các lớp nền đã chọn. Lớp ranh giới hành chính, ranh giới tranh chấp, ranh giới biển và tuyến phà từ nhà cung cấp bị loại khỏi kiểu hiển thị. Chế độ Vệ tinh dùng World Imagery cùng lớp nhãn đã lọc, và khi không có WebGL thì giữ ảnh vệ tinh với nhãn riêng của SafeMap.
- Các nhãn nền phải nằm trong vùng đất Việt Nam. Vùng lọc lấy từ dữ liệu khái quát Natural Earth 1:10m, dùng riêng cho việc lọc chữ. SafeMap hiển thị nhãn Việt Nam, Biển Đông, Hoàng Sa và Trường Sa trên lớp độc lập. Nhãn gần đường biên hoặc bờ biển có thể bị lược bớt do độ khái quát của nguồn.
- Nguồn dữ liệu cho vùng lọc nhãn là [Natural Earth Admin 0 – Countries](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-0-countries/). [OpenMapTiles](https://openmaptiles.org/docs/schema/) mô tả các lớp dữ liệu được lọc trước khi hiển thị.

Kết quả kiểm tra sau khi Rules đã được xuất bản và vị trí các chức năng mới: [QA 13/11/2026](docs/QA_2026-11-13.md).
