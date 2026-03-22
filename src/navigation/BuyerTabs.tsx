import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BuyerHomeScreen from '../screens/buyer/BuyerHomeScreen';
import MyRequestsScreen from '../screens/buyer/MyRequestsScreen';
import PostRequestForm from '../screens/buyer/PostRequestScreen';
import MyOrdersScreen from '../screens/buyer/MyOrdersScreen';
import AgriShopsScreen from '../screens/buyer/AgriShopsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ProduceDetailScreen from '../screens/buyer/ProduceDetailScreen';
import ShopPublicProfileScreen from '../screens/buyer/ShopPublicProfileScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const BuyerHomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="BuyerHome" component={BuyerHomeScreen} />
    <Stack.Screen name="ProduceDetailScreen" component={ProduceDetailScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
  </Stack.Navigator>
);

const OrdersStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="OrdersHome" component={MyOrdersScreen} />
  </Stack.Navigator>
);

const RequestsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="MyRequests" component={MyRequestsScreen} />
    <Stack.Screen name="PostRequestForm" component={PostRequestForm} />
  </Stack.Navigator>
);

const ShopsStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="ShopsHome" component={AgriShopsScreen} />
    <Stack.Screen name="ShopPublicProfileScreen" component={ShopPublicProfileScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
  </Stack.Navigator>
);

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
      <Tab.Screen name="Home" component={BuyerHomeStack} />
      <Tab.Screen name="Post Need" component={RequestsStack} />
      <Tab.Screen name="Orders" component={OrdersStack} />
      <Tab.Screen name="Shops" component={ShopsStack} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
