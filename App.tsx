// App.tsx
import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import useTodos, { Todo } from './src/hooks/useTodos';

function TodoListScreen() {
  const insets = useSafeAreaInsets();
  const {
    todos,
    loading,
    refreshing,
    syncing,
    search,
    setSearch,
    refresh,
    addTodo,
    editTodo,
    toggleDone,
    deleteTodo,
    importFromApi,
  } = useTodos();

  const [showModal, setShowModal] = useState(false);
  const [inputTitle, setInputTitle] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);

  const handleSave = () => {
    if (editingTodo) editTodo(editingTodo.id, inputTitle);
    else addTodo(inputTitle);
    setInputTitle('');
    setEditingTodo(null);
    setShowModal(false);
  };

  const renderItem = ({ item }: { item: Todo }) => (
    <Pressable onPress={() => toggleDone(item)} style={[styles.todoItem, item.done ? styles.todoItemDone : null]}>
      <View style={styles.todoContent}>
        <Text style={[styles.todoTitle, item.done ? styles.done : null]}>{item.title}</Text>
        <View style={styles.actions}>
          <Pressable
            style={styles.editButton}
            onPress={() => {
              setEditingTodo(item);
              setInputTitle(item.title);
              setShowModal(true);
            }}
          >
            <Text style={styles.editButtonText}>✎</Text>
          </Pressable>
          <Pressable style={styles.deleteButton} onPress={() => deleteTodo(item)}>
            <Text style={styles.deleteButtonText}>🗑</Text>
          </Pressable>
        </View>
      </View>
      <Text style={styles.todoDate}>{new Date(item.created_at).toLocaleString('vi-VN')}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
          onPress={importFromApi}
          disabled={syncing}
        >
          {syncing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.syncText}>Đồng bộ</Text>}
        </Pressable>

        <Text style={styles.headerTitle}>Danh sách công việc</Text>

        <Pressable style={styles.addButton} onPress={() => setShowModal(true)}>
          <Text style={styles.addButtonText}>＋</Text>
        </Pressable>
      </View>

      {/* Search bar */}
      <TextInput
        placeholder="Tìm kiếm công việc..."
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : todos.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Không có công việc nào.</Text>
        </View>
      ) : (
        <FlatList
          data={todos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Modal thêm/sửa */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{editingTodo ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Nhập tiêu đề công việc..."
              value={inputTitle}
              onChangeText={setInputTitle}
            />
            <View style={styles.modalActions}>
              <Pressable style={[styles.modalButton, styles.cancelButton]} onPress={() => setShowModal(false)}>
                <Text style={styles.modalButtonText}>Hủy</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveButton,
                  !inputTitle.trim() && { opacity: 0.5 },
                ]}
                disabled={!inputTitle.trim()}
                onPress={handleSave}
              >
                <Text style={[styles.modalButtonText, { color: '#fff' }]}>
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

// 🎨 Styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingHorizontal: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: '#007AFF' },
  syncButton: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  syncButtonDisabled: { backgroundColor: '#95d6a0' },
  syncText: { color: '#fff', fontWeight: '700' },
  addButton: {
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
  todoContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  todoTitle: { fontSize: 16, fontWeight: '600', color: '#333', flex: 1 },
  done: { textDecorationLine: 'line-through', color: '#999' },
  actions: { flexDirection: 'row', alignItems: 'center' },
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
