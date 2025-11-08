// src/hooks/useTodos.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert } from 'react-native';
import db from '../database/db';

export interface Todo {
  id: number;
  title: string;
  done: number;
  created_at: number;
}

const API_URL = 'https://683097576205ab0d6c39b6ae.mockapi.io/todos';

export default function useTodos() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');

  // 🧩 Load danh sách
  const loadTodos = useCallback(() => {
    try {
      const data = db.getAllSync<Todo>('SELECT * FROM todos ORDER BY id DESC;');
      setTodos(data);
    } catch (e) {
      console.error('Lỗi load todos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // 🌀 Refresh list
  const refresh = useCallback(() => {
    setRefreshing(true);
    loadTodos();
  }, [loadTodos]);

  // ➕ Thêm mới
  const addTodo = useCallback(
    (title: string) => {
      if (!title.trim()) {
        Alert.alert('Cảnh báo', 'Tiêu đề không được để trống!');
        return;
      }
      const now = Date.now();
      db.runSync('INSERT INTO todos (title, created_at) VALUES (?, ?);', [title.trim(), now]);
      loadTodos();
    },
    [loadTodos]
  );

  // ✏️ Sửa
  const editTodo = useCallback(
    (id: number, title: string) => {
      if (!title.trim()) {
        Alert.alert('Cảnh báo', 'Tiêu đề không được để trống!');
        return;
      }
      db.runSync('UPDATE todos SET title = ? WHERE id = ?;', [title.trim(), id]);
      loadTodos();
    },
    [loadTodos]
  );

  // ✅ Toggle done
  const toggleDone = useCallback((todo: Todo) => {
    const newDone = todo.done === 1 ? 0 : 1;
    db.runSync('UPDATE todos SET done = ? WHERE id = ?;', [newDone, todo.id]);
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t)));
  }, []);

  // 🗑 Xóa có xác nhận
  const deleteTodo = useCallback((todo: Todo) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa:\n"${todo.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          db.runSync('DELETE FROM todos WHERE id = ?;', [todo.id]);
          setTodos((prev) => prev.filter((t) => t.id !== todo.id));
        },
      },
    ]);
  }, []);

  // 🔄 Đồng bộ API (Import once)
  const importFromApi = useCallback(async () => {
    setSyncing(true);
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote: Array<{ title?: string; completed?: boolean }> = await res.json();

      const existing = db
        .getAllSync<{ title: string }>('SELECT title FROM todos;')
        .map((r) => r.title.trim().toLowerCase());
      const existingSet = new Set(existing);

      let inserted = 0;
      const now = Date.now();

      for (const item of remote) {
        const title = (item.title || '').trim();
        if (!title || existingSet.has(title.toLowerCase())) continue;
        db.runSync('INSERT INTO todos (title, done, created_at) VALUES (?, ?, ?);', [
          title,
          item.completed ? 1 : 0,
          now,
        ]);
        existingSet.add(title.toLowerCase());
        inserted++;
      }

      Alert.alert('Đồng bộ API', inserted ? `Thêm ${inserted} mục mới!` : 'Không có mục mới.');
      loadTodos();
    } catch (err) {
      console.error('Lỗi import API:', err);
      Alert.alert('Lỗi', String(err));
    } finally {
      setSyncing(false);
    }
  }, [loadTodos]);

  // 🔍 Lọc theo search
  const filteredTodos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return todos;
    return todos.filter((t) => t.title.toLowerCase().includes(term));
  }, [search, todos]);

  return {
    todos: filteredTodos,
    rawTodos: todos,
    loading,
    refreshing,
    syncing,
    search,
    setSearch,
    loadTodos,
    refresh,
    addTodo,
    editTodo,
    toggleDone,
    deleteTodo,
    importFromApi,
  };
}
