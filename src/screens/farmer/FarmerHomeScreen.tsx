import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../constants/colors';
import { weatherService } from '../../services/weatherService';
import { requestService } from '../../services/requestService';
import api from '../../services/api';

type FarmerStackParamList = {
  Prices: undefined;
  Scan: undefined;
  MyListings: undefined;
  Requests: undefined;
  ChatScreen: { buyerId: string; requestId: string };
};

type NavigationProp = NativeStackNavigationProp<FarmerStackParamList>;

interface BuyerRequest {
  id: string;
  buyerId: string;
  buyerName: string;
  crop: string;
  quantity: string;
  maxPrice: number;
  distance?: number;
  createdAt?: string;
}

const FarmerHomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const user = useAuthStore((state) => state.user);
  
  const [weather, setWeather] = useState<{temp: number; condition: string; rainWarning: boolean} | null>(null);
  const [buyerRequests, setBuyerRequests] = useState<BuyerRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchWeather = async () => {
    if (!user?.district) return;
    try {
      const response = await weatherService.getWeather(user.district);
      if (response.success) {
        const data = response.data;
        setWeather({
          temp: data.temperature || 0,
          condition: data.description || 'Sunny',
          rainWarning: (data.rainProbability || 0) > 60 || !!data.alert,
        });
      }
    } catch (error) {
      console.log('Error fetching weather:', error);
    }
  };

  const fetchBuyerRequests = async () => {
    if (!user?.district) return;
    try {
      const response = await requestService.getRequests(user.district);
      if (response.success) {
        const mapped = response.data.slice(0, 3).map((item: any) => ({
          id: item.id,
          buyerId: item.buyerId,
          buyerName: item.buyerName || 'Buyer',
          crop: item.cropName,
          quantity: `${item.quantityKg} kg`,
          maxPrice: item.maxPricePerKg,
          distance: item.distance || Math.floor(Math.random() * 10) + 1,
        }));
        setBuyerRequests(mapped);
      }
    } catch (error) {
      console.error('Error fetching buyers:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/chat/unread-count');
      if (response.data.success) {
        setUnreadCount(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching unread count:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWeather(), fetchBuyerRequests(), fetchUnreadCount()]);
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const QuickAction = ({ icon, title, route }: { icon: string, title: string, route: keyof FarmerStackParamList }) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={() => navigation.navigate(route as any)}
      activeOpacity={0.8}
    >
      <View style={styles.actionIconContainer}>
        <Icon name={icon} size={28} color={colors.farmer.primary} />
      </View>
      <Text style={styles.actionText}>{title}</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Farmer'}</Text>
          <Text style={styles.location}>
            <Icon name="location-sharp" size={16} color={colors.common.textSecondary} /> {user?.district || 'Sri Lanka'}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.notifIconContainer} 
          onPress={() => navigation.navigate('ChatListScreen' as any)}
        >
          <Icon name="chatbubbles-outline" size={28} color={colors.farmer.primary} />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.weatherCard}>
        <View style={styles.weatherInfo}>
          <Icon name={weather?.rainWarning ? "rainy" : "partly-sunny"} size={40} color={colors.farmer.primary} />
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.tempText}>{weather ? `${weather.temp}°C` : '--°C'}</Text>
            <Text style={styles.weatherCondition}>{weather ? weather.condition : 'Loading...'}</Text>
          </View>
        </View>
        {weather?.rainWarning && (
          <View style={styles.rainWarning}>
            <Icon name="warning" size={16} color="#d9534f" />
            <Text style={styles.rainText}> Rain Expected</Text>
          </View>
        )}
      </View>

      <View style={styles.gridContainer}>
        <QuickAction icon="cash-outline" title="Market Prices" route="Prices" />
        <QuickAction icon="scan-outline" title="Scan Crop" route="Scan" />
        <QuickAction icon="list-outline" title="My Listings" route="MyListings" />
        <QuickAction icon="megaphone-outline" title="Buyer Requests" route="Requests" />
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Nearby Buyers</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Requests' as any)}>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderBuyerRequest = ({ item }: { item: BuyerRequest }) => (
    <View style={styles.buyerCard}>
      <View style={styles.buyerCardHeader}>
        <Text style={styles.buyerCrop}>{item.crop}</Text>
        <Text style={styles.buyerPrice}>Max Rs. {item.maxPrice}</Text>
      </View>
      <View style={styles.buyerCardDetails}>
        <Text style={styles.buyerInfo}><Icon name="scale-outline" size={14} /> {item.quantity}</Text>
        <Text style={styles.buyerInfo}><Icon name="navigate-outline" size={14} /> {item.distance} km away</Text>
      </View>
      <TouchableOpacity 
        style={styles.respondButton} 
        onPress={() => navigation.navigate('ChatScreen' as any, { 
          partnerId: item.buyerId, 
          partnerName: item.buyerName, 
          partnerRole: 'BUYER',
          cropName: item.crop 
        })}
      >
        <Text style={styles.respondButtonText}>Respond</Text>
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
          data={buyerRequests}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderBuyerRequest}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.farmer.primary]} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No nearby requests found.</Text>}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  notifIconContainer: {
    padding: 8,
    backgroundColor: colors.common.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#e24b4a',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.common.white,
  },
  badgeText: {
    color: colors.common.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.farmer.primary,
    marginBottom: 4,
  },
  location: {
    fontSize: 14,
    color: colors.common.textSecondary,
    fontWeight: '500',
  },
  weatherCard: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 24,
  },
  weatherInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tempText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  weatherCondition: {
    fontSize: 14,
    color: colors.common.textSecondary,
    textTransform: 'capitalize',
  },
  rainWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fdeeea',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  rainText: {
    color: '#d9534f',
    fontSize: 12,
    fontWeight: 'bold',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.farmer.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textPrimary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.farmer.primary,
  },
  buyerCard: {
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  buyerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  buyerCrop: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  buyerPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
  buyerCardDetails: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  buyerInfo: {
    fontSize: 14,
    color: colors.common.textSecondary,
    marginRight: 16,
  },
  respondButton: {
    backgroundColor: colors.farmer.primary,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  respondButtonText: {
    color: colors.common.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.textSecondary,
    marginTop: 20,
    fontStyle: 'italic',
  },
});

export default FarmerHomeScreen;
