import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';

// In React Native CLI, Firebase is initialized natively. 
// We just export the instances for use throughout the app here.
export const fbAuth = auth();
export const db = firestore();
export const fbStorage = storage();

export const Collections = {
  users: 'users',
  produce_listings: 'produce_listings',
  buyer_requests: 'buyer_requests',
  request_responses: 'request_responses',
  shop_products: 'shop_products',
  orders: 'orders',
  chat_messages: 'chat_messages',
  shop_inquiries: 'shop_inquiries',
  market_prices: 'market_prices',
};
