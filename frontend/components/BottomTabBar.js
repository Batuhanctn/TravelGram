import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';

export default function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const tabs = [
    {
      name: 'home',
      icon: 'home',
      route: '/home',
    },
    {
      name: 'search',
      icon: 'search',
      route: '/search',
    },
    {
      name: 'add',
      icon: 'add-circle',
      route: '/post/create',
    },
    {
      name: 'profile',
      icon: 'person',
      route: '/profile',
    },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.route;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => router.push(tab.route)}
          >
            <MaterialIcons
              name={tab.icon}
              size={tab.name === 'add' ? 32 : 24}
              color={isActive ? '#1565c0' : '#666'}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
});
