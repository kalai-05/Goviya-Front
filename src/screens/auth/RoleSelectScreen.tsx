import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { saveUserProfile } from '../../services/authService';
import { useAuthStore, UserRole } from '../../store/authStore';
import { colors } from '../../constants/colors';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 
  'Trincomalee', 'Vavuniya'
].sort();

const ROLE_OPTIONS: { id: UserRole; title: string; icon: string }[] = [
  { id: 'FARMER', title: 'Farmer', icon: '🧑‍🌾' },
  { id: 'BUYER', title: 'Buyer', icon: '🛒' },
  { id: 'SHOP', title: 'Agri Shop', icon: '🏪' },
];

const RoleSelectScreen = () => {
  const language = useAuthStore((state) => state.language);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  
  const [isDistrictModalVisible, setDistrictModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleStart = async () => {
    if (!selectedRole || !name.trim() || !district) {
      Alert.alert('Incomplete', 'Please provide a name, role, and district to continue.');
      return;
    }

    setIsLoading(true);
    try {
      await saveUserProfile({
        name: name.trim(),
        role: selectedRole,
        district,
        language,
      });
      // Upon strict success, AppNavigator will unmount AuthNavigator and show appropriate Tabs 
      // dynamically since useAuthStore automatically triggers a React state update under the hood!
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>நான் யார்? / Select your role</Text>
        
        <View style={styles.rolesRow}>
          {ROLE_OPTIONS.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.roleCard,
                  isSelected && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role.id)}
                activeOpacity={0.8}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text 
                  style={[
                    styles.roleText, 
                    isSelected && styles.roleTextSelected
                  ]}
                >
                  {role.title}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Nimal Perera"
          value={name}
          onChangeText={setName}
          editable={!isLoading}
          placeholderTextColor="#aaa"
        />

        <Text style={styles.label}>District</Text>
        <TouchableOpacity 
          style={styles.input} 
          onPress={() => setDistrictModalVisible(true)}
          disabled={isLoading}
        >
          <Text style={district ? styles.inputText : styles.placeholderText}>
            {district || 'Select your district (e.g. Colombo)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={handleStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={colors.common.white} />
          ) : (
            <Text style={styles.buttonText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal visible={isDistrictModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select District</Text>
            <FlatList
              data={SRI_LANKA_DISTRICTS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.districtItem}
                  onPress={() => {
                    setDistrict(item);
                    setDistrictModalVisible(false);
                  }}
                >
                  <Text style={styles.districtItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity 
              style={styles.modalCloseButton} 
              onPress={() => setDistrictModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 24,
    textAlign: 'center',
  },
  rolesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  roleCard: {
    flex: 1,
    backgroundColor: colors.common.background,
    borderWidth: 1.5,
    borderColor: colors.common.border,
    borderRadius: 12,
    paddingVertical: 20,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  roleCardSelected: {
    borderColor: colors.farmer.primary,
    backgroundColor: colors.farmer.light,
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textSecondary,
    textAlign: 'center',
  },
  roleTextSelected: {
    color: colors.farmer.primary,
    fontWeight: 'bold',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.common.background,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.common.border,
    fontSize: 16,
    color: colors.common.textPrimary,
    marginBottom: 24,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: 16,
    color: colors.common.textPrimary,
  },
  placeholderText: {
    fontSize: 16,
    color: '#aaa',
  },
  button: {
    backgroundColor: colors.farmer.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.common.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.common.textPrimary,
  },
  districtItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border,
  },
  districtItemText: {
    fontSize: 16,
    color: colors.common.textPrimary,
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: colors.common.background,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
});

export default RoleSelectScreen;
