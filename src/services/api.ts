import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

// Resolving natively to Android Emulator loopback mapping; substitute securely in Prod logic 
const BASE_URL = 'http://10.0.2.2:8080/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Outgoing Request Interceptor automatically packing Bearer Strings natively over APIs 
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('jwt_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.log('Failed retrieving cached token dynamically:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor checking explicitly for unauthorized configurations breaking endpoints 
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      console.log('Intercepted 401 HTTP Block. Nullifying local variables...');
      
      try {
        await AsyncStorage.removeItem('jwt_token');
      } catch (err) {
        // Ignored
      }
      
      // Zustand implicitly captures logout dispatches forcing AppStack redirection securely 
      useAuthStore.getState().logout();
    }
    
    return Promise.reject(error);
  }
);

export default api;
