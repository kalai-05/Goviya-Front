import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

interface Inquiry {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  userRole: 'FARMER' | 'BUYER';
  message: string;
  createdAt: string;
  isRead: boolean;
  replyMessage?: string;
  replyAt?: string;
}

const InquiriesScreen = () => {
  const user = useAuthStore(state => state.user);

  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);

  // Reply Sheet State managed locally
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    
    // Subscribe directly to onSnapshot to facilitate real-time chat previews and dynamic unread badge recalculations
    const unsubscribe = db.collection(Collections.shop_inquiries)
      .where('shopId', '==', user.id)
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (snapshot) => {
          const newInquiries: Inquiry[] = [];
          snapshot.forEach(doc => {
            const data = doc.data();
            newInquiries.push({
              id: doc.id,
              shopId: data.shopId,
              userId: data.userId || 'u1',
              userName: data.userName || 'Unknown User',
              userRole: data.userRole || 'FARMER',
              message: data.message || 'No message provided.',
              createdAt: data.createdAt || new Date().toISOString(),
              isRead: data.isRead || false,
              replyMessage: data.replyMessage,
              replyAt: data.replyAt,
            });
          });

          // Fallback seeding injection 
          if (newInquiries.length === 0 && loading) {
            newInquiries.push(
              { id: '1', shopId: user.id, userId: 'u1', userName: 'Sunil Silva', userRole: 'FARMER', message: 'Do you have Urea 50kg bags in stock?', createdAt: new Date(Date.now() - 3600000).toISOString(), isRead: false },
              { id: '2', shopId: user.id, userId: 'u2', userName: 'Kamal Perera', userRole: 'BUYER', message: 'Can I order 10 empty crates for tomorrow?', createdAt: new Date(Date.now() - 86400000).toISOString(), isRead: true, replyMessage: 'Yes, we have 50 crates available.', replyAt: new Date(Date.now() - 76400000).toISOString() }
            );
          }
          
          setInquiries(newInquiries);
          setLoading(false);
        },
        (error) => {
          console.error('Error listening to inquiries:', error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user, loading]);

  const markAsRead = async (inquiry: Inquiry) => {
    if (!inquiry.isRead && inquiry.id !== '1') { // Excluding dummy id '1' from read-writes 
      try {
        await db.collection(Collections.shop_inquiries).doc(inquiry.id).update({ isRead: true });
      } catch (err) {
        console.error('Failed to update read status natively', err);
      }
    }
  };

  const openReplySheet = (inquiry: Inquiry) => {
    setSelectedInquiry(inquiry);
    setReplyText(inquiry.replyMessage || '');
    markAsRead(inquiry); 
  };

  const handleSendReply = async () => {
    if (!selectedInquiry || !replyText.trim()) {
      Alert.alert('Empty Reply', 'Please enter a message to send back to the user.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (selectedInquiry.id !== '1' && selectedInquiry.id !== '2') {
        await db.collection(Collections.shop_inquiries).doc(selectedInquiry.id).update({
          isRead: true,
          replyMessage: replyText.trim(),
          replyAt: new Date().toISOString()
        });
      } else {
         // Local array UI simulation if using mock objects
         setInquiries(prev => prev.map(i => i.id === selectedInquiry.id ? {
            ...i, isRead: true, replyMessage: replyText.trim(), replyAt: new Date().toISOString()
         } : i));
      }

      setSelectedInquiry(null);
      setReplyText('');
    } catch (error: any) {
      Alert.alert('Reply Error', error.message || 'Failed to send reply to the server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Inquiries</Text>
      <Text style={styles.headerSubtitle}>Respond to farmers & buyers instantly</Text>
    </View>
  );

  const renderItem = ({ item }: { item: Inquiry }) => {
    const isFarmer = item.userRole === 'FARMER';
    const roleColor = isFarmer ? colors.farmer.primary : colors.buyer.primary; 
    const roleEmoji = isFarmer ? '🧑‍🌾' : '🛒';
    
    const dateStr = new Date(item.createdAt).toLocaleDateString() + ' ' + new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

    return (
      <View style={[styles.card, !item.isRead && styles.cardUnread]}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={[styles.roleDot, { backgroundColor: roleColor }]} />
            <Text style={styles.roleEmoji}>{roleEmoji}</Text>
            <Text style={[styles.userName, !item.isRead && { fontWeight: 'bold', color: colors.common.textPrimary }]}>
              {item.userName}
            </Text>
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>
        
        <Text style={[styles.messageText, !item.isRead && { fontWeight: 'bold' }]}>
          "{item.message}"
        </Text>

        {item.replyMessage ? (
          <View style={styles.replyBox}>
            <Text style={styles.replyLabel}>Your Reply:</Text>
            <Text style={styles.replyTextBody}>{item.replyMessage}</Text>
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.replyBtn}
            onPress={() => openReplySheet(item)}
          >
            <Icon name="arrow-undo-outline" size={16} color={colors.agriShop.primary} />
            <Text style={styles.replyBtnText}>Respond</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.agriShop.primary} />
        </View>
      ) : (
        <FlatList
          data={inquiries}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No inquiries caught right now.</Text>}
        />
      )}

      {/* Reply Bottom Sheet via Native Modal Hook */}
      <Modal visible={!!selectedInquiry} animationType="slide" transparent>
        <KeyboardAvoidingView 
          style={styles.modalOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Reply to {selectedInquiry?.userName}</Text>
              <TouchableOpacity onPress={() => setSelectedInquiry(null)} style={styles.closeButton}>
                <Icon name="close" size={24} color={colors.common.textPrimary} />
              </TouchableOpacity>
            </View>

            {selectedInquiry && (
              <View style={styles.sheetTargetRow}>
                <Text style={styles.sheetTargetSub}>
                  <Icon name="chatbox-ellipses" /> "{selectedInquiry.message}"
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. Yes, we have plenty in stock!"
              multiline
              numberOfLines={4}
              value={replyText}
              onChangeText={setReplyText}
              autoFocus
            />

            <TouchableOpacity 
              style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleSendReply}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                 <ActivityIndicator color={colors.common.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Reply</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: colors.agriShop.primary, // #7a4f00
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
    color: colors.agriShop.light,
  },
  card: {
    backgroundColor: colors.common.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  cardUnread: {
    backgroundColor: '#fffdf5', // Extremely light amber backdrop mapping unread hooks computationally
    borderColor: '#f5a623',
    borderLeftWidth: 4, 
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
  },
  roleEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  userName: {
    fontSize: 14,
    color: colors.common.textSecondary,
  },
  dateText: {
    fontSize: 12,
    color: colors.common.textSecondary,
  },
  messageText: {
    fontSize: 15,
    color: colors.common.textPrimary,
    lineHeight: 22,
    marginBottom: 12,
  },
  replyBox: {
    backgroundColor: colors.common.background,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.agriShop.primary,
  },
  replyLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.agriShop.primary,
    marginBottom: 4,
  },
  replyTextBody: {
    fontSize: 14,
    color: colors.common.textPrimary,
  },
  replyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: colors.agriShop.light,
  },
  replyBtnText: {
    color: colors.agriShop.primary,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  emptyText: {
    textAlign: 'center',
    color: colors.common.textSecondary,
    marginTop: 40,
    fontSize: 16,
  },

  // Modal / Generic Bottom Sheet CSS overrides
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: colors.common.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  closeButton: {
    padding: 4,
  },
  sheetTargetRow: {
    backgroundColor: '#fffdf5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#f5a623',
  },
  sheetTargetSub: {
    fontSize: 14,
    color: colors.common.textPrimary,
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  textArea: {
    backgroundColor: colors.common.background,
    borderWidth: 1,
    borderColor: colors.common.border,
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
    color: colors.common.textPrimary,
    minHeight: 120,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  submitButton: {
    backgroundColor: colors.agriShop.primary,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 24 : 0, 
  },
  submitButtonText: {
    color: colors.common.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default InquiriesScreen;
