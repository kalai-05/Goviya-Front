import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, SafeAreaView
} from 'react-native';
import { useAuthStore } from '../../store/authStore';
import { wsService } from '../../services/websocketService';
import api from '../../services/api';
import { paymentService } from '../../services/paymentService';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  receiverId: string;
  message: string;
  type: string;
  dealDetails?: {
    cropName: string;
    quantityKg: number;
    pricePerKg: number;
    totalPrice: number;
  };
  orderId?: string;
  isRead: boolean;
  sentAt: string;
}

interface ChatScreenProps {
  route: {
    params: {
      partnerId: string;
      partnerName: string;
      partnerRole: string;
      cropName?: string;
    };
  };
}

export default function ChatScreen({ route }: ChatScreenProps) {
  const { partnerId, partnerName, partnerRole, cropName } = route.params;
  const { user } = useAuthStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [wsConnected, setWsConnected] = useState(false);
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealPrice, setDealPrice] = useState('');
  const [dealQty, setDealQty] = useState('');
  const flatListRef = useRef<FlatList>(null);

  const myColor = user?.role === 'FARMER' ? '#1a7a4a' : '#1a5fa8';

  useEffect(() => {
    loadHistory();
    connectWebSocket();
    return () => {
      wsService.removeHandler('chatScreen');
    };
  }, []);

  const loadHistory = async () => {
    try {
      const response = await api.get('/chat/history/' + partnerId);
      setMessages(response.data.data);
      wsService.markAsRead(partnerId);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = async () => {
    try {
      if (!wsService.isConnected()) {
        await wsService.connect();
      }
      setWsConnected(true);

      wsService.onMessage('chatScreen', (msg: any) => {
        const isRelevant =
          (msg.senderId === partnerId && msg.receiverId === user?.id) ||
          (msg.senderId === user?.id && msg.receiverId === partnerId);

        if (!isRelevant) return;

        if (msg.type === 'READ_RECEIPT') {
          setMessages(prev =>
            prev.map(m =>
              m.senderId === user?.id ? { ...m, isRead: true } : m
            )
          );
          return;
        }

        setMessages(prev => {
          const exists = prev.find(m => m.id === msg.id);
          if (exists) return prev;
          return [...prev, msg];
        });

        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);

        if (msg.senderId === partnerId) {
          wsService.markAsRead(partnerId);
        }
      });
    } catch (err) {
      console.error('WebSocket connect error:', err);
      setWsConnected(false);
    }
  };

  const handleSend = () => {
    if (!inputText.trim() || !wsConnected) return;
    wsService.sendMessage(partnerId, inputText.trim());
    setInputText('');
  };

  const handleProposeDeal = () => {
    const price = parseFloat(dealPrice);
    const qty = parseFloat(dealQty);
    if (!price || !qty) {
      Alert.alert('Error', 'Enter valid price and quantity');
      return;
    }
    wsService.proposeDeal(partnerId, {
      cropName: cropName || 'Produce',
      quantityKg: qty,
      pricePerKg: price,
      totalPrice: price * qty,
      pickupDistrict: user?.district || '',
    });
    setShowDealForm(false);
    setDealPrice('');
    setDealQty('');
  };

  const handleAcceptDeal = (messageId: string) => {
    Alert.alert(
      'Accept Deal?',
      'Confirm this deal and proceed to payment.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept & Pay',
          style: 'default',
          onPress: async () => {
            wsService.acceptDeal(messageId, partnerId);
          }
        }
      ]
    );
  };

  const handleRejectDeal = (messageId: string) => {
    Alert.alert('Reject Deal?', 'This will reject the offer.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive',
          onPress: () => wsService.rejectDeal(messageId) }
      ]
    );
  };

  const handlePayment = async (orderId: string) => {
    try {
      await paymentService.initiatePayment(orderId);
      // Notify via WebSocket
      wsService.notifyPaymentDone(orderId, partnerId);
    } catch (err: any) {
      Alert.alert('Payment Failed', err.message);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.id;

    if (item.type === 'DEAL_PROPOSE') {
      const deal = item.dealDetails;
      const isFromPartner = !isMe;

      return (
        <View style={[
          styles.dealCard,
          isMe ? styles.dealCardMe : styles.dealCardThem
        ]}>
          <Text style={styles.dealEmoji}>🤝</Text>
          <Text style={styles.dealTitle}>Deal Proposed</Text>
          {deal && (
            <>
              <Text style={styles.dealRow}>🌾 {deal.cropName}</Text>
              <Text style={styles.dealRow}>📦 {deal.quantityKg} kg</Text>
              <Text style={styles.dealRow}>💰 LKR {deal.pricePerKg}/kg</Text>
              <Text style={styles.dealTotal}>Total: LKR {deal.totalPrice.toLocaleString()}</Text>
            </>
          )}
          <Text style={styles.dealTime}>{formatTime(item.sentAt)}</Text>
          {isFromPartner && (
            <View style={styles.dealActions}>
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAcceptDeal(item.id)}>
                <Text style={styles.acceptBtnText}>✓ Accept & Pay</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRejectDeal(item.id)}>
                <Text style={styles.rejectBtnText}>✗ Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      );
    }

    if (item.type === 'DEAL_ACCEPT') {
      return (
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusText}>{item.message}</Text>
          {item.orderId && !isMe && (
            <TouchableOpacity style={styles.payBtn} onPress={() => handlePayment(item.orderId!)}>
              <Text style={styles.payBtnText}>💳 Pay Now</Text>
            </TouchableOpacity>
          )}
          <Text style={styles.statusTime}>{formatTime(item.sentAt)}</Text>
        </View>
      );
    }

    if (item.type === 'DEAL_REJECT') {
      return (
        <View style={[styles.statusCard, styles.rejectCard]}>
          <Text style={styles.statusIcon}>❌</Text>
          <Text style={styles.statusText}>{item.message}</Text>
          <Text style={styles.statusTime}>{formatTime(item.sentAt)}</Text>
        </View>
      );
    }

    if (item.type === 'PAYMENT_DONE') {
      return (
        <View style={[styles.statusCard, styles.payCard]}>
          <Text style={styles.statusIcon}>💳</Text>
          <Text style={styles.statusText}>{item.message}</Text>
          <Text style={styles.statusTime}>{formatTime(item.sentAt)}</Text>
        </View>
      );
    }

    if (item.type === 'ORDER_UPDATE') {
      return (
        <View style={[styles.statusCard, styles.orderCard]}>
          <Text style={styles.statusIcon}>📦</Text>
          <Text style={styles.statusText}>{item.message}</Text>
          <Text style={styles.statusTime}>{formatTime(item.sentAt)}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isMe ? styles.msgRowMe : styles.msgRowThem]}>
        <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: myColor }] : styles.bubbleThem]}>
          <Text style={[styles.msgText, isMe ? styles.msgTextMe : styles.msgTextThem]}>{item.message}</Text>
          <View style={styles.msgMeta}>
            <Text style={[styles.msgTime, isMe ? styles.msgTimeMe : styles.msgTimeThem]}>{formatTime(item.sentAt)}</Text>
            {isMe && (
              <Text style={[styles.readReceipt, { color: item.isRead ? '#4fc3f7' : 'rgba(255,255,255,0.5)' }]}>
                {item.isRead ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={myColor} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { backgroundColor: myColor }]}>
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>{partnerRole === 'FARMER' ? '🧑🌾' : '🛒'}</Text>
        </View>
        <View>
          <Text style={styles.headerName}>{partnerName}</Text>
          <Text style={styles.headerSub}>
            {cropName ? '🌾 ' + cropName : partnerRole}
            {' · '}
            <Text style={{ color: wsConnected ? '#a5f3a5' : '#ffaaaa' }}>
              {wsConnected ? '● Live' : '○ Offline'}
            </Text>
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id || Math.random().toString()}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {showDealForm && (
          <View style={styles.dealForm}>
            <Text style={styles.dealFormTitle}>Propose a Deal</Text>
            <View style={styles.dealFormRow}>
              <TextInput
                style={styles.dealInput}
                placeholder="Price (LKR/kg)"
                keyboardType="numeric"
                value={dealPrice}
                onChangeText={setDealPrice}
              />
              <TextInput
                style={styles.dealInput}
                placeholder="Quantity (kg)"
                keyboardType="numeric"
                value={dealQty}
                onChangeText={setDealQty}
              />
            </View>
            {dealPrice && dealQty && (
              <Text style={styles.dealCalc}>Total: LKR {(parseFloat(dealPrice) * parseFloat(dealQty)).toLocaleString()}</Text>
            )}
            <View style={styles.dealFormBtns}>
              <TouchableOpacity onPress={() => setShowDealForm(false)} style={styles.cancelDealBtn}>
                <Text style={styles.cancelDealText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleProposeDeal} style={[styles.sendDealBtn, { backgroundColor: myColor }]}>
                <Text style={styles.sendDealText}>Send Deal</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.inputBar}>
          {user?.role === 'FARMER' && (
            <TouchableOpacity onPress={() => setShowDealForm(!showDealForm)} style={[styles.dealBtn, { backgroundColor: myColor + '22' }]}>
              <Text style={[styles.dealBtnText, { color: myColor }]}>🤝</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.textInput}
            placeholder="Type a message..."
            placeholderTextColor="#aaa"
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!inputText.trim() || !wsConnected}
            style={[styles.sendBtn, { backgroundColor: myColor }, (!inputText.trim() || !wsConnected) && styles.sendBtnDisabled]}>
            <Text style={styles.sendBtnText}>➤</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8faf8' },
  flex: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingTop: 10 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  headerAvatarText: { fontSize: 18 },
  headerName: { fontSize: 14, fontWeight: '500', color: '#fff' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  messagesList: { padding: 12, paddingBottom: 8 },
  msgRow: { marginBottom: 4, flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  msgRowThem: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '75%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: 'rgba(0,0,0,0.08)' },
  msgText: { fontSize: 14, lineHeight: 20 },
  msgTextMe: { color: '#fff' },
  msgTextThem: { color: '#1a1a1a' },
  msgMeta: { flexDirection: 'row', gap: 4, alignItems: 'center', marginTop: 3, justifyContent: 'flex-end' },
  msgTime: { fontSize: 10 },
  msgTimeMe: { color: 'rgba(255,255,255,0.7)' },
  msgTimeThem: { color: '#bbb' },
  readReceipt: { fontSize: 11, fontWeight: '600' },
  dealCard: { margin: 8, borderRadius: 16, padding: 14, borderWidth: 1 },
  dealCardMe: { backgroundColor: '#e8f5ee', borderColor: '#1a7a4a', alignSelf: 'flex-end', maxWidth: '80%' },
  dealCardThem: { backgroundColor: '#fff', borderColor: '#e0e0e0', alignSelf: 'flex-start', maxWidth: '80%' },
  dealEmoji: { fontSize: 24, textAlign: 'center', marginBottom: 6 },
  dealTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  dealRow: { fontSize: 12, color: '#444', marginBottom: 3 },
  dealTotal: { fontSize: 14, fontWeight: '700', color: '#1a7a4a', marginTop: 6 },
  dealTime: { fontSize: 10, color: '#bbb', marginTop: 6 },
  dealActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptBtn: { flex: 1, backgroundColor: '#1a7a4a', borderRadius: 10, padding: 9, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  rejectBtn: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 9, alignItems: 'center', borderWidth: 1, borderColor: '#e24b4a' },
  rejectBtnText: { color: '#e24b4a', fontSize: 12, fontWeight: '600' },
  statusCard: { margin: 8, borderRadius: 14, padding: 12, backgroundColor: '#e8f5ee', borderWidth: 1, borderColor: '#1a7a4a', alignItems: 'center' },
  rejectCard: { backgroundColor: '#fcebeb', borderColor: '#e24b4a' },
  payCard: { backgroundColor: '#e6f1fb', borderColor: '#1a5fa8' },
  orderCard: { backgroundColor: '#faeeda', borderColor: '#7a4f00' },
  statusIcon: { fontSize: 24, marginBottom: 6 },
  statusText: { fontSize: 12, color: '#1a1a1a', textAlign: 'center', lineHeight: 18 },
  statusTime: { fontSize: 10, color: '#bbb', marginTop: 6 },
  payBtn: { marginTop: 10, backgroundColor: '#1a5fa8', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 9 },
  payBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  dealForm: { backgroundColor: '#fff', padding: 14, borderTopWidth: 1, borderTopColor: '#eee' },
  dealFormTitle: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 10 },
  dealFormRow: { flexDirection: 'row', gap: 8 },
  dealInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, fontSize: 13 },
  dealCalc: { fontSize: 13, fontWeight: '600', color: '#1a7a4a', marginTop: 8 },
  dealFormBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  cancelDealBtn: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, padding: 10, alignItems: 'center' },
  cancelDealText: { fontSize: 13, color: '#666' },
  sendDealBtn: { flex: 1, borderRadius: 10, padding: 10, alignItems: 'center' },
  sendDealText: { fontSize: 13, color: '#fff', fontWeight: '600' },
  inputBar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 10, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  dealBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dealBtnText: { fontSize: 18 },
  textInput: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, maxHeight: 100, color: '#1a1a1a' },
  sendBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: '#fff', fontSize: 16 },
});
