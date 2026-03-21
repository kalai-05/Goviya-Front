import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import BuyerHomeScreen from '../screens/buyer/BuyerHomeScreen';
import PostRequestScreen from '../screens/buyer/PostRequestScreen';
import MyOrdersScreen from '../screens/buyer/MyOrdersScreen';
import AgriShopsScreen from '../screens/buyer/AgriShopsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

export const BuyerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.buyer.primary, // #1a5fa8
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'help-outline';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Post Need') iconName = focused ? 'add-circle' : 'add-circle-outline';
          else if (route.name === 'Orders') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'Shops') iconName = focused ? 'storefront' : 'storefront-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={BuyerHomeScreen} />
      <Tab.Screen name="Post Need" component={PostRequestScreen} />
      <Tab.Screen name="Orders" component={MyOrdersScreen} />
      <Tab.Screen name="Shops" component={AgriShopsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
