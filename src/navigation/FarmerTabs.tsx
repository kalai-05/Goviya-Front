import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import MarketPricesScreen from '../screens/farmer/MarketPricesScreen';
import CropScannerScreen from '../screens/farmer/CropScannerScreen';
import BuyerRequestsScreen from '../screens/farmer/BuyerRequestsScreen';
import MyListingsScreen from '../screens/farmer/MyListingsScreen';
import CreateListingScreen from '../screens/farmer/CreateListingScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import ChatScreen from '../screens/shared/ChatScreen';
import ChatListScreen from '../screens/shared/ChatListScreen';
import OffersScreen from '../screens/farmer/OffersScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const HomeStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FarmerHome" component={FarmerHomeScreen} />
    <Stack.Screen name="MyListings" component={MyListingsScreen} />
    <Stack.Screen name="CreateListingScreen" component={CreateListingScreen} />
    <Stack.Screen name="ChatScreen" component={ChatScreen} />
    <Stack.Screen name="ChatListScreen" component={ChatListScreen} />
    <Stack.Screen name="OffersScreen" component={OffersScreen} />
  </Stack.Navigator>
);

export const FarmerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveBackgroundColor: '#1a7a4a',
        tabBarActiveTintColor: colors.farmer.primary, // #1a7a4a
        tabBarIcon: ({ focused, color, size }) => {
          let iconName = 'help-outline';
          if (route.name === 'Home') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Prices') iconName = focused ? 'cash' : 'cash-outline';
          else if (route.name === 'Scan') iconName = focused ? 'camera' : 'camera-outline';
          else if (route.name === 'Requests') iconName = focused ? 'megaphone' : 'megaphone-outline';
          else if (route.name === 'Profile') iconName = focused ? 'person' : 'person-outline';
          
          return <Icon name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Prices" component={MarketPricesScreen} />
      <Tab.Screen name="Scan" component={CropScannerScreen} />
      <Tab.Screen name="Requests" component={BuyerRequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
