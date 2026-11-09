import {
  IconMap2, IconShieldCheck, IconBuildingBank, IconHeartbeat, IconSchool,
  IconBuildingStore, IconRecycle, IconLeaf, IconSearch, IconMapPin, IconNavigation,
  IconCurrentLocation, IconPlus, IconMinus, IconX, IconArrowLeft, IconArrowUpRight,
  IconChevronRight, IconChevronLeft, IconAdjustmentsHorizontal, IconLayoutDashboard,
  IconList, IconTags, IconLogout, IconPencil, IconTrash, IconPhone, IconAlertTriangle,
  IconCircleCheck, IconClock, IconWorld, IconDownload, IconMenu2, IconChevronDown,
  IconEye, IconEyeOff, IconPlant, IconBuilding, IconMail, IconLock, IconFlame,
  IconHelpCircle, IconCircleOff, IconCrosshair, IconInfoCircle, IconLayersIntersect, IconZoomIn,
  IconMotorbike, IconWalk, IconBike, IconCar, IconPhoto,
} from '@tabler/icons-react';

// Keep these keys stable for categories saved by earlier versions.
const icons = {
  map: IconMap2, shield: IconShieldCheck, landmark: IconBuildingBank, heart: IconHeartbeat,
  school: IconSchool, store: IconBuildingStore, recycle: IconRecycle, leaf: IconLeaf,
  search: IconSearch, pin: IconMapPin, navigation: IconNavigation, locate: IconCurrentLocation,
  plus: IconPlus, minus: IconMinus, x: IconX, back: IconArrowLeft, arrow: IconArrowUpRight,
  right: IconChevronRight, left: IconChevronLeft, filter: IconAdjustmentsHorizontal,
  dashboard: IconLayoutDashboard, list: IconList, tags: IconTags, logout: IconLogout,
  edit: IconPencil, delete: IconTrash, phone: IconPhone, alert: IconAlertTriangle,
  check: IconCircleCheck, clock: IconClock, globe: IconWorld, download: IconDownload,
  menu: IconMenu2, down: IconChevronDown, eye: IconEye, eyeoff: IconEyeOff,
  sprout: IconPlant, building: IconBuilding, mail: IconMail, lock: IconLock,
  fire: IconFlame, help: IconHelpCircle, off: IconCircleOff, crosshair: IconCrosshair,
  info: IconInfoCircle, layers: IconLayersIntersect, zoom: IconZoomIn,
  motorbike: IconMotorbike, walk: IconWalk, bike: IconBike, car: IconCar, image: IconPhoto,
};

export default function Icon({name,size=18,...props}) {
  const Component = Object.hasOwn(icons, name) ? icons[name] : IconMapPin;
  return <Component size={size} stroke={1.8} aria-hidden="true" {...props}/>;
}

export const categoryIconOptions=['shield','landmark','heart','school','store','recycle','leaf','building','help'];
