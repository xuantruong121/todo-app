// App.tsx
import React, { useEffect, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import db from './src/database/db';

export default function App() {
  const [status, setStatus] = useState<string>('Checking database...');

  useEffect(() => {
    try {
      const result = db.getFirstSync<{ ok: number }>('SELECT 1 as ok;');
      setStatus(`✅ Database connected OK: ${JSON.stringify(result)}`);
      console.log('DB connected:', result);
    } catch (e) {
      console.error('DB connection error:', e);
      setStatus(`❌ Database error: ${String(e)}`);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.text}>{status}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 16 },
});
