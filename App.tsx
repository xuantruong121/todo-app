// App.tsx
import React, { useEffect, useState } from 'react';
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
  done: number; // 0 hoặc 1
  created_at: number;
}

function TodoListScreen() {
  const insets = useSafeAreaInsets();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal thêm & sửa
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  // 📦 Load todos từ SQLite
  const loadTodos = () => {
    try {
      const data = db.getAllSync<Todo>('SELECT * FROM todos ORDER BY id DESC;');
      setTodos(data);
    } catch (e) {
      console.error('Lỗi load todos:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTodos();
  }, []);

  // 🌀 Refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadTodos();
  };

  // ➕ Thêm mới Todo
  const handleAddTodo = () => {
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
  };

  // ✏️ Sửa Todo
  const handleEditTodo = () => {
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
  };

  // ✅ Toggle done state
  const toggleDone = (todo: Todo) => {
    try {
      const newDone = todo.done === 1 ? 0 : 1;
      db.runSync('UPDATE todos SET done = ? WHERE id = ?;', [newDone, todo.id]);
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? { ...t, done: newDone } : t))
      );
    } catch (err) {
      console.error('Lỗi toggle done:', err);
    }
  };

  // 🧱 Render item
  const renderItem = ({ item }: { item: Todo }) => (
    <Pressable
      onPress={() => toggleDone(item)}
      style={[styles.todoItem, item.done ? styles.todoItemDone : null]}
    >
      <View style={styles.todoContent}>
        <Text style={[styles.todoTitle, item.done ? styles.done : null]}>
          {item.title}
        </Text>
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
      </View>
      <Text style={styles.todoDate}>
        {new Date(item.created_at).toLocaleString('vi-VN')}
      </Text>
    </Pressable>
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

      {/* 🔹 Danh sách */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : todos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Chưa có việc nào</Text>
        </View>
      ) : (
        <FlatList
          data={todos}
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
    marginBottom: 16,
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
  todoItemDone: {
    backgroundColor: '#e6f4ea',
  },
  todoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todoTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  done: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  editButton: {
    backgroundColor: '#f1f3f5',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  editButtonText: { fontSize: 16, color: '#007AFF', fontWeight: '700' },
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
