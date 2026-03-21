import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import ShopDashboardScreen from '../screens/shop/ShopDashboardScreen';
import ManageProductsScreen from '../screens/shop/ManageProductsScreen';
import InquiriesScreen from '../screens/shop/InquiriesScreen';
import ShopStatsScreen from '../screens/shop/ShopStatsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import { colors } from '../constants/colors';
import { useAuthStore } from '../store/authStore';
import { db, Collections } from '../services/firebase';
import { useState, useEffect } from 'react';

const Tab = createBottomTabNavigator();

export const ShopTabs = () => {
  const user = useAuthStore(state => state.user);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.id || user.role !== 'SHOP') return;
    
    // Natively injecting a listener into the navigation mount to trace unread counts without blocking UI routines
    const unsubscribe = db.collection(Collections.shop_inquiries)
      .where('shopId', '==', user.id)
      .where('isRead', '==', false)
      .onSnapshot((snapshot) => {
        setUnreadCount(snapshot.size);
      }, (err) => console.log('Badge listener error gracefully bypassed:', err));
      
    return () => unsubscribe();
  }, [user]);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.agriShop.primary, // #7a4f00
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'help-outline';
          if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Products') iconName = focused ? 'cube' : 'cube-outline';
          else if (route.name === 'Inquiries') iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          else if (route.name === 'Stats') iconName = focused ? 'stats-chart' : 'stats-chart-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={ShopDashboardScreen} />
      <Tab.Screen name="Products" component={ManageProductsScreen} />
      <Tab.Screen 
        name="Inquiries" 
        component={InquiriesScreen} 
        options={{ 
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined, 
          tabBarBadgeStyle: { backgroundColor: '#d9534f' } 
        }} 
      />
      <Tab.Screen name="Stats" component={ShopStatsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
