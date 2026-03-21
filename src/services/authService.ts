import { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { fbAuth, db, Collections } from './firebase';
import { useAuthStore } from '../store/authStore';

// We store the confirmation result globally within the service so verifyOTP can access it
let confirmationResult: FirebaseAuthTypes.ConfirmationResult | null = null;

export const sendOTP = async (phoneNumber: string): Promise<void> => {
  try {
    confirmationResult = await fbAuth.signInWithPhoneNumber(phoneNumber);
  } catch (error) {
    console.error('Error in sendOTP:', error);
    throw error;
  }
};

export const verifyOTP = async (otp: string): Promise<void> => {
  try {
    if (!confirmationResult) {
      throw new Error('No OTP request found. Please request an OTP first.');
    }
    await confirmationResult.confirm(otp);
  } catch (error) {
    console.error('Error in verifyOTP:', error);
    throw error;
  }
};

export const saveUserProfile = async (data: { name: string; role: string; district: string; language: string }): Promise<void> => {
  try {
    const currentUser = fbAuth.currentUser;
    if (!currentUser) {
      throw new Error('User is not authenticated');
    }

    const userData = {
      id: currentUser.uid,
      phone: currentUser.phoneNumber || '',
      ...data,
      updatedAt: new Date().toISOString(),
    };

    // Save/update in Firestore
    await db.collection(Collections.users).doc(currentUser.uid).set(userData, { merge: true });

    // Assuming valid values for Zustand typing
    useAuthStore.getState().setUser(userData as any);
  } catch (error) {
    console.error('Error in saveUserProfile:', error);
    throw error;
  }
};

export const getCurrentUser = (): FirebaseAuthTypes.User | null => {
  return fbAuth.currentUser;
};
