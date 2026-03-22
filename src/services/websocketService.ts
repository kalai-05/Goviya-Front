import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';

const WS_URL = 'http://10.0.2.2:8080/ws';

class WebSocketService {
  private client: Client | null = null;
  private messageHandlers: Map<string, (msg: any) => void> = new Map();
  private connectionPromise: Promise<void> | null = null;

  async connect() {
    if (this.client?.connected) return;
    if (this.connectionPromise) return this.connectionPromise;

    const token = await AsyncStorage.getItem('jwt_token');

    this.connectionPromise = new Promise((resolve, reject) => {
      this.client = new Client({
        webSocketFactory: () => new SockJS(WS_URL),
        connectHeaders: {
          Authorization: `Bearer ${token}`,
        },
        debug: (str) => console.log('STOMP:', str),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });

      this.client.onConnect = (frame) => {
        console.log('STOMP Connected:', frame);
        
        const userId = this.getUserIdFromToken(token);
        if (userId) {
          this.client?.subscribe(`/topic/messages/${userId}`, (message) => {
            const body = JSON.parse(message.body);
            this.messageHandlers.forEach((handler) => handler(body));
          });
        }
        
        this.connectionPromise = null;
        resolve();
      };

      this.client.onStompError = (frame) => {
        console.error('STOMP Error:', frame);
        this.connectionPromise = null;
        reject(frame);
      };

      this.client.activate();
    });

    return this.connectionPromise;
  }

  private getUserIdFromToken(token: string | null): string | null {
    if (!token) return null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = Buffer.from(base64, 'base64').toString();
      return JSON.parse(jsonPayload).sub;
    } catch (e) {
      return null;
    }
  }

  isConnected() {
    return this.client?.connected || false;
  }

  onMessage(id: string, handler: (msg: any) => void) {
    this.messageHandlers.set(id, handler);
  }

  removeHandler(id: string) {
    this.messageHandlers.delete(id);
  }

  sendMessage(receiverId: string, message: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.send',
      body: JSON.stringify({ receiverId, message, type: 'TEXT' }),
    });
  }

  proposeDeal(receiverId: string, dealDetails: any) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.deal.propose',
      body: JSON.stringify({ receiverId, dealDetails, type: 'DEAL_PROPOSE' }),
    });
  }

  acceptDeal(messageId: string, partnerId: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.deal.accept',
      body: JSON.stringify({ messageId, action: 'ACCEPT' }),
    });
  }

  rejectDeal(messageId: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.deal.reject',
      body: JSON.stringify({ messageId, action: 'REJECT' }),
    });
  }

  markAsRead(senderId: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.read',
      body: JSON.stringify({ senderId }),
    });
  }

  notifyPaymentDone(orderId: string, farmerId: string) {
    if (!this.client?.connected) return;
    this.client.publish({
      destination: '/app/chat.payment.done',
      body: JSON.stringify({ orderId, farmerId }),
    });
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }
}

export const wsService = new WebSocketService();
