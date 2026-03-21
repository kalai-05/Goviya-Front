import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../constants/colors';

// Simple param list to keep TypeScript happy
type AuthStackParamList = {
  Language: undefined;
};

type SplashScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Language'>;

const SplashScreen = () => {
  const navigation = useNavigation<SplashScreenNavigationProp>();

  useEffect(() => {
    const timer = setTimeout(() => {
      // Use replace so users can't navigate back to the Splash Screen
      navigation.replace('Language');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🌾</Text>
      <Text style={styles.title}>Goviya</Text>
      <Text style={styles.tagline}>Sri Lanka Farmer's App</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.farmer.primary, // #1a7a4a
    justifyContent: 'center',
    alignItems: 'center',
  },
  emoji: {
    fontSize: 80,
    marginBottom: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.common.white,
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: colors.common.white,
    fontWeight: '500',
  },
});

export default SplashScreen;
