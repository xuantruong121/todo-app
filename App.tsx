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
  const [search, setSearch] = useState(''); // 🔍 Search text

  // Modal thêm & sửa
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // 📦 Load todos từ SQLite
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

  // 🌀 Refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadTodos();
  };

  // ➕ Thêm mới Todo
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

  // ✏️ Sửa Todo
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

  // ✅ Toggle done state
  const toggleDone = useCallback(
    (todo: Todo) => {
      try {
        const newDone = todo.done === 1 ? 0 : 1;
        db.runSync('UPDATE todos SET done = ? WHERE id = ?;', [
          newDone,
          todo.id,
        ]);
        setTodos((prev) =>
          prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t))
        );
      } catch (err) {
        console.error('Lỗi toggle done:', err);
      }
    },
    [setTodos]
  );

  // 🗑 Xóa Todo có xác nhận
  const handleDeleteTodo = useCallback((todo: Todo) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn có chắc muốn xóa công việc:\n"${todo.title}"?`,
      [
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
      ]
    );
  }, []);

  // 🔍 Lọc danh sách theo search (useMemo để tránh render lại)
  const filteredTodos = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return todos;
    return todos.filter((t) => t.title.toLowerCase().includes(term));
  }, [search, todos]);

  // 🧱 Render từng item
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

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteTodo(item)}
            >
              <Text style={styles.deleteButtonText}>🗑</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.todoDate}>
          {new Date(item.created_at).toLocaleString('vi-VN')}
        </Text>
      </Pressable>
    ),
    [toggleDone, handleDeleteTodo]
  );

  return (
    <SafeAreaView
      style={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      {/* 🔹 Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>Danh sách công việc</Text>
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

      {/* 🔍 Ô tìm kiếm */}
      <TextInput
        placeholder="Tìm kiếm công việc..."
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* 🔹 Danh sách */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : filteredTodos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không tìm thấy công việc nào</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTodos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ paddingVertical: 8 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* 🔹 Modal thêm/sửa */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>
              {editingTodo ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tiêu đề công việc..."
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowModal(false);
                  setNewTitle('');
                  setEditingTodo(null);
                }}
              >
                <Text style={styles.modalButtonText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={editingTodo ? handleEditTodo : handleAddTodo}
              >
                <Text
                  style={[styles.modalButtonText, { color: '#fff' }]}
                >
                  {editingTodo ? 'Lưu thay đổi' : 'Thêm mới'}
                </Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    color: '#007AFF',
  },
  addButton: {
    position: 'absolute',
    right: 0,
    backgroundColor: '#007AFF',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 24, lineHeight: 28 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginBottom: 10,
  },
  todoItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  todoItemDone: { backgroundColor: '#e6f4ea' },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  done: { textDecorationLine: 'line-through', color: '#999' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButton: {
    backgroundColor: '#f1f3f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
  deleteButton: {
    backgroundColor: '#ffe3e3',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
  },
  deleteButtonText: { fontSize: 16, color: '#d32f2f', fontWeight: '700' },
  todoDate: { fontSize: 12, color: '#666', marginTop: 6 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: { backgroundColor: '#e9ecef', marginRight: 8 },
  saveButton: { backgroundColor: '#007AFF', marginLeft: 8 },
  modalButtonText: { fontSize: 16, fontWeight: '600' },
});
