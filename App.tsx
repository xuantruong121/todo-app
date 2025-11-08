// App.tsx
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import db from './src/database/db'; // Import db — tự động tạo bảng và seed

export default function App() {
  const [status, setStatus] = useState<string>('Đang kiểm tra cơ sở dữ liệu...');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    try {
      // Thực hiện truy vấn test
      const rows = db.getAllSync<{ id: number; title: string; done: number }>(
        'SELECT * FROM todos;'
      );

      if (rows.length > 0) {
        setStatus(`✅ Database OK — ${rows.length} bản ghi hiện có.`);
      } else {
        setStatus('⚠️ Database OK nhưng chưa có dữ liệu.');
      }
      console.log('Todos hiện có:', rows);
    } catch (e) {
      console.error('Lỗi SQLite:', e);
      setStatus(`❌ Database error: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Todo Notes — Câu 2</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <Text style={styles.text}>{status}</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: {
    padding: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 10 },
  text: { fontSize: 16 },
});
