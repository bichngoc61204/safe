import { readFile } from 'node:fs/promises';
import { deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { catalogRefs, validateCatalog, writeCatalog } from '../src/lib/firebaseCatalog.js';
import { readFirebaseConfig } from '../src/lib/firebaseConfig.js';

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes('--write');
  const files = args.filter(arg => arg !== '--write');
  if (files.length !== 1 || files.some(arg => arg.startsWith('-'))) {
    throw new Error('Cú pháp: npm run seed:firebase -- [--write] backup.json');
  }
  const source = JSON.parse(await readFile(files[0], 'utf8'));
  const data = { categories: source.categories, places: source.places };
  validateCatalog(data);

  const summary = `${data.places.length} địa điểm, ${data.categories.length} danh mục`;
  if (!write) {
    console.log(`Kiểm tra hợp lệ: ${summary}. Dùng --write để nạp dữ liệu.`);
    return;
  }
  const { config } = readFirebaseConfig(process.env);
  const { SAFEMAP_SEED_EMAIL: email, SAFEMAP_SEED_PASSWORD: password } = process.env;
  if (!config || !email?.trim() || !password) {
    throw new Error('Cần cấu hình Firebase Web trong .env.local và tài khoản đã cấp quyền trong .seed.local.');
  }

  const refs = catalogRefs(config);
  try {
    await signInWithEmailAndPassword(getAuth(refs.app), email.trim(), password);
    await writeCatalog(refs.catalog, data, null);
    console.log(`Đã nạp ${summary} vào ${config.projectId}/catalogs/an-thuong.`);
  } finally {
    await deleteApp(refs.app);
  }
}

main().catch(error => {
  const messages = {
    catalogInvalid: 'Dữ liệu nguồn không hợp lệ.',
    catalogLimit: 'Dữ liệu vượt giới hạn kích thước hoặc số mục.',
    catalogExists: 'Dự án đã có dữ liệu SafeMap. Script dừng để giữ nguyên dữ liệu hiện có.',
    'permission-denied': 'Tài khoản chưa có quyền ghi hoặc Firestore Rules chưa được triển khai.',
    'auth/invalid-credential': 'Thông tin đăng nhập của tài khoản nạp dữ liệu không hợp lệ.',
  };
  console.error(messages[error.code || error.message] || error.code || error.message);
  process.exitCode = 1;
});
