import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { listingService } from '../../services/listingService';
import { colors } from '../../constants/colors';

const FILTERS = ['All', 'Veg', 'Fruit', 'Near me'];

// Mapping subsets for UI-side generic filtering 
const VEG_CROPS = ['Tomato', 'Carrot', 'Cabbage', 'Potato', 'Onion', 'Leeks'];
const FRUIT_CROPS = ['Banana', 'Papaya', 'Mango', 'Pumpkin'];

type BuyerStackParamList = {
  ChatScreen: { farmerId: string; listingId: string };
  ProduceDetailScreen: { listingId: string };
};

type NavigationProp = NativeStackNavigationProp<BuyerStackParamList>;

interface ProduceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  cropEmoji: string;
  cropName: string;
  quantity: string;
  price: number;
  distance: number;
  rating: number;
  freshness: string;
  imageUrl?: string;
  createdAt: string;
  district: string;
}

const BuyerHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);

  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const fetchListings = async () => {
    try {
      const district = selectedFilter === 'Near me' ? user?.district : undefined;
      const response = await listingService.getListings(district || '');
      
      if (response.success) {
        const fetched: ProduceListing[] = response.data.map((item: any) => {
          // Simulated metrics since backend might not have them yet
          let simDistance = Math.floor(Math.random() * 50) + 1;
          if (item.district === user?.district) {
            simDistance = Math.floor(Math.random() * 10) + 1; 
          }

          return {
            id: item.id,
            farmerId: item.farmerId,
            farmerName: item.farmerName || 'Farmer',
            cropEmoji: item.cropEmoji || '📦',
            cropName: item.cropName,
            quantity: item.quantityKg ? `${item.quantityKg} kg` : '0 kg',
            price: item.pricePerKg || 0,
            district: item.district,
            distance: item.distance || simDistance,
            rating: item.rating || 4.5,
            freshness: item.freshness || 'Fresh',
            imageUrl: item.imageUrl,
            createdAt: item.createdAt,
          };
        });

        setListings(fetched);
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const loadInitialData = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user, selectedFilter]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadInitialData();
    });
    return unsubscribe;
  }, [navigation, loadInitialData]);

  const getFilteredListings = () => {
    let result = [...listings];
    if (selectedFilter === 'Veg') {
      result = result.filter(l => VEG_CROPS.includes(l.cropName));
    } else if (selectedFilter === 'Fruit') {
      result = result.filter(l => FRUIT_CROPS.includes(l.cropName));
    } else if (selectedFilter === 'Near me') {
      // Opted for a native map sort if filtered
      result.sort((a, b) => a.distance - b.distance);
    }
    return result;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Find Fresh Produce</Text>
        <Text style={styles.headerSubtitle}>Direct from farmers to you</Text>
      </View>

      <View style={styles.filterContainer}>
        {FILTERS.map(filter => {
          const isSelected = selectedFilter === filter;
          return (
            <TouchableOpacity 
              key={filter} 
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => setSelectedFilter(filter)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                {filter}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: ProduceListing }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.9}
      onPress={() => navigation.navigate('ProduceDetailScreen', { listingId: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cropTitleRow}>
          <Text style={styles.emoji}>{item.cropEmoji}</Text>
          <View>
            <Text style={styles.cropName}>{item.cropName}</Text>
            <View style={styles.freshnessBadge}>
              <Icon name="leaf" size={12} color="#4caf50" />
              <Text style={styles.freshnessText}>{item.freshness}</Text>
            </View>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceText}>Rs. {item.price}/kg</Text>
          <Text style={styles.quantityText}>{item.quantity} incl.</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.farmerInfoRow}>
        <View style={styles.farmerDetails}>
          <Icon name="person-circle-outline" size={24} color={colors.common.textSecondary} />
          <Text style={styles.farmerName}>{item.farmerName}</Text>
          <View style={styles.ratingBadge}>
            <Icon name="star" size={12} color="#f5a623" />
            <Text style={styles.ratingText}>{item.rating}</Text>
          </View>
        </View>
        <View style={styles.distanceBadge}>
          <Icon name="navigate" size={14} color={colors.buyer.primary} />
          <Text style={styles.distanceText}>{item.distance} km</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.detailsBtn}
          onPress={() => navigation.navigate('ProduceDetailScreen', { listingId: item.id })}
        >
          <Text style={styles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.contactBtn}
          onPress={() => navigation.navigate('ChatScreen', { farmerId: item.farmerId, listingId: item.id })}
        >
          <Icon name="chatbubble-ellipses" size={18} color={colors.common.white} />
          <Text style={styles.contactBtnText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderFooter = () => {
    return (
      <View style={styles.paginationLoader} />
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
          data={getFilteredListings()}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={renderFooter}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadInitialData} colors={[colors.buyer.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="basket-outline" size={48} color={colors.common.textSecondary} />
              <Text style={styles.emptyText}>No fresh produce found.</Text>
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
  paginationLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 8,
  },
  header: {
    backgroundColor: colors.buyer.primary, // #1a5fa8
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.common.border,
    marginRight: 10,
  },
  filterChipSelected: {
    backgroundColor: colors.buyer.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textSecondary,
  },
  filterTextSelected: {
    color: colors.common.white,
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cropTitleRow: {
    flexDirection: 'row',
  },
  emoji: {
    fontSize: 36,
    marginRight: 12,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  freshnessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  freshnessText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4caf50',
    marginLeft: 4,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.buyer.primary,
  },
  quantityText: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginTop: 4,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.common.border,
    marginBottom: 12,
  },
  farmerInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  farmerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  farmerName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textPrimary,
    marginLeft: 6,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff8e1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f5a623',
    marginLeft: 4,
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.buyer.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.buyer.primary,
    marginLeft: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailsBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.buyer.primary,
    alignItems: 'center',
    marginRight: 6,
  },
  detailsBtnText: {
    color: colors.buyer.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.buyer.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  contactBtnText: {
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

export default BuyerHomeScreen;
