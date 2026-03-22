import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import api from '../../services/api';
import { colors } from '../../constants/colors';

type FarmerStackParamList = {
  ChatScreen: { 
    targetUserId: string; 
    targetUserName: string; 
    targetUserRole: string; 
    contextTitle: string; 
  };
};

type NavigationProp = NativeStackNavigationProp<FarmerStackParamList>;

interface Offer {
  id: string;
  requestId: string;
  farmerId: string;
  farmerName: string;
  buyerId: string;
  buyerName: string;
  cropName: string;
  offeredPricePerKg: number;
  quantityKg: number;
  message: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

const OffersScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { listingId } = route.params || {};

  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOffers = async () => {
    try {
      // In a real app, this would be an endpoint to get offers for a specific listing
      // For now, we'll fetch my responses or mock them if the endpoint is missing
      const response = await api.get(`/requests/my`);
      
      if (response.data.success) {
        // Since we don't have a direct 'getOffersByListing' yet, 
        // we'll filter or show a friendly mock message if empty
        setOffers(response.data.data.filter((o: any) => o.listingId === listingId || !listingId));
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
      // Fallback mock data for demonstration
      setOffers([
        {
          id: 'off_1',
          requestId: 'req_1',
          farmerId: 'f1',
          farmerName: 'You',
          buyerId: 'b1',
          buyerName: 'Colombo Supermarket',
          cropName: 'Tomato',
          offeredPricePerKg: 185,
          quantityKg: 500,
          message: 'Can supply grade A tomatoes by Monday.',
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, [listingId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const handleChat = (offer: Offer) => {
    navigation.navigate('ChatScreen', {
      targetUserId: offer.buyerId,
      targetUserName: offer.buyerName,
      targetUserRole: 'BUYER',
      contextTitle: offer.cropName,
    });
  };

  const renderItem = ({ item }: { item: Offer }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.buyerName}>{item.buyerName}</Text>
          <Text style={styles.dateText}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'ACCEPTED' ? '#e8f5e9' : '#fff3e0' }]}>
          <Text style={[styles.statusText, { color: item.status === 'ACCEPTED' ? '#4caf50' : '#f5a623' }]}>
            {item.status}
          </Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Offered Price</Text>
          <Text style={styles.detailValue}>Rs. {item.offeredPricePerKg}/kg</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Quantity</Text>
          <Text style={styles.detailValue}>{item.quantityKg} kg</Text>
        </View>
      </View>

      {item.message ? (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>"{item.message}"</Text>
        </View>
      ) : null}

      <TouchableOpacity 
        style={styles.chatButton}
        onPress={() => handleChat(item)}
      >
        <Icon name="chatbubbles-outline" size={20} color={colors.common.white} />
        <Text style={styles.chatButtonText}>Chat with Buyer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={colors.common.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listing Offers</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color={colors.farmer.primary} />
        </View>
      ) : (
        <FlatList
          data={offers}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.farmer.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-off-outline" size={64} color={colors.common.textSecondary} />
              <Text style={styles.emptyText}>No offers received for this listing yet.</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.farmer.primary,
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  buyerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  dateText: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  messageBox: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 14,
    color: colors.common.textSecondary,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  chatButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.farmer.primary,
    paddingVertical: 12,
    borderRadius: 8,
  },
  chatButtonText: {
    color: colors.common.white,
    fontWeight: 'bold',
    fontSize: 15,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: colors.common.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default OffersScreen;
