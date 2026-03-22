import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { productService } from '../../services/productService';
import api from '../../services/api';
import { colors } from '../../constants/colors';

type ShopStackParamList = {
  Products: undefined;
  Inquiries: undefined; 
  Stats: undefined; 
  Reviews: undefined;
};

type NavigationProp = NativeStackNavigationProp<ShopStackParamList>;

interface ShopProduct {
  id: string;
  shopId: string;
  name: string;
  price: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

const ShopDashboardScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [mockStats, setMockStats] = useState({
    profileViews: 142,
    inquiriesToday: 5,
    rating: 4.8
  });

  const fetchDashboardData = async () => {
    try {
      const response = await productService.getShopProducts();
      
      if (response.success) {
        const fetchedProducts: ShopProduct[] = response.data.map((item: any) => ({
          id: item.id,
          shopId: item.shopId,
          name: item.name,
          price: item.price,
          stockStatus: item.stockStatus || 'IN_STOCK',
        }));
        setProducts(fetchedProducts);
      }

      setMockStats(prev => ({
        ...prev,
        profileViews: prev.profileViews + Math.floor(Math.random() * 5),
      }));

    } catch (error) {
      console.error('Error fetching shop dashboard:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchDashboardData();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const lowStockProducts = products.filter(p => p.stockStatus === 'LOW_STOCK' || p.stockStatus === 'OUT_OF_STOCK');

  const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const QuickAction = ({ icon, title, route }: { icon: string, title: string, route: keyof ShopStackParamList }) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={() => navigation.navigate(route as any)}
      activeOpacity={0.8}
    >
      <View style={styles.actionIconContainer}>
        <Icon name={icon} size={28} color={colors.agriShop.primary} />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.agriShop.primary} />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.agriShop.primary]} />}
        >
          {/* Heavy Amber Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>{user?.name || 'Agri Shop'}</Text>
              <Text style={styles.headerSubtitle}>Manage your store operations</Text>
            </View>
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{mockStats.rating}</Text>
              <Icon name="star" size={16} color="#fff" />
            </View>
          </View>

          {/* Core Analytics Grid */}
          <View style={styles.statsGrid}>
            <StatCard title="Profile Views" value={mockStats.profileViews} icon="eye" color="#4a90e2" />
            <StatCard title="Inquiries Today" value={mockStats.inquiriesToday} icon="chatbubbles" color="#50e3c2" />
            <StatCard title="Total Products" value={products.length} icon="cube" color={colors.agriShop.primary} />
            <StatCard title="Avg Rating" value={mockStats.rating} icon="star" color="#f5a623" />
          </View>

          {/* Conditional Alert Triggers */}
          {lowStockProducts.length > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertHeader}>
                <Icon name="warning" size={24} color="#d9534f" />
                <Text style={styles.alertTitle}>Stock Warning</Text>
              </View>
              <Text style={styles.alertBody}>
                You have <Text style={{fontWeight: 'bold'}}>{lowStockProducts.length}</Text> product(s) marked as "Low" or "Out of Stock". 
                Please update your inventory manually to prevent unfulfilled buyer inquiries.
              </Text>
              <TouchableOpacity 
                style={styles.alertBtn}
                onPress={() => navigation.navigate('Products')}
              >
                <Text style={styles.alertBtnText}>Manage Inventory</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Operations Navigator */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickAction icon="cube-outline" title="My Products" route="Products" />
            <QuickAction icon="chatbubbles-outline" title="Inquiries" route="Inquiries" />
            <QuickAction icon="stats-chart-outline" title="Stats" route="Stats" />
            <QuickAction icon="star-half-outline" title="Reviews" route="Reviews" />
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.agriShop.primary, // #7a4f00 (Amber Theme)
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.agriShop.light,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingText: {
    color: colors.common.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.common.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  alertCard: {
    backgroundColor: '#fffcfc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderLeftWidth: 6,
    borderLeftColor: '#d9534f',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
    marginLeft: 8,
  },
  alertBody: {
    fontSize: 14,
    color: colors.common.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  },
  alertBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#d9534f',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  alertBtnText: {
    color: colors.common.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.agriShop.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textPrimary,
  },
});

export default ShopDashboardScreen;
