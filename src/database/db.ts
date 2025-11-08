// src/db.ts
import { openDatabaseSync } from 'expo-sqlite';

const db = openDatabaseSync('todos.db');

export default db;
