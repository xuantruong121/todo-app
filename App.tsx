// App.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import db from './src/database/db';

interface Todo {
  id: number;
  title: string;
  done: number;
  created_at: number;
}

// 👇 Tách phần nội dung app chính ra component riêng để dùng hook an toàn
function TodoListScreen() {
  const insets = useSafeAreaInsets(); // lấy khoảng safe area (top/bottom)
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

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

  // 📱 Render từng item
  const renderItem = ({ item }: { item: Todo }) => (
    <View style={styles.todoItem}>
      <Text style={[styles.todoTitle, item.done ? styles.done : null]}>
        {item.title}
      </Text>
      <Text style={styles.todoDate}>
        {new Date(item.created_at).toLocaleString('vi-VN')}
      </Text>
    </View>
  );

  // 🌀 Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadTodos();
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { paddingTop: insets.top + 8 }, // đảm bảo header không bị che
      ]}
    >
      <Text style={styles.header}>Danh sách công việc</Text>

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
    </SafeAreaView>
  );
}

// 👇 Đây là App gốc, bọc TodoListScreen bằng SafeAreaProvider
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
  header: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
    color: '#007AFF',
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
  todoTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  done: { textDecorationLine: 'line-through', color: '#999' },
  todoDate: { fontSize: 12, color: '#666', marginTop: 4 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#888' },
});
