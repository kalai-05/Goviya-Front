import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { shopService } from '../../services/shopService';
import { colors } from '../../constants/colors';

type BuyerStackParamList = {
  ShopPublicProfileScreen: { shopId: string };
};

type NavigationProp = NativeStackNavigationProp<BuyerStackParamList>;

interface AgriShop {
  id: string;
  shopName: string;
  district: string;
  distance: number;
  rating: number;
  isOpen: boolean;
  categories: string[];
  latitude?: number;
  longitude?: number;
}

const AgriShopsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);

  const [shops, setShops] = useState<AgriShop[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const fetchShops = async () => {
    try {
      const response = await shopService.getShops(user?.district);
      
      const currentHour = new Date().getHours();
      const mockIsOpen = currentHour >= 8 && currentHour <= 18; 

      if (response.success) {
        const fetchedShops: AgriShop[] = response.data.map((item: any) => ({
          id: item.id,
          shopName: item.name || 'Agri Shop',
          district: item.district || '',
          distance: item.distance || Math.floor(Math.random() * 15) + 1,
          rating: item.rating || 4.5,
          isOpen: item.isOpen !== undefined ? item.isOpen : mockIsOpen,
          categories: item.categories || ['Seeds', 'Fertilizer', 'Tools'],
          latitude: item.latitude,
          longitude: item.longitude,
        }));

        setShops(fetchedShops.sort((a, b) => a.distance - b.distance));
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchShops();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openDirections = (shop: AgriShop) => {
    let url = '';
    // Deep linking intelligently directly to OS map software 
    if (shop.latitude && shop.longitude) {
      const latLng = `${shop.latitude},${shop.longitude}`;
      url = Platform.select({
        ios: `http://maps.apple.com/?q=${encodeURIComponent(shop.shopName)}&ll=${latLng}`,
        android: `https://www.google.com/maps/search/?api=1&query=${latLng}`
      }) || `https://www.google.com/maps/search/?api=1&query=${latLng}`;
    } else {
      // Fallback query routing mapped safely by name & district strings 
      const query = encodeURIComponent(`${shop.shopName}, ${shop.district}, Sri Lanka`);
      url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    }

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      }
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Agri Shops</Text>
      <Text style={styles.headerSubtitle}>Locate farming supplies securely Near {user?.district}</Text>
    </View>
  );

  const renderItem = ({ item }: { item: AgriShop }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.titleRow}>
          <Icon name="storefront" size={24} color={colors.buyer.primary} />
          <Text style={styles.shopName}>{item.shopName}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.isOpen ? '#e8f5e9' : '#fdeeea' }]}>
          <Text style={[styles.statusText, { color: item.isOpen ? '#4caf50' : '#d9534f' }]}>
            {item.isOpen ? 'OPEN' : 'CLOSED'}
          </Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoBlock}>
          <Icon name="navigate-outline" size={16} color={colors.common.textSecondary} />
          <Text style={styles.infoText}>{item.distance} km</Text>
        </View>
        <View style={styles.infoBlock}>
          <Icon name="star" size={16} color="#f5a623" />
          <Text style={styles.infoText}>{item.rating}</Text>
        </View>
      </View>

      <Text style={styles.categoriesText}>
        {item.categories.join(' • ')}
      </Text>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.productsBtn}
          onPress={() => navigation.navigate('ShopPublicProfileScreen', { shopId: item.id })}
        >
          <Icon name="basket-outline" size={20} color={colors.buyer.primary} />
          <Text style={styles.productsBtnText}>View Products</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.directionBtn}
          onPress={() => openDirections(item)}
        >
          <Icon name="map" size={20} color={colors.common.white} />
          <Text style={styles.directionBtnText}>Directions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.buyer.primary} />
        </View>
      ) : (
        <FlatList
          data={shops}
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
               <Icon name="business-outline" size={48} color={colors.common.textSecondary} />
               <Text style={styles.emptyText}>No Agri Shops found matching "{user?.district}".</Text>
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
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  shopName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginLeft: 8,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: colors.common.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.common.textSecondary,
    marginLeft: 4,
  },
  categoriesText: {
    fontSize: 13,
    color: colors.common.textSecondary,
    marginBottom: 12,
    fontStyle: 'italic',
  },
  divider: {
    height: 1,
    backgroundColor: colors.common.border,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.buyer.light,
    borderWidth: 1,
    borderColor: colors.buyer.primary,
    marginRight: 8,
  },
  productsBtnText: {
    color: colors.buyer.primary,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  directionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.buyer.primary,
    marginLeft: 8,
  },
  directionBtnText: {
    color: colors.common.white,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 6,
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

export default AgriShopsScreen;
