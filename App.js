import { SQLiteDatabaseProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { initializeDatabase } from './src/infra/database/sqlite-connection';

export default function App() {
  return (
    <SQLiteDatabaseProvider dataBaseName="faz_ae.db" onInit={initializeDatabase}>
      <View style={styles.container}>
        <Text>Open up App.js to start working on your app!</Text>
        <StatusBar style="auto" />
      </View>
    </SQLiteDatabaseProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
