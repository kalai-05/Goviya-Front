import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { useAuthStore } from '../../store/authStore';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

type FarmerStackParamList = {
  CreateListingScreen: { listingId?: string } | undefined;
  OffersScreen: { listingId: string };
};

type NavigationProp = NativeStackNavigationProp<FarmerStackParamList>;

interface ProduceListing {
  id: string;
  farmerId: string;
  cropEmoji: string;
  cropName: string;
  quantity: string;
  price: number;
  status: 'ACTIVE' | 'SOLD' | 'EXPIRED';
  expiryDate: string; // ISO string format
}

const MyListingsScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore(state => state.user);
  
  const [listings, setListings] = useState<ProduceListing[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const fetchListings = async () => {
    if (!user?.id) return;
    try {
      const snapshot = await db.collection(Collections.produce_listings)
        .where('farmerId', '==', user.id)
        .get();

      const fetched: ProduceListing[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          farmerId: data.farmerId,
          cropEmoji: data.cropEmoji || '📦',
          cropName: data.cropName || 'Produce',
          quantity: data.quantity || '0 kg',
          price: data.price || 0,
          status: data.status || 'ACTIVE',
          expiryDate: data.expiryDate || new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days simulated fallback
        });
      });

      // Dummy state injection for blank databases
      if (fetched.length === 0) {
        fetched.push(
          { id: '1', farmerId: user.id, cropEmoji: '🍅', cropName: 'Tomato', quantity: '200 kg', price: 180, status: 'ACTIVE', expiryDate: new Date(Date.now() + 86400000 * 2).toISOString() },
          { id: '2', farmerId: user.id, cropEmoji: '🥕', cropName: 'Carrot', quantity: '50 kg', price: 250, status: 'SOLD', expiryDate: new Date(Date.now() - 86400000 * 1).toISOString() }
        );
      }

      // Automatically organize purely active up front 
      fetched.sort((a, b) => {
        if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
        if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') return 1;
        return 0;
      });

      setListings(fetched);
    } catch (error) {
      console.error('Error fetching listings:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchListings();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const getCountdown = (isoString: string) => {
    const end = new Date(isoString).getTime();
    const now = new Date().getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    return `${hours}h left`;
  };

  const getStatusColor = (status: ProduceListing['status']) => {
    if (status === 'ACTIVE') return colors.farmer.primary;
    if (status === 'SOLD') return '#f5a623';
    return '#d9534f'; // red for expired
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Listing', 'Are you sure you want to continuously delete this listing?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await db.collection(Collections.produce_listings).doc(id).delete();
            setListings(prev => prev.filter(l => l.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to securely delete listing.');
          }
        } 
      }
    ]);
  };

  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>, id: string) => {
    const scale = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });

    return (
      <TouchableOpacity onPress={() => handleDelete(id)} style={styles.deleteAction}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Icon name="trash" size={28} color={colors.common.white} />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Listings</Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('CreateListingScreen')}
        activeOpacity={0.8}
      >
        <Icon name="add" size={20} color={colors.common.white} />
        <Text style={styles.addButtonText}>Add new listing</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ProduceListing }) => {
    const isExpired = item.status === 'EXPIRED' || getCountdown(item.expiryDate) === 'Expired';
    const statusText = isExpired && item.status === 'ACTIVE' ? 'EXPIRED' : item.status;
    
    return (
      <Swipeable renderRightActions={(prog, drag) => renderRightActions(prog, drag, item.id)}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cropInfo}>
              <Text style={styles.emoji}>{item.cropEmoji}</Text>
              <View>
                <Text style={styles.cropName}>{item.cropName}</Text>
                <Text style={styles.quantity}><Icon name="scale-outline" size={12}/> {item.quantity}</Text>
              </View>
            </View>
            <View style={styles.priceContainer}>
              <Text style={styles.price}>Rs. {item.price}/kg</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(statusText as any) }]}>
                <Text style={styles.statusText}>{statusText}</Text>
              </View>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardFooter}>
            <View style={styles.expiryBox}>
              <Icon name="time-outline" size={16} color={colors.common.textSecondary} />
              <Text style={[styles.expiryText, isExpired && { color: '#d9534f' }]}>
                {getCountdown(item.expiryDate)}
              </Text>
            </View>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={styles.iconButton}
                onPress={() => navigation.navigate('CreateListingScreen', { listingId: item.id })}
              >
                <Icon name="create-outline" size={20} color={colors.farmer.primary} />
                <Text style={styles.iconButtonText}>Edit</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.iconButton, styles.primaryOutlineBtn]}
                onPress={() => navigation.navigate('OffersScreen', { listingId: item.id })}
              >
                <Icon name="people-outline" size={20} color={colors.farmer.primary} />
                <Text style={styles.iconButtonText}>View Offers</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Swipeable>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.farmer.primary} />
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.farmer.primary]} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>You haven't posted any listings yet.</Text>}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.farmer.primary, // #1a7a4a
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.common.white,
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 12,
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
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.farmer.primary,
    marginBottom: 6,
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusText: {
    color: colors.common.white,
    fontSize: 10,
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
  expiryBox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 13,
    color: colors.common.textSecondary,
    marginLeft: 4,
  },
  actionButtonsRow: {
    flexDirection: 'row',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  primaryOutlineBtn: {
    borderWidth: 1,
    borderColor: colors.farmer.primary,
    borderRadius: 6,
    marginLeft: 12,
  },
  iconButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.farmer.primary,
    marginLeft: 4,
  },
  deleteAction: {
    backgroundColor: '#d9534f',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: 80,
    height: '100%',
    paddingRight: 20,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
});

export default MyListingsScreen;
