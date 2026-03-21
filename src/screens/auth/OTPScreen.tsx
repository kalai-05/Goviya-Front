import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { sendOTP, verifyOTP } from '../../services/authService';
import { colors } from '../../constants/colors';

type AuthStackParamList = {
  RoleSelect: undefined;
};

type OTPScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'RoleSelect'>;

const OTPScreen = () => {
  const navigation = useNavigation<OTPScreenNavigationProp>();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOtpSent, setIsOtpSent] = useState(false);

  const handleSendOTP = async () => {
    if (phoneNumber.length < 9) {
      Alert.alert('Invalid Number', 'Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // Assuming +94 prefix for Sri Lanka, removing leading zero if typed
      const formattedNumber = `+94${phoneNumber.replace(/^0+/, '')}`; 
      await sendOTP(formattedNumber);
      setIsOtpSent(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (otpCode.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a valid 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTP(otpCode);
      navigation.navigate('RoleSelect');
    } catch (error: any) {
      Alert.alert('Verification Failed', error.message || 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome / ආයුබෝවන්</Text>
        <Text style={styles.subtitle}>
          {isOtpSent 
            ? 'Enter the 6-digit code sent to your phone' 
            : 'Enter your phone number to continue'}
        </Text>

        {!isOtpSent ? (
          <View style={styles.inputContainer}>
            <View style={styles.prefixContainer}>
              <Text style={styles.prefix}>+94</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="7X XXX XXXX"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              maxLength={10}
              editable={!isLoading}
            />
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              value={otpCode}
              onChangeText={setOtpCode}
              maxLength={6}
              editable={!isLoading}
              textAlign="center"
            />
          </View>
        )}

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={isOtpSent ? handleVerifyOTP : handleSendOTP}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.common.white} />
          ) : (
            <Text style={styles.buttonText}>{isOtpSent ? 'Verify OTP' : 'Send OTP'}</Text>
          )}
        </TouchableOpacity>

        {isOtpSent && !isLoading && (
          <TouchableOpacity 
            style={styles.resendContainer} 
            onPress={() => setIsOtpSent(false)}
          >
            <Text style={styles.resendText}>Change Phone Number</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.white,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.common.textSecondary,
    marginBottom: 32,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  prefixContainer: {
    backgroundColor: colors.common.background,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.common.border,
    marginRight: 12,
  },
  prefix: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.common.textPrimary,
  },
  input: {
    flex: 1,
    backgroundColor: colors.common.background,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.common.border,
    fontSize: 18,
    color: colors.common.textPrimary,
  },
  otpInput: {
    letterSpacing: 4,
  },
  button: {
    backgroundColor: colors.farmer.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.common.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  resendContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  resendText: {
    color: colors.farmer.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OTPScreen;
