import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { orderService } from '../../services/orderService';
import { colors } from '../../constants/colors';

const TABS = ['All', 'Active', 'Completed'];

type BuyerStackParamList = {
  OrderDetailScreen: { orderId: string };
};

type NavigationProp = NativeStackNavigationProp<BuyerStackParamList>;

type OrderStatus = 'Pickup today' | 'Pending' | 'In transit' | 'Completed';

interface Order {
  id: string;
  buyerId: string;
  farmerId: string;
  farmerName: string;
  cropEmoji: string;
  cropName: string;
  quantity: string;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
}

const MyOrdersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState('Active');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const fetchOrders = async () => {
    try {
      const response = await orderService.getMyOrders();
      if (response.success) {
        const fetchedOs: Order[] = response.data.map((item: any) => ({
          id: item.id,
          buyerId: item.buyerId,
          farmerId: item.farmerId,
          farmerName: item.farmerName || 'Farmer',
          cropEmoji: item.cropEmoji || '📦',
          cropName: item.cropName,
          quantity: item.quantity,
          totalPrice: item.totalPrice,
          status: item.status,
          createdAt: item.createdAt,
        }));
        setOrders(fetchedOs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (selectedTab === 'All') return true;
      if (selectedTab === 'Completed') return order.status === 'Completed';
      return ['Pending', 'Pickup today', 'In transit'].includes(order.status);
    });
  }, [orders, selectedTab]);

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'Pickup today': return '#4caf50'; // green
      case 'Pending': return '#ff9800'; // amber
      case 'In transit': return colors.buyer.primary; // blue (#1a5fa8)
      case 'Completed': return '#9e9e9e'; // gray
      default: return colors.common.textSecondary;
    }
  };

  const renderHeader = () => (
    <View style={styles.headerSpacer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <Text style={styles.headerSubtitle}>Track your produce purchases</Text>
      </View>

      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const isSelected = selectedTab === tab;
          return (
            <TouchableOpacity 
              key={tab} 
              style={[styles.tabBtn, isSelected && styles.tabBtnSelected]}
              onPress={() => setSelectedTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, isSelected && styles.tabTextSelected]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Order }) => {
    const statusColor = getStatusColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('OrderDetailScreen', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cropInfo}>
            <Text style={styles.emoji}>{item.cropEmoji}</Text>
            <View>
              <Text style={styles.cropName}>{item.cropName}</Text>
              <Text style={styles.quantity}><Icon name="scale-outline" size={12}/> {item.quantity}</Text>
            </View>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        <View style={styles.cardFooter}>
          <View style={styles.farmerBox}>
            <Icon name="person-circle-outline" size={18} color={colors.common.textSecondary} />
            <Text style={styles.farmerName}>{item.farmerName}</Text>
          </View>

          <Text style={styles.totalPrice}>
            Rs. {item.totalPrice.toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.buyer.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.buyer.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="receipt-outline" size={48} color={colors.common.textSecondary} />
              <Text style={styles.emptyText}>No orders matched in this tab.</Text>
            </View>
          }
        />
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
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerSpacer: {
    marginBottom: 16,
  },
  header: {
    backgroundColor: colors.buyer.primary, // #1a5fa8
    padding: 24,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.common.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.buyer.light,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.common.white,
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnSelected: {
    backgroundColor: colors.buyer.light,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textSecondary,
  },
  tabTextSelected: {
    color: colors.buyer.primary,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  quantity: {
    fontSize: 14,
    color: colors.common.textSecondary,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.common.border,
    marginHorizontal: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fafafa',
  },
  farmerBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textSecondary,
    marginLeft: 6,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.common.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
});

export default MyOrdersScreen;
