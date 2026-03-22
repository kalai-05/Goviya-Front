import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import { requestService } from '../../services/requestService';
import { colors } from '../../constants/colors';

interface BuyerRequest {
  id: string;
  cropEmoji: string;
  cropName: string;
  quantity: string;
  maxPrice: number;
  status: string;
  createdAt: string;
}

const MyRequestsScreen = () => {
  const navigation = useNavigation<any>();
  const [requests, setRequests] = useState<BuyerRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const response = await requestService.getMyRequests();
      if (response.success) {
        const fetched: BuyerRequest[] = response.data.map((item: any) => ({
          id: item.id,
          cropEmoji: item.cropEmoji || '📦',
          cropName: item.cropName,
          quantity: `${item.quantityKg} kg`,
          maxPrice: item.maxPricePerKg,
          status: item.status,
          createdAt: item.createdAt,
        }));
        setRequests(fetched);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', fetchRequests);
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id: string) => {
    Alert.alert('Delete Request', 'Are you sure you want to delete this help request?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await requestService.deleteRequest(id);
            setRequests(prev => prev.filter(r => r.id !== id));
          } catch (error) {
            Alert.alert('Error', 'Failed to delete request.');
          }
        } 
      }
    ]);
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity onPress={() => handleDelete(id)} style={styles.deleteAction}>
      <Icon name="trash" size={28} color={colors.common.white} />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: BuyerRequest }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
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
            <Text style={styles.price}>Rs. {item.maxPrice}/kg</Text>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'OPEN' ? colors.buyer.primary : '#4caf50' }]}>
              <Text style={styles.statusText}>{item.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardDivider} />
        <View style={styles.cardFooter}>
           <Text style={styles.dateText}>Posted on {new Date(item.createdAt).toLocaleDateString()}</Text>
           <TouchableOpacity 
             style={styles.editBtn}
             onPress={() => navigation.navigate('PostRequestForm', { requestId: item.id })}
           >
             <Icon name="create-outline" size={18} color={colors.buyer.primary} />
             <Text style={styles.editBtnText}>Edit</Text>
           </TouchableOpacity>
        </View>
      </View>
    </Swipeable>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Requests</Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate('PostRequestForm')}
      >
        <Icon name="add" size={20} color={colors.common.white} />
        <Text style={styles.addButtonText}>New Request</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.buyer.primary} style={{marginTop: 50}} />
      ) : (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchRequests} />}
          ListEmptyComponent={<Text style={styles.emptyText}>You haven't posted any requests yet.</Text>}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.common.background },
  listContent: { padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.buyer.primary,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: colors.common.white },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: { color: colors.common.white, fontWeight: 'bold', marginLeft: 4 },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  cropInfo: { flexDirection: 'row', alignItems: 'center' },
  emoji: { fontSize: 32, marginRight: 12 },
  cropName: { fontSize: 18, fontWeight: 'bold', color: colors.common.textPrimary },
  quantity: { fontSize: 14, color: colors.common.textSecondary },
  priceContainer: { alignItems: 'flex-end' },
  price: { fontSize: 18, fontWeight: 'bold', color: colors.buyer.primary, marginBottom: 4 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  statusText: { color: colors.common.white, fontSize: 10, fontWeight: 'bold' },
  cardDivider: { height: 1, backgroundColor: colors.common.border, marginHorizontal: 16 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fafafa' },
  dateText: { fontSize: 12, color: colors.common.textSecondary },
  editBtn: { flexDirection: 'row', alignItems: 'center' },
  editBtnText: { color: colors.buyer.primary, fontWeight: 'bold', marginLeft: 4 },
  deleteAction: {
    backgroundColor: '#d9534f',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '90%',
    borderRadius: 12,
  },
  emptyText: { textAlign: 'center', color: colors.common.textSecondary, marginTop: 40 },
});

export default MyRequestsScreen;
