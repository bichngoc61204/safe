export const CENTER = [16.0505, 108.2435];
export const defaultCategories = [
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
  ['12','Trạm tái chế cộng đồng số 2','green','Đường An Thượng 2',16.0530,108.2456,'Nhóm tình nguyện Xanh','Giấy, Carton','clean'],
  ['13','Điểm thu gom chai thủy tinh','green','Đường An Thượng 4',16.0511,108.2472,'Tổ môi trường An Thượng 4','Chai thủy tinh','clean'],
  ['14','Góc xanh khu dân cư số 5','green','Đường An Thượng 5',16.0489,108.2441,'Tổ dân phố số 5','Chai nhựa, Lon nhôm','warning'],
  ['15','Điểm tiếp nhận dầu ăn đã qua sử dụng','green','Đường An Thượng 6',16.0478,108.2468,'Nhóm tái chế cộng đồng','Dầu ăn đã qua sử dụng','clean'],
  ['16','Trạm thu gom quần áo cũ','green','Khu dân cư phía Tây An Thượng',16.0526,108.2401,'Nhóm chia sẻ cộng đồng','Quần áo, Vải','clean'],
  ['17','Điểm thu hồi bao bì tái chế','green','Đường An Thượng 8',16.0543,108.2437,'Tổ môi trường An Thượng 8','Bao bì, Chai nhựa','inactive'],
  ['18','Điểm phân loại rác hữu cơ','green','Khu dân cư phía Nam An Thượng',16.0466,108.2421,'Tổ dân phố phía Nam','Rác hữu cơ','clean'],
  ['19','Trạm tái chế ven khu phố du lịch','green','Khu phố du lịch An Thượng',16.0502,108.2485,'Tổ môi trường du lịch','Chai nhựa, Giấy, Lon nhôm','clean'],
];
export const defaultPlaces = raw.map(([id,name,category,address,lat,lng,owner,waste='',status='active'])=>({id,name,category,address:address+', Đà Nẵng',lat,lng,owner,waste,status,phone:'',image:'',hours:'',description:'',source:'Dữ liệu minh họa',updatedAt:'2026-11-05'}));
