import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuthStore, AppLanguage } from '../../store/authStore';
import { colors } from '../../constants/colors';

type AuthStackParamList = {
  OTP: undefined;
};

type LanguageScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'OTP'>;

const languages: { code: AppLanguage; label: string }[] = [
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'en', label: 'English' },
];

const LanguageScreen = () => {
  const navigation = useNavigation<LanguageScreenNavigationProp>();
  const setLanguage = useAuthStore((state) => state.setLanguage);
  
  const currentLanguage = useAuthStore((state) => state.language);
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(currentLanguage || 'si');

  const handleContinue = () => {
    setLanguage(selectedLanguage);
    navigation.navigate('OTP');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>භාෂාව තෝරන්න</Text>
        <Text style={styles.subTitle}>மொழி தேர்வு / Choose Language</Text>

        <View style={styles.optionsContainer}>
          {languages.map((lang) => {
            const isSelected = selectedLanguage === lang.code;
            return (
              <TouchableOpacity
                key={lang.code}
                style={[
                  styles.languageButton,
                  isSelected && styles.languageButtonSelected,
                ]}
                onPress={() => setSelectedLanguage(lang.code)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.languageText,
                    isSelected && styles.languageTextSelected,
                  ]}
                >
                  {lang.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity 
          style={styles.continueButton} 
          onPress={handleContinue} 
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subTitle: {
    fontSize: 18,
    color: colors.common.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  optionsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  languageButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.common.border,
    backgroundColor: colors.common.white,
    marginBottom: 16,
    alignItems: 'center',
  },
  languageButtonSelected: {
    borderColor: colors.farmer.primary,
    backgroundColor: colors.farmer.light,
  },
  languageText: {
    fontSize: 18,
    color: colors.common.textPrimary,
    fontWeight: '500',
  },
  languageTextSelected: {
    color: colors.farmer.primary,
    fontWeight: 'bold',
  },
  continueButton: {
    width: '100%',
    backgroundColor: colors.farmer.primary, 
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
  },
  continueButtonText: {
    color: colors.common.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default LanguageScreen;
