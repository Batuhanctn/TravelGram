import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { View, StyleSheet } from 'react-native';
import CustomNavHeader from '../../components/CustomNavHeader';

export default function TabsLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e0e0e0',
            height: 60,
            paddingBottom: 5,
          },
          headerStyle: {
            backgroundColor: '#1e88e5',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarActiveTintColor: '#1e88e5',
          tabBarInactiveTintColor: '#757575',
        }}
      >
      <Tabs.Screen
        name="home/index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search/index"
        options={{
          title: 'Arama',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="post/create"
        options={{
          title: 'Paylaş',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  </View>
  );
}
