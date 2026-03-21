import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

const OPEN_WEATHER_API_KEY = 'd81a3db9d9ee0d720a4f55ff49f1bf0e'; // TODO: Replace with your actual OpenWeatherMap API Key

const SL_DISTRICT_COORDS: Record<string, {lat: number, lon: number}> = {
  'Ampara': {lat: 7.2966, lon: 81.6724},
  'Anuradhapura': {lat: 8.3114, lon: 80.4037},
  'Badulla': {lat: 6.9934, lon: 81.0550},
  'Batticaloa': {lat: 7.7126, lon: 81.6924},
  'Colombo': {lat: 6.9271, lon: 79.8612},
  'Galle': {lat: 6.0328, lon: 80.2168},
  'Gampaha': {lat: 7.0873, lon: 79.9996},
  'Hambantota': {lat: 6.1248, lon: 81.1185},
  'Jaffna': {lat: 9.6615, lon: 80.0255},
  'Kalutara': {lat: 6.5854, lon: 79.9607},
  'Kandy': {lat: 7.2906, lon: 80.6337},
  'Kegalle': {lat: 7.2513, lon: 80.3464},
  'Kilinochchi': {lat: 9.3803, lon: 80.3770},
  'Kurunegala': {lat: 7.4818, lon: 80.3609},
  'Mannar': {lat: 8.9810, lon: 79.9044},
  'Matale': {lat: 7.4675, lon: 80.6234},
  'Matara': {lat: 5.9549, lon: 80.5469},
  'Monaragala': {lat: 6.8728, lon: 81.3507},
  'Mullaitivu': {lat: 9.2671, lon: 80.8142},
  'Nuwara Eliya': {lat: 6.9497, lon: 80.7828},
  'Polonnaruwa': {lat: 7.9403, lon: 81.0188},
  'Puttalam': {lat: 8.0362, lon: 79.8283},
  'Ratnapura': {lat: 6.7056, lon: 80.3847},
  'Trincomalee': {lat: 8.5818, lon: 81.2336},
  'Vavuniya': {lat: 8.7542, lon: 80.4982},
};

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
    const coords = SL_DISTRICT_COORDS[user.district];
    if (!coords) return;
    
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPEN_WEATHER_API_KEY}`);
      if (!res.ok) return;
      const data = await res.json();
      
      const isRaining = data.weather.some((w: any) => w.main.toLowerCase().includes('rain'));
      
      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        rainWarning: isRaining,
      });
    } catch (error) {
      console.log('Error fetching weather:', error);
    }
  };

  const fetchBuyerRequests = async () => {
    if (!user?.district) return;
    try {
      const querySnapshot = await db.collection(Collections.buyer_requests)
        .where('district', '==', user.district)
        // .orderBy('createdAt', 'desc') // Warning: Requires a composite index in Firestore to sort with 'where' equality!
        .limit(3)
        .get();
        
      const reqs: BuyerRequest[] = [];
      querySnapshot.forEach(doc => {
        const data = doc.data();
        reqs.push({
          id: doc.id,
          buyerId: data.buyerId || 'unknown',
          crop: data.crop || 'Unknown Crop',
          quantity: data.quantity || '0 kg',
          maxPrice: data.maxPrice || 0,
          distance: data.distance || Math.floor(Math.random() * 20) + 1, // Simulated fall-back
        });
      });
      setBuyerRequests(reqs);
    } catch (error) {
      console.error('Error fetching buyers:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchWeather(), fetchBuyerRequests()]);
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const QuickAction = ({ icon, title, route }: { icon: string, title: string, route: keyof FarmerStackParamList }) => (
    <TouchableOpacity 
      style={styles.actionCard} 
      onPress={() => navigation.navigate(route)}
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
        <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'Farmer'}</Text>
        <Text style={styles.location}>
          <Icon name="location-sharp" size={16} color={colors.common.textSecondary} /> {user?.district || 'Sri Lanka'}
        </Text>
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
        <TouchableOpacity onPress={() => navigation.navigate('Requests')}>
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
        onPress={() => navigation.navigate('ChatScreen', { buyerId: item.buyerId, requestId: item.id })}
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
    marginBottom: 20,
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
