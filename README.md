# SAFEMAP AN THƯỢNG · React frontend

Bản đồ số an toàn – tiện ích cộng đồng – môi trường xanh.

Dự án **React + Vite + Leaflet + MapLibre** hỗ trợ Firebase Auth và Firestore. Khi chưa có cấu hình Firebase, ứng dụng chạy bản demo cục bộ. Chạy dự án qua Vite.

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
- **GreenPoint:** 2 điểm thu gom mẫu, vật liệu tiếp nhận, đơn vị phụ trách, trạng thái sạch/cần vệ sinh/quá tải/tạm ngưng và bộ lọc cảnh báo.
- **Đối tác xanh:** các cửa hàng/đơn vị hợp tác, thông tin liên hệ và vật liệu tiếp nhận.
- **Quản trị tại `/admin`:** đăng nhập Firebase khi đã cấu hình, hoặc đăng nhập demo khi chạy cục bộ.
- **Tổng quan quản trị:** biểu đồ nhóm, trạng thái, điểm cần xử lý và địa điểm mới cập nhật. Tab lượt truy cập mở Firebase Console để xem nguồn thống kê khi đã cấu hình.
- **Tất cả địa điểm và từng nhóm SafePoint, GreenPoint, Đối tác xanh:** tìm kiếm, lọc, phân trang, thêm/sửa/xóa có xác nhận, chọn tọa độ bằng click bản đồ hoặc kéo ghim.
- **Quản lý danh mục:** thêm, đổi tên Việt/Anh, biểu tượng, màu; ngăn xóa danh mục đang chứa địa điểm. Nhóm chức năng không đổi sau khi tạo để tránh thay đổi ý nghĩa dữ liệu hiện có.
- Chuyển Việt/Anh, bố cục responsive, danh sách dạng bottom sheet trên mobile, trạng thái rỗng, lỗi định vị/lưu dữ liệu/ảnh, xuất danh sách địa điểm và danh mục ra Excel.

## Kết nối Firebase

1. Tạo dự án Firebase và đăng ký một **Web App**. Sao chép `.env.example` thành `.env.local` rồi điền bốn trường Web config. Khi deploy lên Vercel, thêm bốn biến tương ứng ở phần Environment Variables và build lại.
2. Bật **Authentication → Sign-in method → Email/Password** và tạo Cloud Firestore ở **Production mode**. Triển khai tệp `firestore.rules` từ Firebase Console hoặc dùng `firebase deploy --only firestore:rules --project PROJECT_ID` với Firebase CLI đã đăng nhập.
3. Tạo tài khoản cán bộ trong **Authentication → Users**. Sao chép UID và tạo document `editors/{UID}` trong Firestore với trường **`active` kiểu boolean = `true`**. Đặt trường này thành `false` để thu hồi quyền. Mỗi cán bộ dùng một tài khoản riêng.
4. Nạp dữ liệu ban đầu bằng script bên dưới. Danh mục và địa điểm dùng chung nằm trong document `catalogs/an-thuong`. Ai cũng đọc được document công khai này. Chỉ tài khoản được cấp quyền mới được cập nhật. Ảnh chính lưu trường `image`, ảnh phụ lưu trong `images`. Trang quản trị nhận link ảnh, và bản đồ hiển thị các link qua slider hiện có.

Danh mục và địa điểm được lưu cùng một document để đồng bộ trong một lần đọc và cập nhật nhất quán. Phiên bản hiện tại giới hạn 200 địa điểm, 40 danh mục và khoảng 800 KB dữ liệu JSON. Số phiên bản được kiểm tra khi lưu để phát hiện thay đổi từ máy khác. Dữ liệu công khai chỉ nên chứa thông tin địa điểm được phép công bố.

### Nạp dữ liệu bằng JavaScript

```bash
npm run seed:firebase
npm run seed:firebase -- --write
```

Lệnh đầu kiểm tra bộ dữ liệu mẫu trong `src/lib/data.js`. Lệnh có `--write` ghi vào dự án được cấu hình. Để đăng nhập khi nạp dữ liệu, đặt `SAFEMAP_SEED_EMAIL` và `SAFEMAP_SEED_PASSWORD` trong tệp riêng `.seed.local`. Hai tệp `.env.local` và `.seed.local` được Git bỏ qua. Tài khoản nạp dữ liệu phải có document editor đang bật.

Nếu đã có bản sao JSON từ phiên bản trước, chạy `npm run seed:firebase -- --write đường-dẫn-backup.json` thay cho lệnh nạp mẫu. Script chỉ tạo danh sách lần đầu và dừng nếu dự án đã có dữ liệu.

## Tài khoản trải nghiệm

- Email: `admin@safemap.vn`
- Mật khẩu: `SafeMap2026!`

Có nút điền tài khoản mẫu ngay trên màn hình đăng nhập. Đây là **đăng nhập mô phỏng phía client**, không xác thực hay phân quyền bảo mật. Phiên được lưu trong sessionStorage. Không dùng mật khẩu thật.

## Dữ liệu và bản đồ

