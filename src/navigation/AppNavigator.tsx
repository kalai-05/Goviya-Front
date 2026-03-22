import React from 'react';
import { AuthNavigator } from './AuthNavigator';
import { FarmerTabs } from './FarmerTabs';
import { BuyerTabs } from './BuyerTabs';
import { ShopTabs } from './ShopTabs';
import { useAuthStore } from '../store/authStore';

export default function AppNavigator() {
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

  return renderNavigator();
}
