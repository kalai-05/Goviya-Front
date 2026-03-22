import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, Modal, FlatList, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { requestService } from '../../services/requestService';
import { colors } from '../../constants/colors';

const SRI_LANKA_DISTRICTS = [
  'Ampara', 'Anuradhapura', 'Badulla', 'Batticaloa', 'Colombo', 'Galle', 
  'Gampaha', 'Hambantota', 'Jaffna', 'Kalutara', 'Kandy', 'Kegalle', 
  'Kilinochchi', 'Kurunegala', 'Mannar', 'Matale', 'Matara', 'Monaragala', 
  'Mullaitivu', 'Nuwara Eliya', 'Polonnaruwa', 'Puttalam', 'Ratnapura', 
  'Trincomalee', 'Vavuniya'
].sort();

const COMMON_CROPS = [
  { name: 'Tomato', emoji: '🍅' },
  { name: 'Carrot', emoji: '🥕' },
  { name: 'Pumpkin', emoji: '🎃' },
  { name: 'Banana', emoji: '🍌' },
  { name: 'Papaya', emoji: '🥭' },
  { name: 'Rice (Nadu)', emoji: '🌾' },
  { name: 'Rice (Samba)', emoji: '🌾' },
  { name: 'Cabbage', emoji: '🥬' },
  { name: 'Leeks', emoji: '🧅' },
  { name: 'Potato', emoji: '🥔' },
  { name: 'Onion', emoji: '🧅' },
];

type NavigationProp = NativeStackNavigationProp<any>;

const PostRequestForm = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<any>();
  const user = useAuthStore(state => state.user);
  
  const requestId = route.params?.requestId;

  const [crop, setCrop] = useState<{name: string, emoji: string} | null>(null);
  const [quantity, setQuantity] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [district, setDistrict] = useState(user?.district || '');
  const [description, setDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCropModalVisible, setCropModalVisible] = useState(false);
  const [isDistrictModalVisible, setDistrictModalVisible] = useState(false);

  useEffect(() => {
    if (requestId) {
      const loadRequest = async () => {
        try {
          // You might need a getRequestById in requestService, assuming getRequests can find it
          const response = await requestService.getMyRequests();
          if (response.success) {
            const item = response.data.find((r: any) => r.id === requestId);
            if (item) {
              const cropMatch = COMMON_CROPS.find(c => c.name === item.cropName);
              setCrop(cropMatch || { name: item.cropName, emoji: '📦' });
              setQuantity(item.quantityKg?.toString() || '');
              setMaxPrice(item.maxPricePerKg?.toString() || '');
              setDistrict(item.district || '');
              setDescription(item.description || '');
            }
          }
        } catch (error) {
          console.error('Error loading request for edit:', error);
        }
      };
      loadRequest();
    }
  }, [requestId]);

  const handleSave = async () => {
    if (!crop || !quantity || !maxPrice || !district) {
      Alert.alert('Incomplete Fields', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const requestData = {
        cropName: crop.name,
        cropEmoji: crop.emoji,
        quantityKg: parseFloat(quantity),
        maxPricePerKg: parseFloat(maxPrice),
        district,
        description: description.trim(),
      };

      const response = requestId 
        ? await requestService.updateRequest(requestId, requestData)
        : await requestService.createRequest(requestData);

      if (response.success) {
        Alert.alert('Success!', `Your request has been ${requestId ? 'updated' : 'posted'}!`, [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(response.message || 'Failed to save request');
      }
    } catch (error: any) {
      console.error('Post Request Error:', error);
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to post request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{requestId ? 'Edit Request' : 'Post a Request'}</Text>
        <Text style={styles.headerSubtitle}>
          {requestId ? 'Update your help requirement' : 'Let farmers know what you need'}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.label}>Crop Needed *</Text>
          <TouchableOpacity style={styles.inputDropdown} onPress={() => setCropModalVisible(true)}>
            <Text style={crop ? styles.inputText : styles.placeholder}>
              {crop ? `${crop.emoji} ${crop.name}` : 'Select crop you want to buy'}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.label}>Quantity (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 1000"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Text style={styles.label}>LKR Max Price/kg *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 250"
                keyboardType="decimal-pad"
                value={maxPrice}
                onChangeText={setMaxPrice}
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          <Text style={styles.label}>Target District *</Text>
          <TouchableOpacity style={styles.inputDropdown} onPress={() => setDistrictModalVisible(true)}>
            <Text style={district ? styles.inputText : styles.placeholder}>
              {district || 'Where are you looking for this?'}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Need organically grown produce, can arrange transport immediately..."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#aaa"
          />

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.common.white} />
            ) : (
              <Text style={styles.submitButtonText}>{requestId ? 'Update Request' : 'Post Request'}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CROP MODAL */}
      <Modal visible={isCropModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Crop</Text>
            <FlatList
              data={COMMON_CROPS}
              keyExtractor={item => item.name}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    setCrop(item);
                    setCropModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.emoji}  {item.name}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setCropModalVisible(false)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* DISTRICT MODAL */}
      <Modal visible={isDistrictModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Target District</Text>
            <FlatList
              data={SRI_LANKA_DISTRICTS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    setDistrict(item);
                    setDistrictModalVisible(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setDistrictModalVisible(false)}>
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
  header: {
    backgroundColor: colors.buyer.primary, // #1a5fa8
    padding: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.common.white,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.buyer.light,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.common.background,
    borderWidth: 1,
    borderColor: colors.common.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.common.textPrimary,
    marginBottom: 20,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.common.background,
    borderWidth: 1,
    borderColor: colors.common.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  inputText: {
    fontSize: 16,
    color: colors.common.textPrimary,
  },
  placeholder: {
    fontSize: 16,
    color: '#aaa',
  },
  row: {
    flexDirection: 'row',
  },
  submitButton: {
    backgroundColor: colors.buyer.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.buyer.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
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
    color: colors.common.textPrimary,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border,
  },
  modalItemText: {
    fontSize: 16,
    color: colors.common.textPrimary,
  },
  modalCloseBtn: {
    marginTop: 16,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: colors.common.background,
    borderRadius: 8,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
});

export default PostRequestForm;
