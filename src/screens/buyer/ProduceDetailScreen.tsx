import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { listingService } from '../../services/listingService';
import { colors } from '../../constants/colors';

type BuyerStackParamList = {
  ChatScreen: { targetUserId: string; targetUserName: string; targetUserRole: string; contextTitle: string };
};

type NavigationProp = NativeStackNavigationProp<BuyerStackParamList>;

const ProduceDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const { listingId } = route.params;

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
          const response = await listingService.getListings('');
          if (response.success) {
            const item = response.data.find((l: any) => l.id === listingId);
            if (item) {
              setListing({
                ...item,
                price: item.pricePerKg || 0,
                quantity: item.quantityKg ? `${item.quantityKg}` : '0',
                district: item.district || 'Colombo'
              });
            }
          }
      } catch (error) {
        console.error('Error loading listing detail:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [listingId]);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.buyer.primary} />
      </View>
    );
  }

  if (!listing) {
      return (
          <View style={styles.errorContainer}>
              <Text>Produce details not found.</Text>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                  <Text style={{color: colors.buyer.primary, marginTop: 10}}>Go Back</Text>
              </TouchableOpacity>
          </View>
      )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.common.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.heroSection}>
              <View style={styles.emojiContainer}>
                  <Text style={styles.emojiText}>{listing.cropEmoji || '📦'}</Text>
              </View>
              <Text style={styles.cropName}>{listing.cropName}</Text>
              <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Price:</Text>
                  <Text style={styles.priceValue}>Rs. {listing.price}/kg</Text>
              </View>
          </View>

          <View style={styles.infoSection}>
              <View style={styles.infoCard}>
                  <Text style={styles.sectionTitle}>Product Info</Text>
                  <View style={styles.detailRow}>
                      <Icon name="cube-outline" size={20} color={colors.common.textSecondary} />
                      <Text style={styles.detailLabel}>Quantity Available:</Text>
                      <Text style={styles.detailValue}>{listing.quantity} kg</Text>
                  </View>
                  <View style={styles.detailRow}>
                      <Icon name="location-outline" size={20} color={colors.common.textSecondary} />
                      <Text style={styles.detailLabel}>Location:</Text>
                      <Text style={styles.detailValue}>{listing.district}</Text>
                  </View>
                  <View style={styles.detailRow}>
                      <Icon name="time-outline" size={20} color={colors.common.textSecondary} />
                      <Text style={styles.detailLabel}>Freshness:</Text>
                      <Text style={styles.detailValue}>{listing.freshness || 'Fresh'}</Text>
                  </View>
              </View>

              <View style={styles.farmerCard}>
                  <Text style={styles.sectionTitle}>Farmer Details</Text>
                  <View style={styles.farmerRow}>
                      <Icon name="person-circle-outline" size={40} color={colors.buyer.primary} />
                      <View style={{marginLeft: 12}}>
                          <Text style={styles.farmerName}>{listing.farmerName || 'Farmer'}</Text>
                          <View style={styles.ratingRow}>
                              <Icon name="star" size={14} color="#f5a623" />
                              <Text style={styles.ratingText}>{listing.rating || '4.5'}</Text>
                          </View>
                      </View>
                  </View>
                  <Text style={styles.description}>"{listing.description || 'Quality produce harvested recently. Contact me for bulk orders.'}"</Text>
              </View>
          </View>
      </ScrollView>

      <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.chatBtn}
            onPress={() => navigation.navigate('ChatScreen' as any, { 
                partnerId: listing.farmerId, 
                partnerName: listing.farmerName || 'Farmer', 
                partnerRole: 'FARMER', 
                cropName: listing.cropName 
          })}
          >
              <Icon name="chatbubbles-outline" size={20} color={colors.common.white} />
              <Text style={styles.chatBtnText}>Contact Farmer</Text>
          </TouchableOpacity>
      </View>
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
  errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.buyer.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  heroSection: {
      alignItems: 'center',
      padding: 30,
      backgroundColor: colors.buyer.light,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
  },
  emojiContainer: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: colors.common.white,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 20,
      elevation: 5,
  },
  emojiText: {
      fontSize: 50,
  },
  cropName: {
      fontSize: 28,
      fontWeight: 'bold',
      color: colors.common.textPrimary,
  },
  priceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
  },
  priceLabel: {
      fontSize: 18,
      color: colors.common.textSecondary,
      marginRight: 8,
  },
  priceValue: {
      fontSize: 22,
      fontWeight: 'bold',
      color: colors.buyer.primary,
  },
  infoSection: {
      padding: 20,
  },
  infoCard: {
      backgroundColor: colors.common.white,
      borderRadius: 16,
      padding: 16,
      marginBottom: 20,
      elevation: 2,
  },
  farmerCard: {
      backgroundColor: colors.common.white,
      borderRadius: 16,
      padding: 16,
      elevation: 2,
  },
  sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: colors.common.textPrimary,
      marginBottom: 15,
  },
  detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  detailLabel: {
      fontSize: 14,
      color: colors.common.textSecondary,
      marginLeft: 10,
      flex: 1,
  },
  detailValue: {
      fontSize: 14,
      fontWeight: 'bold',
      color: colors.common.textPrimary,
  },
  farmerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  farmerName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.common.textPrimary,
  },
  ratingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 2,
  },
  ratingText: {
      fontSize: 12,
      color: '#f5a623',
      marginLeft: 4,
  },
  description: {
      fontSize: 14,
      color: colors.common.textSecondary,
      fontStyle: 'italic',
      lineHeight: 20,
  },
  footer: {
      padding: 20,
      backgroundColor: colors.common.white,
      borderTopWidth: 1,
      borderTopColor: colors.common.border,
  },
  chatBtn: {
      backgroundColor: colors.buyer.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 15,
      borderRadius: 12,
  },
  chatBtnText: {
      color: colors.common.white,
      fontSize: 16,
      fontWeight: 'bold',
      marginLeft: 10,
  }
});

export default ProduceDetailScreen;
