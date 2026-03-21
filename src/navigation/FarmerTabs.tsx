import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/Ionicons';
import FarmerHomeScreen from '../screens/farmer/FarmerHomeScreen';
import MarketPricesScreen from '../screens/farmer/MarketPricesScreen';
import CropScannerScreen from '../screens/farmer/CropScannerScreen';
import BuyerRequestsScreen from '../screens/farmer/BuyerRequestsScreen';
import ProfileScreen from '../screens/common/ProfileScreen';
import { colors } from '../constants/colors';

const Tab = createBottomTabNavigator();

export const FarmerTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
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
      <Tab.Screen name="Home" component={FarmerHomeScreen} />
      <Tab.Screen name="Prices" component={MarketPricesScreen} />
      <Tab.Screen name="Scan" component={CropScannerScreen} />
      <Tab.Screen name="Requests" component={BuyerRequestsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