- 11 địa điểm minh họa, gồm 2 GreenPoint, 6 địa điểm thuộc nhóm hỗ trợ cộng đồng, 2 đối tác xanh và 1 dịch vụ.
- Địa chỉ, tọa độ, đơn vị và trạng thái là dữ liệu phục vụ duyệt FE, chưa được xác minh thực địa. Ảnh và số điện thoại minh họa có ghi chú trong chi tiết. Chạm ảnh để mở khung xem lớn và chuyển qua các ảnh khác.
- SOS hiển thị đầu số khẩn cấp toàn quốc 113 / 115 / 114, không giả làm số trực tiếp của phường.
- Bản demo lưu dữ liệu địa điểm và danh mục dưới khóa `safemap-react-v2` trong localStorage. GPS chạy trong phiên trình duyệt.
- Nếu cùng origin có dữ liệu khóa `safemap-anthuong-v1`, ứng dụng ưu tiên giữ dữ liệu cũ; không tự thêm điểm mẫu mới vào danh sách đã chỉnh sửa.
- Muốn dùng lại bộ 11 điểm: xuất JSON nếu cần giữ bản sao; xóa cả hai khóa dữ liệu ở Developer Tools → Application → Local Storage rồi tải lại. Trình duyệt/origin khác nhau có kho dữ liệu riêng.
- Khi bật Firebase, các thiết bị đọc cùng một danh mục Firestore. Dữ liệu bản demo chỉ được chuyển lên khi người vận hành chọn tệp JSON đã xuất và chạy script nạp.
- Nền mặc định: Tối giản (OpenFreeMap Positron). Có thể đổi sang bản đồ màu hoặc ảnh vệ tinh. Chỉ lọc nhãn nền trong hai vùng hiển thị Hoàng Sa–Trường Sa. Không cần API key. Nếu thiết bị không hỗ trợ WebGL hoặc dịch vụ vector lỗi, ứng dụng dùng ảnh vệ tinh không nhãn; không quay lại nền OSM có chữ.
- Bấm **Chỉ đường trên bản đồ** để xem ngay tuyến xe máy từ GPS. Nếu GPS không khả dụng, chạm bản đồ để chọn điểm xuất phát. Đổi phương tiện trong bảng tuyến, rồi bấm **Bắt đầu dẫn đường**. Đường xanh thu ngắn theo phần đường đã đi và ứng dụng tính lại tuyến nếu GPS xác nhận bạn đi lệch. Google Maps vẫn là lựa chọn thay thế.
- Cần Internet cho bản đồ vector/OSM, font và ảnh URL tùy chọn. React, Leaflet và biểu tượng được cài bằng npm, đóng gói khi build.

## Cấu trúc

```text
src/
  App.jsx                  # Khung ứng dụng và phiên demo
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
    data.js                 # Mock data và danh mục
    domain.js               # Tìm kiếm, khoảng cách, validation, lưu trữ
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

Giao diện trắng và xanh lá là màu chủ đạo; marker an toàn màu xanh dương, y tế đỏ hồng, hành chính/giáo dục navy, môi trường xanh lá và dịch vụ màu ấm. Icon Lucide cùng hệ nét được dùng xuyên suốt tab, card, marker và dashboard; không dùng số làm ký hiệu địa điểm. Điểm cần vệ sinh/quá tải có chấm cảnh báo nhỏ trên marker. Bố cục mobile vẫn giữ tìm kiếm phía trên và bottom sheet phía dưới.

Trên PC, khi mở địa điểm, phần giới thiệu thu gọn; thông tin kỹ thuật nằm trong mục mở rộng. Không hiển thị đồng thời popup và panel chi tiết. Chuyển động ngắn cho lọc, panel, ghim chọn và bản đồ; tự tắt khi bật Reduce Motion.

Dòng ghi nguồn bản đồ hiển thị khi tải rồi thu gọn sau 5 giây thành nút ⓘ. Nút có nhãn truy cập bằng bàn phím, mở lại đầy đủ liên kết nguồn/giấy phép; không xóa nội dung ghi nguồn.

## Lớp biển đảo

- Lớp GeoJSON riêng bổ sung đường nét đất nổi và nhãn Quần đảo Hoàng Sa / Quần đảo Trường Sa, không phụ thuộc nhãn của nền bản đồ.
- Dữ liệu tham khảo: Natural Earth 1:10m Land (v5.1.1) và Minor Islands (v4.1.0), public domain. Đã trích 61 mảnh polygon trong vùng hiển thị hai quần đảo; đây là dữ liệu bản đồ khái quát, không phải danh mục đầy đủ mọi đảo/bãi đá hay ranh giới hành chính, lãnh hải.
- Không có nút định vị biển đảo riêng. Hai tên quần đảo hiển thị như chữ địa danh thông thường, không thẻ nền hay chấm đánh dấu.
- GeoJSON nằm ở `src/data/archipelagos.geojson.json`, lớp hiển thị ở `src/lib/archipelagos.js`.
- Nguồn: https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-land/ và https://www.naturalearthdata.com/downloads/10m-physical-vectors/10m-minor-islands/ .

## Nhãn theo khu vực

- Các địa danh và tên đường ở Đà Nẵng cũng như ngoài hai vùng biển đảo được giữ nguyên.
- Chỉ nhãn của nhà cung cấp nằm trong hai vùng hiển thị Hoàng Sa–Trường Sa bị lọc bằng biểu thức địa lý `within`; đây là vùng lọc nhãn, không phải ranh giới hành chính/lãnh hải.
- Nhãn tiếng Việt Hoàng Sa–Trường Sa và các POI SafeMap nằm trên lớp riêng nên vẫn hiển thị.
- Chế độ vệ tinh dùng World Imagery cùng lớp nhãn vector áp dụng bộ lọc tương tự. Nguồn ảnh: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer .
- Khi WebGL không khả dụng, ảnh vệ tinh vẫn hiển thị nhưng không có lớp nhãn vector.
