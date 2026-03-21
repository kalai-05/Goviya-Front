import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

const FILTERS = ['All', 'Near me', 'My crops'];

// Mock crops if user profile doesn't strictly hold crop tags natively initialized yet
const MY_CROPS = ['Tomato', 'Carrot', 'Rice (Nadu)', 'Pumpkin'];

type FarmerStackParamList = {
  ChatScreen: { buyerId: string; requestId: string };
};

type NavigationProp = NativeStackNavigationProp<FarmerStackParamList>;

interface BuyerRequest {
  id: string;
  buyerId: string;
  buyerName: string;
  cropEmoji: string;
  cropName: string;
  quantity: string;
  maxPrice: number;
  distance: number;
  timePosted: string;
  responseCount: number;
}

const BuyerRequestsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Bottom Sheet State
  const [selectedRequest, setSelectedRequest] = useState<BuyerRequest | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = async () => {
    if (!user?.district) return;
    try {
      const snapshot = await db.collection(Collections.buyer_requests)
        .where('status', '==', 'OPEN')
        .where('district', '==', user.district)
        .get();

      const fetchedReqs: BuyerRequest[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedReqs.push({
          id: doc.id,
          buyerId: data.buyerId || 'unknown_buyer',
          buyerName: data.buyerName || 'Buyer',
          cropEmoji: data.cropEmoji || '🥬',
          cropName: data.cropName || 'Vegetable',
          quantity: data.quantity || '100 kg',
          maxPrice: data.maxPrice || 0,
          distance: data.distance || Math.floor(Math.random() * 20) + 1,
          timePosted: data.timePosted || '2h ago',
          responseCount: data.responseCount || Math.floor(Math.random() * 5),
        });
      });

      // Dummy data injection for local debugging if DB is empty 
      if (fetchedReqs.length === 0) {
        fetchedReqs.push(
          { id: '1', buyerId: 'b1', buyerName: 'Suresh', cropEmoji: '🍅', cropName: 'Tomato', quantity: '500 kg', maxPrice: 280, distance: 3, timePosted: '1h ago', responseCount: 2 },
          { id: '2', buyerId: 'b2', buyerName: 'Nimali', cropEmoji: '🥕', cropName: 'Carrot', quantity: '200 kg', maxPrice: 300, distance: 8, timePosted: '3h ago', responseCount: 0 },
          { id: '3', buyerId: 'b3', buyerName: 'Kamal', cropEmoji: '🍌', cropName: 'Banana', quantity: '1000 kg', maxPrice: 110, distance: 15, timePosted: '5h ago', responseCount: 4 },
        );
      }

      setRequests(fetchedReqs);
    } catch (error) {
      console.error('Error fetching buyer requests:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchRequests();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (selectedFilter === 'Near me') {
      result.sort((a, b) => a.distance - b.distance);
    } else if (selectedFilter === 'My crops') {
      result = result.filter(req => MY_CROPS.includes(req.cropName));
    }
    return result;
  }, [requests, selectedFilter]);

  const handleSubmitOffer = async () => {
    if (!selectedRequest || !offerPrice) {
      Alert.alert('Incomplete', 'Please enter your offer price.');
      return;
    }

    setIsSubmitting(true);
    try {
      await db.collection(Collections.request_responses).add({
        requestId: selectedRequest.id,
        buyerId: selectedRequest.buyerId,
        farmerId: user?.id,
        farmerName: user?.name,
        offeredPrice: parseFloat(offerPrice),
        message: message.trim(),
        createdAt: new Date().toISOString(),
        status: 'PENDING'
      });

      const buyerId = selectedRequest.buyerId;
      const reqId = selectedRequest.id;
      
      setSelectedRequest(null);
      setOfferPrice('');
      setMessage('');
      
      // Pivot directly into a ChatScreen instance 
      navigation.navigate('ChatScreen', { buyerId, requestId: reqId });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit offer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Buyer Requests</Text>
        <Text style={styles.headerSubtitle}>Find who needs your harvest locally</Text>
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

  const renderItem = ({ item }: { item: BuyerRequest }) => (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cropInfo}>
          <Text style={styles.emoji}>{item.cropEmoji}</Text>
          <View>
            <Text style={styles.cropName}>{item.cropName}</Text>
            <Text style={styles.postedTime}>{item.timePosted} • {item.buyerName}</Text>
          </View>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.priceLabel}>Max Price</Text>
          <Text style={styles.priceValue}>Rs. {item.maxPrice}/kg</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Icon name="scale-outline" size={16} color={colors.common.textSecondary} />
          <Text style={styles.statText}>{item.quantity}</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="navigate-outline" size={16} color={colors.common.textSecondary} />
          <Text style={styles.statText}>{item.distance} km away</Text>
        </View>
        <View style={styles.statItem}>
          <Icon name="people-outline" size={16} color={colors.common.textSecondary} />
          <Text style={styles.statText}>{item.responseCount} offers</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.offerButton}
        onPress={() => setSelectedRequest(item)}
      >
        <Text style={styles.offerButtonText}>Offer My Price</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.farmer.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.farmer.primary]} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No requests matching your filters.</Text>}
        />
      )}

      {/* Slide UP Action Sheet / Modal */}
      <Modal visible={!!selectedRequest} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Submit Your Offer</Text>
              <TouchableOpacity onPress={() => setSelectedRequest(null)} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.common.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedRequest && (
              <View style={styles.sheetTargetRow}>
                <Text style={styles.sheetTargetText}>
                  Offering for: <Text style={{fontWeight: 'bold'}}>{selectedRequest.quantity} of {selectedRequest.cropName}</Text>
                </Text>
                <Text style={styles.sheetTargetSub}>
                  Buyer limit: <Text style={{ color: colors.farmer.primary, fontWeight: 'bold' }}>Rs. {selectedRequest.maxPrice}/kg</Text>
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Your Price (Rs/kg)</Text>
            <TextInput
              style={styles.sheetInput}
              placeholder="e.g. 260"
              keyboardType="decimal-pad"
              value={offerPrice}
              onChangeText={setOfferPrice}
            />

            <Text style={styles.inputLabel}>Message (Optional)</Text>
            <TextInput
              style={[styles.sheetInput, styles.textArea]}
              placeholder="e.g. Can harvest tomorrow morning..."
              multiline
              numberOfLines={3}
              value={message}
              onChangeText={setMessage}
            />

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSubmitOffer}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                 <ActivityIndicator color={colors.common.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Offer</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: colors.farmer.primary, // #1a7a4a
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
    color: colors.farmer.light,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.common.border,
    marginRight: 10,
  },
  filterChipSelected: {
    backgroundColor: colors.farmer.primary,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 28,
    marginRight: 12,
  },
  cropName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  postedTime: {
    fontSize: 12,
    color: colors.common.textSecondary,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.common.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.common.textSecondary,
    marginLeft: 4,
  },
  offerButton: {
    backgroundColor: colors.farmer.light,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.farmer.primary,
  },
  offerButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
  
  // Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.common.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    minHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  closeButton: {
    padding: 4,
    backgroundColor: colors.common.background,
    borderRadius: 20,
  },
  sheetTargetRow: {
    backgroundColor: colors.farmer.light,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  sheetTargetText: {
    fontSize: 14,
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  sheetTargetSub: {
    fontSize: 13,
    color: colors.common.textSecondary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  sheetInput: {
    backgroundColor: colors.common.background,
    borderWidth: 1,
    borderColor: colors.common.border,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    color: colors.common.textPrimary,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top', 
  },
  submitButton: {
    backgroundColor: colors.farmer.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24, // extra padding for bottom safe area
  },
  submitButtonText: {
    color: colors.common.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BuyerRequestsScreen;
