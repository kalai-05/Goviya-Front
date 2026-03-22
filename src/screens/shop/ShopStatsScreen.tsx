import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../constants/colors';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

const ShopStatsScreen = () => {
  const user = useAuthStore(state => state.user);

  const currentMonthIndex = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [loading, setLoading] = useState(false);

  // Generate dynamic mock telemetry as Firestore tracking schemas for deep analytics are unindexed
  const [stats, setStats] = useState({
    views: 0,
    inquiries: 0,
    revenue: 0,
    rating: '0.0',
    topProducts: [] as TopProduct[],
    restockTip: ''
  });

  useEffect(() => {
    // Simulating a network fetch delay for data calculation
    setLoading(true);
    const timer = setTimeout(() => {
      const baseMulti = MONTHS.indexOf(selectedMonth) + 1;
      
      const newStats = {
        views: 120 + baseMulti * 15 + Math.floor(Math.random() * 20),
        inquiries: 12 + baseMulti * 2 + Math.floor(Math.random() * 5),
        revenue: 45000 + baseMulti * 5000 + Math.floor(Math.random() * 10000),
        rating: (4.2 + (baseMulti % 5) * 0.1).toFixed(1),
        topProducts: [
          { id: '1', name: 'Urea Fertilizer 50kg', sales: 45 + baseMulti, revenue: 125000 },
          { id: '2', name: 'Tomato Seeds (Hybrid)', sales: 30 + baseMulti * 2, revenue: 45000 },
          { id: '3', name: 'Water Pump 2HP', sales: 2 + (baseMulti % 3), revenue: 30000 },
        ].sort((a, b) => b.sales - a.sales),
        restockTip: baseMulti % 2 === 0 ? 'Tomato Seeds (Hybrid)' : 'Urea Fertilizer 50kg'
      };

      setStats(newStats);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [selectedMonth]);

  const StatCard = ({ title, value, icon, color, prefix = '' }: { title: string, value: string | number, icon: string, color: string, prefix?: string }) => (
    <View style={styles.statCard}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <Text style={styles.statValue}>{prefix}{typeof value === 'number' ? value.toLocaleString() : value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Month Selector Carousel (Sticky Top) */}
      <View style={styles.monthSelectorContainer}>
        <FlatList
          data={MONTHS}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={item => item}
          initialScrollIndex={Math.max(0, currentMonthIndex - 2)}
          getItemLayout={(data, index) => ({ length: 80, offset: 80 * index, index })}
          renderItem={({ item }) => {
            const isSelected = selectedMonth === item;
            return (
              <TouchableOpacity
                style={[styles.monthChip, isSelected && styles.monthChipSelected]}
                onPress={() => setSelectedMonth(item)}
              >
                <Text style={[styles.monthText, isSelected && styles.monthTextSelected]}>
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.monthList}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.agriShop.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Shop Stats</Text>
            <Text style={styles.headerSubtitle}>Performance for {selectedMonth} 2026</Text>
          </View>

          {/* Core Analytics Details */}
          <View style={styles.statsGrid}>
            <StatCard title="Profile Views" value={stats.views} icon="eye" color="#4a90e2" />
            <StatCard title="Inquiries" value={stats.inquiries} icon="chatbubbles" color="#50e3c2" />
            <StatCard title="Est. Revenue" value={stats.revenue} icon="cash" color="#4caf50" prefix="Rs. " />
            <StatCard title="Avg Rating" value={stats.rating} icon="star" color="#f5a623" />
          </View>

          {/* AI Restock Suggestion */}
          <View style={styles.aiTipCard}>
             <View style={styles.aiHeader}>
                <Icon name="sparkles" size={20} color={colors.common.white} />
                <Text style={styles.aiTitle}>Goviya AI Tip</Text>
             </View>
             <Text style={styles.aiBody}>
                Based on your {selectedMonth} metrics, sales for <Text style={{fontWeight: 'bold'}}>"{stats.restockTip}"</Text> are surging! 
                Consider restocking soon to avoid losing active buyers to competitors.
             </Text>
             <TouchableOpacity style={styles.aiActionBtn}>
                <Text style={styles.aiActionText}>Restock Inventory</Text>
                <Icon name="arrow-forward" size={16} color={colors.agriShop.primary} />
             </TouchableOpacity>
          </View>

          {/* Top Products Breakdown */}
          <Text style={styles.sectionTitle}>Top Products ({selectedMonth})</Text>
          <View style={styles.topProductsContainer}>
            {stats.topProducts.map((product, index) => (
              <View key={product.id}>
                <View style={styles.productRow}>
                  <View style={styles.productRankBox}>
                    <Text style={styles.productRankText}>#{index + 1}</Text>
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productSales}>{product.sales} sales • Est. Rs. {product.revenue.toLocaleString()}</Text>
                  </View>
                </View>
                {index < stats.topProducts.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
          </View>

        </ScrollView>
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
  monthSelectorContainer: {
    backgroundColor: colors.common.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border,
    paddingVertical: 12,
  },
  monthList: {
    paddingHorizontal: 16,
  },
  monthChip: {
    width: 60,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: colors.common.background,
  },
  monthChipSelected: {
    backgroundColor: colors.agriShop.primary, // #7a4f00
  },
  monthText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textSecondary,
  },
  monthTextSelected: {
    color: colors.common.white,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    backgroundColor: colors.agriShop.primary, 
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
    color: colors.agriShop.light,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    alignItems: 'flex-start', // Shifted left to fit larger numbers cleanly
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 12,
    color: colors.common.textSecondary,
    fontWeight: '600',
  },
  aiTipCard: {
    backgroundColor: colors.agriShop.primary,
    borderRadius: 16,
    padding: 2, // Slight padding to enclose exact inner boundary cleanly
    marginBottom: 24,
    shadowColor: colors.agriShop.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    paddingBottom: 8,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.white,
    marginLeft: 8,
  },
  aiBody: {
    fontSize: 14,
    color: colors.common.white,
    lineHeight: 22,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  aiActionBtn: {
    backgroundColor: '#fffcf5', // Light Amber match pulling out AI actions 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  aiActionText: {
    color: colors.agriShop.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 16,
  },
  topProductsContainer: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productRankBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.agriShop.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productRankText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.agriShop.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  productSales: {
    fontSize: 13,
    color: colors.common.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.common.border,
  },
});

export default ShopStatsScreen;
