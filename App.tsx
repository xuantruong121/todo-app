// App.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Pressable,
  Modal,
  Alert,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import db from './src/database/db';

interface Todo {
  id: number;
  title: string;
  done: number;
  created_at: number;
}

function TodoListScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  // modal states
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // sync states
  const [syncing, setSyncing] = useState(false);

  // ---------- Load todos ----------
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

  const onRefresh = () => {
    setRefreshing(true);
    loadTodos();
  };

  // ---------- Add / Edit ----------
  const handleAddTodo = useCallback(() => {
    if (!newTitle.trim()) {
      Alert.alert('Cảnh báo', 'Tiêu đề không được để trống!');
      return;
    }
    try {
      const now = Date.now();
      db.runSync('INSERT INTO todos (title, created_at) VALUES (?, ?);', [
        newTitle.trim(),
        now,
      ]);
      setNewTitle('');
      setShowModal(false);
      loadTodos();
    } catch (err) {
      console.error('Lỗi khi thêm todo:', err);
      Alert.alert('Lỗi', 'Không thể thêm công việc!');
    }
  }, [newTitle, loadTodos]);

  const handleEditTodo = useCallback(() => {
    if (!newTitle.trim()) {
      Alert.alert('Cảnh báo', 'Tiêu đề không được để trống!');
      return;
    }
    if (!editingTodo) return;
    try {
      db.runSync('UPDATE todos SET title = ? WHERE id = ?;', [
        newTitle.trim(),
        editingTodo.id,
      ]);
      setEditingTodo(null);
      setNewTitle('');
      setShowModal(false);
      loadTodos();
    } catch (err) {
      console.error('Lỗi khi sửa todo:', err);
      Alert.alert('Lỗi', 'Không thể cập nhật công việc!');
    }
  }, [newTitle, editingTodo, loadTodos]);

  // ---------- Toggle done ----------
  const toggleDone = useCallback(
    (todo: Todo) => {
      try {
        const newDone = todo.done === 1 ? 0 : 1;
        db.runSync('UPDATE todos SET done = ? WHERE id = ?;', [newDone, todo.id]);
        setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t)));
      } catch (err) {
        console.error('Lỗi toggle done:', err);
      }
    },
    [setTodos]
  );

  // ---------- Delete ----------
  const handleDeleteTodo = useCallback((todo: Todo) => {
    Alert.alert('Xác nhận xóa', `Bạn có chắc muốn xóa:\n"${todo.title}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          try {
            db.runSync('DELETE FROM todos WHERE id = ?;', [todo.id]);
            setTodos((prev) => prev.filter((t) => t.id !== todo.id));
          } catch (err) {
            console.error('Lỗi khi xóa todo:', err);
            Alert.alert('Lỗi', 'Không thể xóa công việc!');
          }
        },
      },
    ]);
  }, []);

  // ---------- Sync from API (Import once) ----------
  // Replace API_URL with your actual endpoint. Example uses jsonplaceholder for demo:
  const API_URL = 'https://683097576205ab0d6c39b6ae.mockapi.io/todos';

  const handleSyncFromApi = useCallback(async () => {
    setSyncing(true);
    try {
      // fetch remote todos
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const remote: Array<{ title?: string; completed?: boolean; id?: number }> = await res.json();

      // get existing titles from DB (lowercased) to avoid duplicates by title
      const existing = db.getAllSync<{ title: string }>('SELECT title FROM todos;').map(r =>
        (r.title || '').trim().toLowerCase()
      );
      const existingSet = new Set(existing);

      let inserted = 0;
      const now = Date.now();

      // Iterate and insert if title not exists
      for (const item of remote) {
        const title = (item.title || '').trim();
        if (!title) continue;
        const lc = title.toLowerCase();
        if (existingSet.has(lc)) continue; // skip duplicates
        // map completed -> done
        const done = item.completed ? 1 : 0;
        db.runSync('INSERT INTO todos (title, done, created_at) VALUES (?, ?, ?);', [
          title,
          done,
          now,
        ]);
        existingSet.add(lc);
        inserted++;
      }

      if (inserted > 0) {
        Alert.alert('Đồng bộ xong', `Đã thêm ${inserted} mục mới từ API.`);
        loadTodos();
      } else {
        Alert.alert('Đồng bộ xong', 'Không có mục mới để thêm.');
      }
    } catch (err) {
      console.error('Lỗi khi đồng bộ từ API:', err);
      Alert.alert('Lỗi đồng bộ', String(err));
    } finally {
      setSyncing(false);
    }
  }, [API_URL, loadTodos]);

  // ---------- Search (useMemo) ----------
  const filteredTodos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return todos;
    return todos.filter((t) => t.title.toLowerCase().includes(term));
  }, [search, todos]);

  // ---------- Render item ----------
  const renderItem = useCallback(
    ({ item }: { item: Todo }) => (
      <Pressable
        onPress={() => toggleDone(item)}
        style={[styles.todoItem, item.done ? styles.todoItemDone : null]}
      >
        <View style={styles.todoContent}>
          <Text style={[styles.todoTitle, item.done ? styles.done : null]}>
            {item.title}
          </Text>

          <View style={styles.actions}>
            <Pressable
              style={styles.editButton}
              onPress={() => {
                setEditingTodo(item);
                setNewTitle(item.title);
                setShowModal(true);
              }}
            >
              <Text style={styles.editButtonText}>✎</Text>
            </Pressable>

            <Pressable style={styles.deleteButton} onPress={() => handleDeleteTodo(item)}>
              <Text style={styles.deleteButtonText}>🗑</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.todoDate}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
      </Pressable>
    ),
    [toggleDone, handleDeleteTodo]
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header row: Sync button (left), title center, add button right */}
      {/* 🔹 Header */}
      <View style={styles.headerRow}>
        {/* Nút đồng bộ API (bên trái) */}
        <Pressable
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={handleSyncFromApi}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncText}>Đồng bộ API</Text>
          )}
        </Pressable>

        {/* Tiêu đề ở giữa */}
        <Text style={styles.headerTitle}>Danh sách công việc</Text>

        {/* Nút thêm (bên phải) */}
        <Pressable
          style={styles.addButton}
          onPress={() => {
            setEditingTodo(null);
            setNewTitle('');
            setShowModal(true);
          }}
        >
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {/* Search */}
      <TextInput placeholder="Tìm kiếm công việc..." style={styles.searchInput} value={search} onChangeText={setSearch} />

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : filteredTodos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{search ? 'Không tìm thấy công việc nào' : 'Chưa có việc nào'}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTodos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Modal add/edit */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editingTodo ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</Text>
            <TextInput style={styles.input} placeholder="Nhập tiêu đề công việc..." value={newTitle} onChangeText={setNewTitle} />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => { setShowModal(false); setNewTitle(''); setEditingTodo(null); }}>
                <Text style={styles.modalButtonText}>Hủy</Text>
              </Pressable>
              <Pressable style={[styles.modalButton, styles.saveButton]} onPress={editingTodo ? handleEditTodo : handleAddTodo}>
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>{editingTodo ? 'Lưu thay đổi' : 'Thêm mới'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <TodoListScreen />
    </SafeAreaProvider>
  );
}

// (styles same as before, include syncButton styles)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 👈 phân bố đều 3 phần tử
    marginBottom: 12,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#007AFF',
  },
  syncButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  syncButtonDisabled: { backgroundColor: '#95d6a0' },
  syncText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  addButton: {
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  searchInput: { backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 12, paddingVertical: 8, fontSize: 16, marginBottom: 10 },
  todoItem: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  todoItemDone: { backgroundColor: '#e6f4ea' },
  todoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todoTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  done: { textDecorationLine: 'line-through', color: '#999' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButton: { backgroundColor: '#f1f3f5', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  editButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  deleteButton: { backgroundColor: '#ffe3e3', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 4 },
  deleteButtonText: { fontSize: 16, color: '#d32f2f', fontWeight: '700' },
  todoDate: { fontSize: 12, color: '#666', marginTop: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 16 },
  modalContainer: { width: '100%', backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, fontSize: 16, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between' },
  modalButton: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#e9ecef', marginRight: 8 },
  saveButton: { backgroundColor: '#007AFF', marginLeft: 8 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});
