import auth from '@react-native-firebase/auth';
import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

let confirmationResult: any = null;

export const sendOTP = async (phone: string): Promise<void> => {
  try {
    confirmationResult = await auth().signInWithPhoneNumber(phone);
  } catch (error: any) {
    console.error('Error in sendOTP:', error);
    throw new Error(error.message);
  }
};

export const verifyOTP = async (phone: string, otp: string): Promise<void> => {
  try {
    if (!confirmationResult) {
      throw new Error('No OTP request found. Please request an OTP first.');
    }
    
    // 1. Verify with Firebase natively 
    await confirmationResult.confirm(otp);

    // 2. Get the Firebase ID Token from the newly authenticated user 
    const currentUser = auth().currentUser;
    if (!currentUser) throw new Error('Firebase session lost');
    
    const idToken = await currentUser.getIdToken();

    // 3. Handshake with local Backend to get a project-specific JWT 
    const response = await api.post('/auth/firebase-login', { idToken });
    const { success, data, message } = response.data;
    
    if (!success) {
      throw new Error(message || 'Failed to verify with backend');
    }

    const { token, user } = data;
    
    // 4. Securely cache local backend credentials 
    await AsyncStorage.setItem('jwt_token', token);
    useAuthStore.getState().setUser(user);
    
  } catch (error: any) {
    console.error('Error in verifyOTP:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const saveUserProfile = async (data: { name: string; role: string; district: string; language: string }): Promise<void> => {
  try {
    const response = await api.post('/auth/register', data);
    const { success, data: user, message } = response.data;
    
    if (!success) {
      throw new Error(message || 'Failed to update profile');
    }

    useAuthStore.getState().setUser(user);
    
  } catch (error: any) {
    console.error('Error in saveUserProfile:', error);
    throw new Error(error.response?.data?.message || error.message);
  }
};

export const fetchCurrentUser = async (): Promise<void> => {
  try {
    const response = await api.get('/auth/me');
    if (response.data.success) {
      useAuthStore.getState().setUser(response.data.data);
    }
  } catch (error) {
    console.error('Error fetching current user:', error);
    useAuthStore.getState().setUser(null);
  }
};

export const logout = async (): Promise<void> => {
  try {
    await auth().signOut();
    await AsyncStorage.removeItem('jwt_token');
    useAuthStore.getState().logout();
  } catch (error) {
    console.error('Error during logout:', error);
  }
};
