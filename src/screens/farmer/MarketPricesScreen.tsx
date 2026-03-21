import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

interface MarketPrice {
  id: string;
  crop: string;
  emoji: string;
  category: 'Veg' | 'Fruit' | 'Grain';
  price: number;
  trend: number; // e.g. 5 for +5%, -2 for -2%
}

const CATEGORIES = ['All', 'Veg', 'Fruit', 'Grain'];

const MarketPricesScreen = () => {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPrices = async () => {
    try {
      const snapshot = await db.collection(Collections.market_prices).get();
      const fetchedPrices: MarketPrice[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedPrices.push({
          id: doc.id,
          crop: data.crop || 'Unknown',
          emoji: data.emoji || '🥬',
          category: data.category || 'Veg',
          price: data.price || 0,
          trend: data.trend || 0,
        });
      });
      
      // Included dummy data for demonstration fallback if backend is empty
      if (fetchedPrices.length === 0) {
        fetchedPrices.push(
          { id: '1', crop: 'Carrot', emoji: '🥕', category: 'Veg', price: 250, trend: 12.5 },
          { id: '2', crop: 'Banana', emoji: '🍌', category: 'Fruit', price: 120, trend: -3.2 },
          { id: '3', crop: 'Rice (Nadu)', emoji: '🌾', category: 'Grain', price: 210, trend: 1.5 },
          { id: '4', crop: 'Tomato', emoji: '🍅', category: 'Veg', price: 300, trend: 24.0 },
          { id: '5', crop: 'Mango', emoji: '🥭', category: 'Fruit', price: 150, trend: -5.0 }
        );
      }
      setPrices(fetchedPrices);
    } catch (error) {
      console.error('Failed to fetch market prices:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchPrices();
    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredPrices = useMemo(() => {
    if (selectedCategory === 'All') return prices;
    return prices.filter(p => p.category === selectedCategory);
  }, [prices, selectedCategory]);

  const topSpikeItem = useMemo(() => {
    if (prices.length === 0) return null;
    return prices.reduce((max, item) => (item.trend > max.trend ? item : max), prices[0]);
  }, [prices]);

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Live Prices</Text>
        <Text style={styles.headerSubtitle}>Average per KG in your area</Text>
      </View>

      <View style={styles.filterContainer}>
        {CATEGORIES.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity 
              key={cat} 
              style={[styles.filterChip, isSelected && styles.filterChipSelected]}
              onPress={() => setSelectedCategory(cat)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: MarketPrice }) => {
    const isPositive = item.trend >= 0;
    const trendColor = isPositive ? colors.farmer.primary : '#d9534f';
    const trendIcon = isPositive ? 'trending-up' : 'trending-down';
    
    return (
      <View style={styles.priceRow}>
        <View style={styles.cropInfo}>
          <Text style={styles.emoji}>{item.emoji}</Text>
          <Text style={styles.cropName}>{item.crop}</Text>
        </View>
        <View style={styles.priceDetails}>
          <Text style={styles.priceText}>Rs. {item.price}</Text>
          <View style={[styles.trendBadge, { backgroundColor: isPositive ? colors.farmer.light : '#fdeeea' }]}>
            <Icon name={trendIcon} size={14} color={trendColor} />
            <Text style={[styles.trendText, { color: trendColor }]}>
              {isPositive ? '+' : ''}{item.trend}%
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!topSpikeItem || topSpikeItem.trend <= 0) return null;
    return (
      <View style={styles.aiTipCard}>
        <View style={styles.aiTipHeader}>
          <Icon name="bulb-outline" size={24} color="#f5a623" />
          <Text style={styles.aiTipTitle}>AI Market Insight</Text>
        </View>
        <Text style={styles.aiTipBody}>
          <Text style={{ fontWeight: 'bold' }}>{topSpikeItem.crop}</Text> prices have spiked by 
          <Text style={{ fontWeight: 'bold', color: colors.farmer.primary }}> {topSpikeItem.trend}% </Text> 
          recently. Consider harvesting or listing now to maximize your profit!
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.farmer.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredPrices}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.farmer.primary]} />
          }
          ListEmptyComponent={<Text style={styles.emptyText}>No prices found for {selectedCategory}.</Text>}
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
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.common.border, // Fallback gray
    marginRight: 10,
    marginBottom: 10,
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
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  cropInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  cropName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  priceDetails: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trendText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  aiTipCard: {
    marginTop: 20,
    padding: 16,
    backgroundColor: colors.common.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f5a623',
    borderLeftWidth: 6,
  },
  aiTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f5a623',
    marginLeft: 8,
  },
  aiTipBody: {
    fontSize: 14,
    color: colors.common.textSecondary,
    lineHeight: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },
});

export default MarketPricesScreen;
