import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { FarmerTabs } from './FarmerTabs';
import { BuyerTabs } from './BuyerTabs';
import { ShopTabs } from './ShopTabs';
import { useAuthStore } from '../store/authStore';

export const AppNavigator = () => {
  const { user, role } = useAuthStore();

  const renderNavigator = () => {
    if (!user) {
      return <AuthNavigator />;
    }

    switch (role) {
      case 'FARMER':
        return <FarmerTabs />;
      case 'BUYER':
        return <BuyerTabs />;
      case 'SHOP':
        return <ShopTabs />;
      default:
        // Fallback for safety
        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      {renderNavigator()}
    </NavigationContainer>
  );
};
