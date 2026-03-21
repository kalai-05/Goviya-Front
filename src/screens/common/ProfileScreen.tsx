import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../constants/colors';

const getThemeColor = (role: string | null) => {
  if (role === 'FARMER') return colors.farmer.primary;
  if (role === 'BUYER') return colors.buyer.primary;
  if (role === 'SHOP') return colors.agriShop.primary;
  return colors.common.textSecondary;
};

const getRoleDisplay = (role: string | null) => {
  if (role === 'FARMER') return 'Farmer 🧑‍🌾';
  if (role === 'BUYER') return 'Buyer 🛒';
  if (role === 'SHOP') return 'Agri Shop 🏪';
  return 'User 👤';
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const themeColor = getThemeColor(user?.role || null);
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Simulating fetching dynamic metrics uniquely mapped to the logged-in role
  const [mockFarmerStats] = useState({ totalDeals: 14, earned: 285000, rating: 4.8, memberSince: 'Oct 2025' });
  const [mockShopStats] = useState({ totalInquiries: 85, rating: 4.9, memberSince: 'Jan 2026' });
  const [mockBuyerStats] = useState({ totalPurchased: 5, rating: 5.0, memberSince: 'Mar 2026' });

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to securely log out of your Goviya account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            setTimeout(() => {
              logout(); 
              // Calling logout securely nullifies `user` in Zustand, automatically forcing AppNavigator to unmount the Main App stack and pop back to AuthNavigator via React rendering!
            }, 600);
          } 
        }
      ]
    );
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Navigation to a dedicated Profile Form triggered natively.');
  };

  const profileRow = (icon: string, label: string, value: string) => (
    <View style={styles.infoRow}>
      <Icon name={icon} size={22} color={colors.common.textSecondary} style={styles.infoIcon} />
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header Core - Natively Colored per authentication state */}
          <View style={[styles.headerBackground, { backgroundColor: themeColor }]} />

          <View style={styles.profileHeader}>
            <View style={[styles.avatarCircle, { borderColor: themeColor + '80' }]}>
              <Text style={[styles.avatarText, { color: themeColor }]}>{userInitial}</Text>
            </View>
            
            <Text style={styles.userName}>{user?.name || 'Registered User'}</Text>
            
            <View style={[styles.roleBadge, { backgroundColor: themeColor + '20' }]}>
              <Text style={[styles.roleText, { color: themeColor }]}>
                {getRoleDisplay(user?.role || null)}
              </Text>
            </View>
            
            <View style={styles.subInfoRow}>
              <Icon name="location-outline" size={14} color={colors.common.textSecondary} />
              <Text style={styles.subInfoText}>{user?.district || 'Location Unset'}</Text>
              <Text style={styles.subInfoDot}>•</Text>
              <Icon name="star" size={14} color="#f5a623" />
              <Text style={styles.subInfoText}>
                {user?.role === 'FARMER' ? mockFarmerStats.rating : user?.role === 'SHOP' ? mockShopStats.rating : mockBuyerStats.rating}
              </Text>
            </View>
          </View>

          {/* Conditional Analytics Blocks mapping specifically to the user rendering this screen */}
          {user?.role === 'FARMER' && (
            <View style={styles.statsCard}>
              <View style={styles.statBlock}>
                <Text style={styles.statNumber}>{mockFarmerStats.totalDeals}</Text>
                <Text style={styles.statLabel}>Deals Closed</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={[styles.statNumber, { color: colors.farmer.primary }]}>Rs. {mockFarmerStats.earned.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Earned</Text>
              </View>
            </View>
          )}

          {user?.role === 'SHOP' && (
            <View style={styles.statsCard}>
              <View style={styles.statBlock}>
                <Text style={styles.statNumber}>{mockShopStats.totalInquiries}</Text>
                <Text style={styles.statLabel}>Total Inquiries</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBlock}>
                <Text style={[styles.statNumber, { color: colors.agriShop.primary }]}>{mockShopStats.rating}</Text>
                <Text style={styles.statLabel}>Avg. Rating</Text>
              </View>
            </View>
          )}

          {/* Static Personal Records List */}
          <View style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            {profileRow('call-outline', 'Phone Number', user?.phone || '+94 XXXXXXXXX')}
            {profileRow('map-outline', 'Registered District', user?.district || 'Unknown')}
            {profileRow('language-outline', 'App Language', user?.language === 'si' ? 'සිංහල (Sinhala)' : user?.language === 'ta' ? 'தமிழ் (Tamil)' : 'English')}
            {profileRow('calendar-outline', 'Member Since', user?.role === 'FARMER' ? mockFarmerStats.memberSince : 'Oct 2025')}
          </View>

          {/* User Controls */}
          <TouchableOpacity 
            style={[styles.editButton, { borderColor: themeColor, backgroundColor: themeColor + '10' }]}
            onPress={handleEditProfile}
          >
            <Icon name="pencil" size={18} color={themeColor} />
            <Text style={[styles.editButtonText, { color: themeColor }]}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Icon name="log-out-outline" size={20} color="#d9534f" />
            <Text style={styles.logoutButtonText}>Log Out</Text>
          </TouchableOpacity>

        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  headerBackground: {
    height: 140,
    width: '100%',
    position: 'absolute',
    top: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 20,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.common.white,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  roleBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  roleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subInfoText: {
    fontSize: 14,
    color: colors.common.textSecondary,
    marginLeft: 4,
    fontWeight: '500',
  },
  subInfoDot: {
    fontSize: 14,
    color: '#ccc',
    marginHorizontal: 8,
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.common.white,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.common.border,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.common.textSecondary,
    fontWeight: '600',
  },
  detailsCard: {
    backgroundColor: colors.common.white,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoIcon: {
    width: 24,
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    color: colors.common.textPrimary,
    fontWeight: '500',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#fdeeea', // Very light red
    borderWidth: 1,
    borderColor: '#fad2cf',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#d9534f',
    marginLeft: 8,
  },
});

export default ProfileScreen;
