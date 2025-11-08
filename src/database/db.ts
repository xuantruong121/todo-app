// src/database/db.ts
import { openDatabaseSync } from 'expo-sqlite';

/**
 * Mở kết nối database todos.db (SQLite)
 * Hàm openDatabaseSync dùng API đồng bộ — tránh callback hell.
 */
const db = openDatabaseSync('todos.db');

/**
 * Tạo bảng todos nếu chưa có.
 * (Được gọi ngay khi module này được import)
 */
db.execSync(`
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at INTEGER
  );
`);

/**
 * (Tùy chọn) Seed 1–2 bản ghi mẫu nếu bảng trống.
 */
const seedTodos = () => {
  const rows = db.getAllSync<{ id: number }>('SELECT id FROM todos;');
  if (rows.length === 0) {
    const now = Date.now();
    db.runSync('INSERT INTO todos (title, created_at) VALUES (?, ?);', [
      'Học React Native',
      now,
    ]);
    db.runSync('INSERT INTO todos (title, created_at) VALUES (?, ?);', [
      'Viết báo cáo đồ án',
      now,
    ]);
    console.log('✅ Seeded 2 sample todos.');
  } else {
    console.log(`ℹ️ Todos table already has ${rows.length} rows.`);
  }
};

// Gọi seed khi import
seedTodos();

export default db;
