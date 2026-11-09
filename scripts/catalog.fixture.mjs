import { organizeCatalog } from '../src/lib/catalogGroups.js';

const defaultCategories = [
  { id: 'safe', name: 'An toàn', nameEn: 'Safety', icon: 'shield', color: '#3788c9', kind: 'safe' },
  { id: 'admin', name: 'Hành chính', nameEn: 'Government', icon: 'landmark', color: '#817bb5', kind: 'safe' },
  { id: 'health', name: 'Y tế', nameEn: 'Healthcare', icon: 'heart', color: '#dd7683', kind: 'safe' },
  { id: 'education', name: 'Giáo dục', nameEn: 'Education', icon: 'school', color: '#9a80c0', kind: 'safe' },
  { id: 'service', name: 'Dịch vụ', nameEn: 'Services', icon: 'store', color: '#cc984f', kind: 'service' },
  { id: 'green', name: 'Môi trường', nameEn: 'Environment', icon: 'recycle', color: '#199569', kind: 'green' },
  { id: 'partner', name: 'Đối tác xanh', nameEn: 'Green partners', icon: 'leaf', color: '#7c9d52', kind: 'partner' },
];
const raw = [
  ['1','Công an Phường Mỹ An / An Thượng','safe','Khu vực Mỹ An, An Thượng',16.0512,108.2410,'Tổ hỗ trợ an toàn cộng đồng'],
  ['2','Trạm Y tế Phường','health','Khu dân cư An Thượng',16.0498,108.2425,'Trạm y tế địa phương'],
  ['3','UBND Phường','admin','Khu vực Mỹ An, An Thượng',16.0485,108.2402,'Bộ phận hành chính'],
  ['4','Điểm thu gom pin & rác điện tử','green','Đường An Thượng 1',16.0520,108.2445,'Tổ môi trường An Thượng 1','Pin, Rác điện tử','clean'],
  ['5','Điểm phân loại chai nhựa & giấy','green','Đường An Thượng 3',16.0500,108.2460,'Tổ môi trường An Thượng 3','Chai nhựa, Carton','overloaded'],
  ['6','Quán Cafe Xanh Eco','partner','Khu phố An Thượng',16.0531,108.2430,'Đối tác Eco','Chai nhựa, Ly giấy'],
  ['7','Trường Tiểu học Lê Lai','education','Khu vực An Thượng',16.0470,108.2450,'Ban giám hiệu'],
  ['8','Nhà thuốc Phước Thiện An Thượng','health','Khu phố An Thượng',16.0515,108.2455,'Nhà thuốc địa phương'],
  ['9','Điểm hỗ trợ du khách An Thượng','safe','Khu phố du lịch An Thượng',16.0540,108.2465,'Tổ hỗ trợ du khách'],
  ['10','Tạp hóa Xanh – Đổi rác lấy quà','partner','Khu vực An Thượng',16.0490,108.2480,'Tạp hóa Xanh','Chai nhựa, Lon nhôm'],
  ['11','Cửa hàng tiện lợi An Thượng','service','Khu phố An Thượng',16.0480,108.2438,'Cửa hàng địa phương'],

];
const places=raw.map(([id,name,category,address,lat,lng,owner,waste='',status='active'])=>({
  id,name,category,address:address+', Đà Nẵng',lat,lng,owner,waste,status,
  phone:`000 000 ${id.padStart(4,'0')}`,
  image:`https://example.invalid/places/${id}.jpg`,
  images:[`https://example.invalid/places/${id}-detail.jpg`],
}));
export const makeTestCatalog=()=>organizeCatalog(structuredClone({categories:defaultCategories,places}));
