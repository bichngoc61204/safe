# SAFEMAP AN THƯỢNG · React frontend

Bản đồ số an toàn – tiện ích cộng đồng – môi trường xanh.

Dự án **React + Vite + Leaflet + MapLibre**, chưa có backend. Giai đoạn này tập trung duyệt màn hình và luồng frontend. Mã nguồn đã tách component; không còn mở trực tiếp `index.html` như bản HTML trước.

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
- **GreenPoint:** 10 điểm thu gom mẫu, vật liệu tiếp nhận, đơn vị phụ trách, trạng thái sạch/cần vệ sinh/quá tải/tạm ngưng và bộ lọc cảnh báo.
- **Đối tác xanh:** các cửa hàng/đơn vị hợp tác, thông tin liên hệ và vật liệu tiếp nhận.
- **Đăng nhập quản trị demo.**
- **Tổng quan quản trị:** thống kê, điểm cần xử lý, phân bổ danh mục và địa điểm mới cập nhật.
- **Quản lý địa điểm / GreenPoint / đối tác:** tìm kiếm, lọc, phân trang, thêm/sửa/xóa có xác nhận, chọn tọa độ bằng click bản đồ hoặc kéo ghim.
- **Quản lý danh mục:** thêm, đổi tên Việt/Anh, biểu tượng, màu; ngăn xóa danh mục đang chứa địa điểm. Nhóm chức năng không đổi sau khi tạo để tránh thay đổi ý nghĩa dữ liệu hiện có.
- Chuyển Việt/Anh, bố cục responsive, danh sách dạng bottom sheet trên mobile, trạng thái rỗng, lỗi định vị/lưu dữ liệu/ảnh, xuất bản sao JSON.

## Tài khoản trải nghiệm

- Email: `admin@safemap.vn`
- Mật khẩu: `SafeMap2026!`

Có nút điền tài khoản mẫu ngay trên màn hình đăng nhập. Đây là **đăng nhập mô phỏng phía client**, không xác thực hay phân quyền bảo mật. Phiên được lưu trong sessionStorage. Không dùng mật khẩu thật.

## Dữ liệu

- 11 địa điểm minh họa, gồm 2 GreenPoint, 6 địa điểm thuộc nhóm hỗ trợ cộng đồng, 2 đối tác xanh và 1 dịch vụ.
- Địa chỉ, tọa độ, đơn vị và trạng thái là dữ liệu phục vụ duyệt FE, chưa được xác minh thực địa. Ảnh và số điện thoại minh họa có ghi chú trong chi tiết. Chạm ảnh để mở khung xem lớn và chuyển qua các ảnh khác.
- SOS hiển thị đầu số khẩn cấp toàn quốc 113 / 115 / 114, không giả làm số trực tiếp của phường.
- Lưu dữ liệu địa điểm và danh mục chung dưới khóa `safemap-react-v2` trong localStorage. Không lưu GPS vào localStorage.
- Nếu cùng origin có dữ liệu khóa `safemap-anthuong-v1`, ứng dụng ưu tiên giữ dữ liệu cũ; không tự thêm điểm mẫu mới vào danh sách đã chỉnh sửa.
- Muốn dùng lại bộ 11 điểm: xuất JSON nếu cần giữ bản sao; xóa cả hai khóa dữ liệu ở Developer Tools → Application → Local Storage rồi tải lại. Trình duyệt/origin khác nhau có kho dữ liệu riêng.
- Không có đồng bộ thiết bị, cơ sở dữ liệu, tài khoản cán bộ thật, import OSM POI tự động.
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

Sau khi chốt FE, có thể thay lớp localStorage bằng API, xác thực và phân quyền thật. Cần chốt danh sách POI, đơn vị phụ trách, phạm vi địa lý và ngôn ngữ với khách hàng trước khi đưa vào sử dụng.

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
