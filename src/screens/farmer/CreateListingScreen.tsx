import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ActivityIndicator, Alert, Modal, FlatList, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Geolocation from '@react-native-community/geolocation';
import { useAuthStore } from '../../store/authStore';
import { fbStorage } from '../../services/firebase';
import api from '../../services/api';
import { listingService } from '../../services/listingService';
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

const EXPIRY_OPTIONS = [
  { label: '3 Days', days: 3 },
  { label: '7 Days', days: 7 },
  { label: '14 Days', days: 14 },
  { label: '30 Days', days: 30 },
];

const CreateListingScreen = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const user = useAuthStore(state => state.user);
  
  // If editing an existing listing, this would be passed
  const listingId = route.params?.listingId; 

  const [crop, setCrop] = useState<{name: string, emoji: string} | null>(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [district, setDistrict] = useState(user?.district || '');
  const [description, setDescription] = useState('');
  const [expiryDays, setExpiryDays] = useState(7); 
  const [image, setImage] = useState<Asset | null>(null);
  const [location, setLocation] = useState<{lat: number, lon: number} | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCropModalVisible, setCropModalVisible] = useState(false);
  const [isDistrictModalVisible, setDistrictModalVisible] = useState(false);
  const [isExpiryModalVisible, setExpiryModalVisible] = useState(false);

  useEffect(() => {
    Geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => console.log('Geolocation error:', error),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  useEffect(() => {
    if (listingId) {
      const loadListing = async () => {
        try {
          const response = await listingService.getListing(listingId);
          if (response.success) {
            const data = response.data;
            const cropMatch = COMMON_CROPS.find(c => c.name === data.cropName);
            setCrop(cropMatch || { name: data.cropName, emoji: '📦' });
            setQuantity(data.quantityKg?.toString() || '');
            setPrice(data.pricePerKg?.toString() || '');
            setDistrict(data.district || '');
            setDescription(data.description || '');
            if (data.imageUrl) {
              setImage({ uri: data.imageUrl } as Asset);
            }
          }
        } catch (error) {
          console.error('Error loading listing for edit:', error);
          Alert.alert('Error', 'Failed to load listing details.');
        }
      };
      loadListing();
    }
  }, [listingId]);

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.7 });
    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  const handleSave = async () => {
    if (!crop || !quantity || !price || !district) {
      Alert.alert('Incomplete Fields', 'Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      let imageUrl = '';

      // Image upload via Firebase Storage 
      if (image && image.uri && !image.uri.startsWith('http')) {
        try {
          const fileName = `listings/${user?.id}_${Date.now()}.jpg`;
          const imgRef = fbStorage.ref(fileName);
          
          // Decoding URI for Android compatibility
          const uploadUri = Platform.OS === 'android' && image.uri.startsWith('file://') 
            ? decodeURI(image.uri).replace('file://', '') 
            : image.uri;

          console.log('Attempting upload from:', uploadUri);
          await imgRef.putFile(image.uri); // RN Firebase handles file:// prefix internally
          
          let retries = 5;
          while (retries > 0) {
            try {
              imageUrl = await imgRef.getDownloadURL();
              console.log('Successfully retrieved URL:', imageUrl);
              break; 
            } catch (e) {
              retries--;
              if (retries === 0) throw e;
              console.log(`URL retrieval failed, retrying... (${retries} left)`);
              await new Promise<void>(resolve => setTimeout(resolve, 2000));
            }
          }
        } catch (storageErr: any) {
          console.error('Firebase Storage Error:', storageErr);
        }
      }

      const expiryDate = new Date(Date.now() + (86400000 * expiryDays)).toISOString();

      const listingData: any = {
        cropName: crop.name,
        cropEmoji: crop.emoji,
        quantityKg: parseFloat(quantity), 
        pricePerKg: parseFloat(price),
        district,
        description: description.trim(),
        expiresAt: expiryDate,
        latitude: location?.lat || null,
        longitude: location?.lon || null,
        imageUrl: imageUrl || undefined
      };

      if (listingId) {
        await listingService.updateListing(listingId, listingData);
      } else {
        await listingService.createListing(listingData);
      }

      Alert.alert('Success!', 'Your harvest has been listed.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to save listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={colors.common.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{listingId ? 'Edit Listing' : 'Post New Listing'}</Text>
        <View style={{width: 24}} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <Text style={styles.label}>Crop Type *</Text>
          <TouchableOpacity style={styles.inputDropdown} onPress={() => setCropModalVisible(true)}>
            <Text style={crop ? styles.inputText : styles.placeholder}>
              {crop ? `${crop.emoji} ${crop.name}` : 'Select your harvested crop'}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <Text style={styles.label}>Quantity (kg) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
                placeholderTextColor="#aaa"
              />
            </View>
            <View style={{flex: 1, marginLeft: 8}}>
              <Text style={styles.label}>Price per kg (Rs) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 150"
                keyboardType="decimal-pad"
                value={price}
                onChangeText={setPrice}
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          <Text style={styles.label}>Pickup District *</Text>
          <TouchableOpacity style={styles.inputDropdown} onPress={() => setDistrictModalVisible(true)}>
            <Text style={district ? styles.inputText : styles.placeholder}>
              {district || 'Where is the harvest located?'}
            </Text>
            <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.label}>Expiry Setup *</Text>
          <TouchableOpacity style={styles.inputDropdown} onPress={() => setExpiryModalVisible(true)}>
            <Text style={styles.inputText}>Default: {expiryDays} Days</Text>
            <Icon name="calendar-outline" size={20} color={colors.common.textSecondary} />
          </TouchableOpacity>

          <Text style={styles.label}>Description & Quality (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="e.g. Freshly plucked, fully organic."
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#aaa"
          />

          <Text style={styles.label}>Harvest Photo (Optional)</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={handleSelectImage}>
            {image ? (
              <Image source={{ uri: image.uri }} style={styles.previewImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="camera-outline" size={32} color={colors.farmer.primary} />
                <Text style={styles.imagePickerText}>Upload a real photo to attract buyers</Text>
              </View>
            )}
          </TouchableOpacity>
          {image && (
            <TouchableOpacity style={styles.replacePhotoBtn} onPress={handleSelectImage}>
              <Text style={styles.replacePhotoText}>Replace Photo</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.submitButton, isSubmitting && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.common.white} />
            ) : (
              <Text style={styles.submitButtonText}>Publish Listing</Text>
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
            <Text style={styles.modalTitle}>Select District</Text>
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

      {/* EXPIRY MODAL */}
      <Modal visible={isExpiryModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Auto-Expiry Duration</Text>
            {EXPIRY_OPTIONS.map(opt => (
              <TouchableOpacity 
                key={opt.days}
                style={styles.modalItem}
                onPress={() => {
                  setExpiryDays(opt.days);
                  setExpiryModalVisible(false);
                }}
              >
                <Text style={styles.modalItemText}>{opt.label}</Text>
                {expiryDays === opt.days && <Icon name="checkmark" size={20} color={colors.farmer.primary} />}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setExpiryModalVisible(false)}>
              <Text style={styles.modalCloseText}>Cancel</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.farmer.primary,
    padding: 16,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.common.white,
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
  imagePicker: {
    width: '100%',
    height: 180,
    backgroundColor: colors.farmer.light,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.farmer.primary,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 8,
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  replacePhotoBtn: {
    alignSelf: 'flex-start',
    marginBottom: 32,
  },
  replacePhotoText: {
    color: colors.farmer.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: colors.farmer.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.common.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Modals natively optimized over 3rd party package risks!
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

export default CreateListingScreen;
