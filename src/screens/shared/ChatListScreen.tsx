import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import api from '../../services/api';
import { colors } from '../../constants/colors';

interface ChatConversation {
  partnerId: string;
  partnerName: string;
  partnerRole: string;
  lastMessage: string;
  lastMessageType: string;
  lastMessageTime: string;
  unreadCount: number;
}

export default function ChatListScreen() {
  const navigation = useNavigation<any>();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const response = await api.get('/chat/conversations');
      if (response.data.success) {
        setConversations(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchConversations();
    });
    return unsubscribe;
  }, [navigation]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConversations();
  };

  const handleOpenChat = (conv: ChatConversation) => {
    navigation.navigate('ChatScreen', {
      partnerId: conv.partnerId,
      partnerName: conv.partnerName,
      partnerRole: conv.partnerRole,
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'DEAL_PROPOSE': return '🤝';
      case 'DEAL_ACCEPT': return '✅';
      case 'DEAL_REJECT': return '❌';
      case 'PAYMENT_DONE': return '💳';
      case 'ORDER_UPDATE': return '📦';
      default: return '💬';
    }
  };

  const renderItem = ({ item }: { item: ChatConversation }) => (
    <TouchableOpacity 
      style={[styles.chatCard, item.unreadCount > 0 && styles.unreadCard]}
      onPress={() => handleOpenChat(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {item.partnerRole === 'FARMER' ? '🧑🌾' : item.partnerRole === 'BUYER' ? '🛒' : '🏪'}
        </Text>
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.partnerName, item.unreadCount > 0 && styles.boldText]}>
            {item.partnerName}
          </Text>
          <Text style={[styles.timeText, item.unreadCount > 0 && styles.unreadTimeText]}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text style={styles.roleText}>{item.partnerRole}</Text>
        
        <View style={styles.messageRow}>
          <Text 
            style={[styles.lastMessage, item.unreadCount > 0 && styles.boldText]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {getIconForType(item.lastMessageType)} {item.lastMessage}
          </Text>
          
          {item.unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages & Deals</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.farmer.primary} />
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.partnerId}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="chatbubbles-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No messages or deals yet.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.common.background },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  placeholder: { width: 36 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContainer: { padding: 16 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#f0f8ff',
    borderColor: 'rgba(26, 95, 168, 0.2)',
    borderWidth: 1,
  },
  avatar: {
    width: 50, height: 50, borderRadius: 25, 
    backgroundColor: '#f0f0f0', 
    justifyContent: 'center', alignItems: 'center',
    marginRight: 14
  },
  avatarText: { fontSize: 24 },
  chatInfo: { flex: 1, justifyContent: 'center' },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  partnerName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  roleText: { fontSize: 11, color: '#666', marginBottom: 6 },
  timeText: { fontSize: 12, color: '#888' },
  unreadTimeText: { color: colors.farmer.primary, fontWeight: '600' },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#555', flex: 1, marginRight: 8 },
  boldText: { fontWeight: 'bold', color: '#000' },
  badge: {
    backgroundColor: '#e24b4a',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6
  },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { marginTop: 16, fontSize: 16, color: '#888' }
});
