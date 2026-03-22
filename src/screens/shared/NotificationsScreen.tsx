import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { db } from '../../services/firebase';
import { colors } from '../../constants/colors';

type NotifType = 'WEATHER_ALERT' | 'PRICE_SPIKE' | 'BUYER_INTEREST' | 'DEAL_CONFIRMED' | 'DISEASE_ALERT' | 'SYSTEM';

interface AppNotification {
  id: string;
  userId: string;
  type: NotifType;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}

const getNotifConfig = (type: NotifType) => {
  switch (type) {
    case 'WEATHER_ALERT': return { color: '#d9534f', icon: 'thunderstorm' }; // Red
    case 'PRICE_SPIKE': return { color: '#4caf50', icon: 'trending-up' }; // Green
    case 'BUYER_INTEREST': return { color: '#f5a623', icon: 'cart' }; // Amber
    case 'DEAL_CONFIRMED': return { color: '#4caf50', icon: 'checkmark-circle' }; // Green
    case 'DISEASE_ALERT': return { color: '#d9534f', icon: 'warning' }; // Red
    default: return { color: colors.common.textSecondary, icon: 'notifications' }; // Gray
  }
};

const getHeaderTheme = (role: string | null) => {
  if (role === 'FARMER') return colors.farmer.primary;
  if (role === 'BUYER') return colors.buyer.primary;
  if (role === 'SHOP') return colors.agriShop.primary;
  return colors.common.textPrimary;
};

const NotificationsScreen = () => {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const themeColor = getHeaderTheme(user?.role || null);

  const fetchAndMarkAsRead = async () => {
    if (!user?.id) return;
    try {
      const snapshot = await db.collection('notifications')
        .where('userId', '==', user.id)
        .orderBy('createdAt', 'desc')
        .limit(30)
        .get();

      const fetched: AppNotification[] = [];
      const unreadIds: string[] = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          userId: data.userId,
          type: data.type || 'SYSTEM',
          title: data.title || 'Notification',
          message: data.message || '',
          createdAt: data.createdAt || new Date().toISOString(),
          isRead: data.isRead || false,
        });

        if (!data.isRead) {
          unreadIds.push(doc.id);
        }
      });

      // Dummy seeding data enforcing constraints
      if (fetched.length === 0) {
        fetched.push(
          { id: '1', userId: user.id, type: 'WEATHER_ALERT', title: 'Heavy Rain Warning', message: 'Heavy rainfall is expected in your district tomorrow.', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
          { id: '2', userId: user.id, type: 'PRICE_SPIKE', title: 'Carrot Prices Up', message: 'Carrot prices have surged by 15% in Colombo markets.', createdAt: new Date(Date.now() - 7200000).toISOString(), isRead: false },
          { id: '3', userId: user.id, type: 'BUYER_INTEREST', title: 'New Buyer Inquiry', message: 'A buyer from nearby is looking for 500kg of Rice (Nadu).', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: true },
          { id: '4', userId: user.id, type: 'DEAL_CONFIRMED', title: 'Payment Confirmed', message: 'Escrow funded! Deal for Tomatoes is successfully locked.', createdAt: new Date(Date.now() - 172800000).toISOString(), isRead: true }
        );
        // Add mocked unreads cleanly
        unreadIds.push('1', '2');
      }

      setNotifications(fetched);

      // Mutate database tracking unread nodes asynchronously mapped 
      if (unreadIds.length > 0) {
        const batch = db.batch();
        unreadIds.forEach(id => {
          if (id === '1' || id === '2') return; // Bypass dummy ids
          const ref = db.collection('notifications').doc(id);
          batch.update(ref, { isRead: true });
        });
        await batch.commit();
      }

    } catch (error) {
      console.error('Notification fetching error:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchAndMarkAsRead();
    }, [user])
  );

  const renderItem = ({ item }: { item: AppNotification }) => {
    const config = getNotifConfig(item.type);
    const timeStr = new Date(item.createdAt).toLocaleDateString() + ' ' + new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.card, !item.isRead && styles.cardUnread]}>
        <View style={styles.cardInfo}>
          <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
            <Icon name={config.icon} size={24} color={config.color} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: config.color }]} />}
              <Text style={[styles.title, !item.isRead && styles.titleUnread]}>
                {item.title}
              </Text>
            </View>
            <Text style={styles.message}>{item.message}</Text>
            <Text style={styles.timeStr}>{timeStr}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: themeColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.common.white} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={themeColor} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="notifications-off-outline" size={48} color={colors.common.textSecondary} />
              <Text style={styles.emptyText}>You're all caught up!</Text>
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
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backBtn: {
    padding: 4,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  cardUnread: {
    backgroundColor: '#f4faff', // Subtle background shift to elevate unprocessed items cleanly
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.textPrimary,
  },
  titleUnread: {
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    color: colors.common.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  timeStr: {
    fontSize: 11,
    color: '#aaa',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: colors.common.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },
});

export default NotificationsScreen;
