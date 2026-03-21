import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { db, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

interface DealData {
  crop: string;
  quantity: string;
  price: number;
  total: number;
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED';
}

interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  createdAt: string;
  isDeal?: boolean;
  dealData?: DealData;
}

const getRoleEmoji = (role: string) => {
  if (role === 'FARMER') return '🧑‍🌾';
  if (role === 'BUYER') return '🛒';
  if (role === 'SHOP') return '🏪';
  return '👤';
};

const getRoleColor = (role: string | null) => {
  if (role === 'FARMER') return colors.farmer.primary;
  if (role === 'BUYER') return colors.buyer.primary;
  if (role === 'SHOP') return colors.agriShop.primary;
  return colors.common.textSecondary; 
};

const ChatScreen = () => {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const user = useAuthStore(state => state.user);
  
  // Destructuring navigational parameters routed securely from arrays
  const { 
    targetUserId = 'user_2', 
    targetUserName = 'Trading Partner', 
    targetUserRole = 'FARMER', 
    contextTitle = 'General Inquiry' 
  } = route.params || {};

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  
  const flatListRef = useRef<FlatList>(null);
  
  // Unique Thread ID mathematically derived predictably 
  const chatId = [user?.id || 'me', targetUserId].sort().join('_');
  const myColor = getRoleColor(user?.role || null);

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = db.collection(Collections.chat_messages)
      .where('chatId', '==', chatId)
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snapshot) => {
          const fetchedMessages: Message[] = [];
          snapshot.forEach(doc => {
            fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
          });

          // Mock Data Injection ensuring display rendering behaves gracefully
          if (fetchedMessages.length === 0 && loading) {
            fetchedMessages.push(
              { id: 'm1', chatId, senderId: targetUserId, text: `Hello! I saw your post regarding ${contextTitle}.`, createdAt: new Date(Date.now() - 600000).toISOString() },
              { id: 'm2', chatId, senderId: user.id, text: "Yes, how much do you need?", createdAt: new Date(Date.now() - 300000).toISOString() },
              { id: 'm3', chatId, senderId: targetUserId, text: "I need 500kg. Can you do Rs. 150/kg?", createdAt: new Date(Date.now() - 150000).toISOString() }
            );

            // Mocking an initial Deal proposal if target is Farmer
            if (targetUserRole === 'FARMER') {
              fetchedMessages.push({
                id: 'm4',
                chatId,
                senderId: targetUserId,
                text: "Here is my final offer.",
                createdAt: new Date(Date.now() - 60000).toISOString(),
                isDeal: true,
                dealData: { crop: contextTitle, quantity: '500 kg', price: 155, total: 77500, status: 'PROPOSED' }
              });
            }
          }

          setMessages(fetchedMessages);
          setLoading(false);
          
          // Force layout jump directly mapping to bottom payload
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        },
        (error) => {
          console.error("Chat sync error:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, [user, chatId]);

  const handleSend = async () => {
    if (!inputText.trim() || !user?.id) return;

    const textToSend = inputText.trim();
    setInputText(''); 

    try {
      await db.collection(Collections.chat_messages).add({
        chatId: chatId,
        senderId: user.id,
        text: textToSend,
        createdAt: new Date().toISOString()
      });
      // Fire-and-forget; onSnapshot dynamically sweeps the render array!
    } catch (err) {
      console.error('Message failed to transmit', err);
      Alert.alert('Send Error', 'Could not deliver the message directly. Check your network.');
    }
  };

  const handleAcceptPayHere = (msgId: string, total: number) => {
    // Implementing PayHere mock routing simulating checkout behavior 
    Alert.alert(
      'Initialize PayHere Gateway',
      `You are about to securely transfer Rs. ${total.toLocaleString()} to ${targetUserName}.\n\nProceed to checkout?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Accept & Pay', 
          onPress: async () => {
            try {
               await db.collection(Collections.chat_messages).doc(msgId).update({
                 'dealData.status': 'ACCEPTED'
               });
               Alert.alert('Payment Successful!', 'Funds placed in escrow securely until fulfillment.');
            } catch (e) {
               console.log('Failing to accept local mock state natively', e);
            }
          } 
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;
    const timeStr = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.messageWrapper, isMe ? styles.messageWrapperMe : styles.messageWrapperThem]}>
        
        {item.isDeal && item.dealData ? (
          // Deal Card Execution
          <View style={[styles.dealCard, { borderColor: isMe ? myColor : colors.common.border }]}>
            <View style={styles.dealHeader}>
              <Icon name="hand-left" size={18} color={isMe ? myColor : colors.common.textPrimary} />
              <Text style={styles.dealTitle}>Deal Proposed</Text>
            </View>
            <Text style={styles.dealDesc}>{item.dealData.crop} • {item.dealData.quantity}</Text>
            <Text style={styles.dealDesc}>Rate: Rs. {item.dealData.price} /kg</Text>
            <View style={styles.dealDivider} />
            <Text style={styles.dealTotal}>Total: Rs. {item.dealData.total.toLocaleString()}</Text>
            
            {!isMe && user?.role === 'BUYER' && item.dealData.status === 'PROPOSED' && (
              <TouchableOpacity 
                style={styles.payHereBtn} 
                onPress={() => handleAcceptPayHere(item.id, item.dealData!.total)}
              >
                <Icon name="card-outline" size={18} color="#fff" />
                <Text style={styles.payHereBtnText}>Accept & Pay</Text>
              </TouchableOpacity>
            )}

            {item.dealData.status === 'ACCEPTED' && (
              <View style={styles.acceptedBadge}>
                <Icon name="checkmark-circle" size={16} color="#4caf50" />
                <Text style={styles.acceptedText}>Deal Accepted</Text>
              </View>
            )}
            
            <Text style={[styles.messageTime, { alignSelf: 'flex-end', marginTop: 8 }]}>{timeStr}</Text>
          </View>
        ) : (
          // Generic Text Message Execution
          <View style={[styles.bubble, isMe ? { backgroundColor: myColor } : styles.bubbleThem]}>
            <Text style={[styles.messageText, isMe ? styles.messageTextMe : styles.messageTextThem]}>
              {item.text}
            </Text>
            <Text style={[styles.messageTime, isMe ? styles.messageTimeMe : styles.messageTimeThem]}>
              {timeStr}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      
      {/* Header scaling directly to Authenticated User's Profile Scheme */}
      <View style={[styles.header, { backgroundColor: myColor }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.common.white} />
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>
            {getRoleEmoji(targetUserRole)} {targetUserName}
          </Text>
          <Text style={styles.headerSubtitle}>
            Regarding: {contextTitle}
          </Text>
        </View>
        <View style={{ width: 30 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={myColor} />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type a message..."
            placeholderTextColor="#aaa"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, { backgroundColor: inputText.trim() ? myColor : colors.common.border }]} 
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Icon name="send" size={18} color={colors.common.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  keyboardView: {
    flex: 1,
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
    paddingTop: Platform.OS === 'android' ? 20 : 16, // SafeArea padding fallback
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
  headerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontStyle: 'italic',
  },
  listContent: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginVertical: 4,
    maxWidth: '85%',
  },
  messageWrapperMe: {
    alignSelf: 'flex-end',
  },
  messageWrapperThem: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  bubbleThem: {
    backgroundColor: '#e4e6eb',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextMe: {
    color: colors.common.white,
  },
  messageTextThem: {
    color: colors.common.textPrimary,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  messageTimeMe: {
    color: 'rgba(255,255,255,0.7)',
  },
  messageTimeThem: {
    color: colors.common.textSecondary,
  },
  dealCard: {
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    width: 250,
  },
  dealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dealTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginLeft: 6,
  },
  dealDesc: {
    fontSize: 14,
    color: colors.common.textSecondary,
    marginBottom: 4,
  },
  dealDivider: {
    height: 1,
    backgroundColor: colors.common.border,
    marginVertical: 12,
  },
  dealTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 12,
  },
  payHereBtn: {
    backgroundColor: '#004c99', // Core generic PayHere Blue shade mapped logically
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  payHereBtnText: {
    color: colors.common.white,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  acceptedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  acceptedText: {
    color: '#4caf50',
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.common.white,
    borderTopWidth: 1,
    borderTopColor: colors.common.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
  },
  textInput: {
    flex: 1,
    backgroundColor: '#f5f7fa',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    maxHeight: 100,
    fontSize: 15,
    color: colors.common.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});

export default ChatScreen;
