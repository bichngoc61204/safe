# SafeMap An Thượng — logo khách hàng

## Bản chốt ngày 18/11/2026

- Logo hiện hành: `safemap-symbol.png` (256 × 256, nền trong suốt), dùng biểu tượng gọn và ghép chữ SafeMap / An Thượng bằng HTML như header cũ.
- Biểu tượng trình duyệt hiện hành: `../../public/safemap-icon.png` (192 × 192).
- Tông xanh dương đã làm nhạt, xanh lá tươi hơn. Các file wordmark bên dưới là bản tham chiếu trước khi khách chốt biểu tượng gọn.
- Phương pháp: imagegen tích hợp; sau đó giảm kích thước bản web bằng sips, giữ kênh alpha.

### Prompt chỉnh màu bản chốt

Use case: precise-object-edit. Edit target: attached transparent SafeMap pin-and-leaf symbol. Change ONLY the colors: lighten the blue substantially to friendly airy sky blue gradients (#7CC8EF highlights and #3C91CF midtones), remove the heavy dark navy shade. Make the leaf and small pin a fresh brighter spring green (#7ACF45 to #39B44A), vibrant but not neon yellow. Preserve exactly the original silhouette, large pin with white A, leaf outline, folded map, small pin, all geometry and white internal details. No lettering, no frame, no extra objects, no shadows. Clean crisp edges suitable for a 40px website header mark. Center and tightly frame the symbol with about 4% even margin. Actual transparent alpha background, square PNG.

## Bản tham chiếu trước khi chốt

- Logo nền trong suốt dùng chung cho header và lời chào: `safemap-an-thuong-logo.png` (640 × 320).
- Biểu tượng tab và màn hình chính: `../../public/safemap-icon.png` (192 × 192).
- Nguồn: ảnh logo khách gửi ngày 18/11/2026. Dùng công cụ imagegen tích hợp để tách nền, giữ biểu tượng và chữ; bản hiển thị được giảm kích thước để tải nhẹ hơn. Không cần dịch chữ trong logo.

## Prompt logo

Use case: background-extraction. Asset type: official SafeMap An Thượng website logo. Edit target: attached customer logo. Remove its white background to actual alpha transparency and tightly frame the horizontal logo with a small even transparent margin. Preserve the exact existing symbol, composition, typography, Vietnamese accents and colors. Preserve blue location pin with white A and green leaf, folded blue map and small green pin, navy SAFE and green MAP lettering, AN THƯỢNG subtitle, blue-green outline. Text verbatim: "SAFEMAP", "AN THƯỢNG". Clean sharp edges and improve raster clarity for a website header. Keep intentional white areas inside the logo where necessary. No new text, no new icons, no background, no shadow, no checkerboard painted into the image. Return a landscape transparent PNG, logo filling frame.

## Prompt biểu tượng

Use case: background-extraction. Asset type: SafeMap website favicon and mobile icon. Edit the supplied official logo: isolate ONLY the existing large blue map pin with its white A and green leaf, blue folded map underneath and small green pin. Remove all lettering and the frame on the right, remove white page background to real alpha transparency. Preserve the original symbol faithfully without adding objects or changing shapes/colors. Square transparent PNG, centered symbol filling 88% of the canvas, crisp clean edges and strong readability at small size. No text, no shadow, no painted checkerboard.
