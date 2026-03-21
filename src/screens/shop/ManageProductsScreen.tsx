import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Modal, TextInput, Image, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import { useAuthStore } from '../../store/authStore';
import { db, fbStorage, Collections } from '../../services/firebase';
import { colors } from '../../constants/colors';

const CATEGORIES = ['FERTILIZER', 'SEED', 'PESTICIDE', 'TOOL'];
const UNITS = ['kg', 'gram', 'liter', 'ml', 'packet', 'piece'];

interface ShopProduct {
  id: string;
  shopId: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  stockQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  imageUrl?: string;
}

const ManageProductsScreen = () => {
  const navigation = useNavigation();
  const user = useAuthStore(state => state.user);

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [unit, setUnit] = useState('kg');
  const [stockQuantity, setStockQuantity] = useState('');
  const [image, setImage] = useState<Asset | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dropdown Modals
  const [isCategoryModalVisible, setCategoryModalVisible] = useState(false);
  const [isUnitModalVisible, setUnitModalVisible] = useState(false);

  const fetchProducts = async () => {
    if (!user?.id) return;
    try {
      const snapshot = await db.collection(Collections.shop_products)
        .where('shopId', '==', user.id)
        .get();

      const fetched: ShopProduct[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetched.push({
          id: doc.id,
          shopId: data.shopId,
          name: data.name || '',
          category: data.category || 'FERTILIZER',
          price: data.price || 0,
          unit: data.unit || 'kg',
          stockQuantity: data.stockQuantity || 0,
          stockStatus: data.stockStatus || 'OUT_OF_STOCK',
          imageUrl: data.imageUrl,
        });
      });

      // Seeding database locally if blank
      if (fetched.length === 0) {
        fetched.push(
          { id: '1', shopId: user.id, name: 'Urea Fertilizer 50kg', category: 'FERTILIZER', price: 6500, unit: 'packet', stockQuantity: 50, stockStatus: 'IN_STOCK' },
          { id: '2', shopId: user.id, name: 'Tomato Seeds (Hybrid)', category: 'SEED', price: 350, unit: 'packet', stockQuantity: 5, stockStatus: 'LOW_STOCK' },
          { id: '3', shopId: user.id, name: 'Water Pump 2HP', category: 'TOOL', price: 15000, unit: 'piece', stockQuantity: 0, stockStatus: 'OUT_OF_STOCK' }
        );
      }

      setProducts(fetched);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const loadData = useCallback(async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
    setLoadingInitial(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openForm = (product?: ShopProduct) => {
    if (product) {
      setEditingId(product.id);
      setName(product.name);
      setCategory(product.category);
      setPrice(product.price.toString());
      setUnit(product.unit);
      setStockQuantity(product.stockQuantity.toString());
      setExistingImageUrl(product.imageUrl || null);
      setImage(null);
    } else {
      setEditingId(null);
      setName('');
      setCategory('');
      setPrice('');
      setUnit('kg');
      setStockQuantity('');
      setExistingImageUrl(null);
      setImage(null);
    }
    setIsFormVisible(true);
  };

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.6 });
    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
    }
  };

  // Computes active status badges natively 
  const computeStockStatus = (qty: number) => {
    if (qty <= 0) return 'OUT_OF_STOCK';
    if (qty <= 10) return 'LOW_STOCK';
    return 'IN_STOCK';
  };

  const handleSave = async () => {
    if (!name || !category || !price || !stockQuantity) {
      Alert.alert('Incomplete Requirements', 'Please fill all required fields including category and price.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalImageUrl = existingImageUrl;

      // Handle Firebase image uploading explicitly if touched
      if (image && image.uri && !image.uri.startsWith('http')) {
        const fileName = `shop_products/${user?.id}_${Date.now()}.jpg`;
        const ref = fbStorage.ref(fileName);
        await ref.putFile(image.uri);
        finalImageUrl = await ref.getDownloadURL();
      }

      const q = parseInt(stockQuantity, 10);
      const computedStatus = computeStockStatus(q);

      const productData: any = {
        shopId: user?.id,
        shopName: user?.name, // Indexed to eliminate heavy subqueries globally
        district: user?.district,
        name: name.trim(),
        category,
        price: parseFloat(price),
        unit,
        stockQuantity: q,
        stockStatus: computedStatus,
        updatedAt: new Date().toISOString(),
      };

      if (finalImageUrl) {
        productData.imageUrl = finalImageUrl;
      }

      if (editingId) {
        await db.collection(Collections.shop_products).doc(editingId).set(productData, { merge: true });
        setProducts(prev => prev.map(p => p.id === editingId ? { ...p, ...productData, id: editingId } : p));
      } else {
        productData.createdAt = new Date().toISOString();
        const docRef = await db.collection(Collections.shop_products).add(productData);
        setProducts(prev => [...prev, { id: docRef.id, ...productData }]);
      }

      setIsFormVisible(false);
    } catch (error: any) {
      Alert.alert('Save Error', error.message || 'Failed to update catalog securely.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: ShopProduct['stockStatus']) => {
    if (status === 'IN_STOCK') return '#4caf50'; // Vivid Green
    if (status === 'LOW_STOCK') return '#f5a623'; // Amber 
    return '#d9534f'; // Aggressive Red
  };

  const getStatusText = (status: ShopProduct['stockStatus']) => {
    if (status === 'IN_STOCK') return 'In Stock';
    if (status === 'LOW_STOCK') return 'Low';
    return 'Out';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>My Products</Text>
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => openForm()}
        activeOpacity={0.8}
      >
        <Icon name="add" size={20} color={colors.common.white} />
        <Text style={styles.addButtonText}>Add product</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: ShopProduct }) => {
    const color = getStatusColor(item.stockStatus);

    return (
      <TouchableOpacity 
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => openForm(item)}
      >
        <View style={styles.cardInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          
          <View style={styles.statsRow}>
            <Text style={styles.price}>Rs. {item.price} / {item.unit}</Text>
            <View style={{ width: 16 }} />
            <Text style={styles.stockCount}>Qty: {item.stockQuantity}</Text>
          </View>
        </View>
        
        <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
          <View style={[styles.statusDot, { backgroundColor: color }]} />
          <Text style={[styles.statusText, { color }]}>{getStatusText(item.stockStatus)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loadingInitial ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.agriShop.primary} />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadData} colors={[colors.agriShop.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="cube-outline" size={48} color={colors.common.textSecondary} />
              <Text style={styles.emptyText}>You completely sold out.</Text>
            </View>
          }
        />
      )}

      {/* Editing / Creating Screen Integrated natively mapped as Modal */}
      <Modal visible={isFormVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setIsFormVisible(false)}>
        <SafeAreaView style={styles.modalFullContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setIsFormVisible(false)}>
              <Text style={styles.modalCancelBtn}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitleText}>{editingId ? 'Edit Product' : 'New Product'}</Text>
            <View style={{width: 50}} />
          </View>

          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            <ScrollView contentContainerStyle={styles.formScroll}>
              
              <Text style={styles.label}>Product Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Urea Fertilizer 50kg"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Category *</Text>
              <TouchableOpacity style={styles.inputDropdown} onPress={() => setCategoryModalVisible(true)}>
                <Text style={category ? styles.inputText : styles.placeholder}>
                  {category || 'Select category'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
              </TouchableOpacity>

              <View style={styles.row}>
                <View style={{flex: 1, marginRight: 8}}>
                  <Text style={styles.label}>Price (Rs) *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="250"
                    keyboardType="numeric"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
                <View style={{flex: 1, marginLeft: 8}}>
                  <Text style={styles.label}>Per Unit *</Text>
                  <TouchableOpacity style={styles.inputDropdown} onPress={() => setUnitModalVisible(true)}>
                    <Text style={styles.inputText}>{unit}</Text>
                    <Icon name="chevron-down" size={20} color={colors.common.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Stock Quantity ({unit}) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 50"
                keyboardType="numeric"
                value={stockQuantity}
                onChangeText={setStockQuantity}
              />

              <Text style={styles.label}>Product Image</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={handleSelectImage}>
                {image ? (
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                ) : existingImageUrl ? (
                  <Image source={{ uri: existingImageUrl }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Icon name="camera-outline" size={32} color={colors.agriShop.primary} />
                    <Text style={styles.imagePickerText}>Upload product photo</Text>
                  </View>
                )}
              </TouchableOpacity>
              {(image || existingImageUrl) && (
                <TouchableOpacity style={styles.replacePhotoBtn} onPress={handleSelectImage}>
                  <Text style={styles.replacePhotoText}>Replace Image</Text>
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
                  <Text style={styles.submitButtonText}>Save Product</Text>
                )}
              </TouchableOpacity>

            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* CATEGORY SELECTOR */}
      <Modal visible={isCategoryModalVisible} animationType="fade" transparent>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Category</Text>
            {CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat} style={styles.dropdownItem} 
                onPress={() => { setCategory(cat); setCategoryModalVisible(false); }}
              >
                <Text style={styles.dropdownText}>{cat}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.dropdownClose} onPress={() => setCategoryModalVisible(false)}>
              <Text style={styles.dropdownCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* UNIT SELECTOR */}
      <Modal visible={isUnitModalVisible} animationType="fade" transparent>
        <View style={styles.dropdownOverlay}>
          <View style={styles.dropdownBox}>
            <Text style={styles.dropdownTitle}>Select Unit</Text>
            {UNITS.map(u => (
              <TouchableOpacity 
                key={u} style={styles.dropdownItem} 
                onPress={() => { setUnit(u); setUnitModalVisible(false); }}
              >
                <Text style={styles.dropdownText}>{u}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.dropdownClose} onPress={() => setUnitModalVisible(false)}>
              <Text style={styles.dropdownCloseText}>Close</Text>
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
    backgroundColor: colors.common.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.agriShop.primary, // #7a4f00
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.common.white,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: colors.common.white,
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.common.border,
  },
  cardInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: colors.common.textSecondary,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.agriShop.primary,
  },
  stockCount: {
    fontSize: 14,
    color: colors.common.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: colors.common.textSecondary,
    fontSize: 16,
    marginTop: 12,
  },

  // Modal styling logically embedded
  modalFullContainer: {
    flex: 1,
    backgroundColor: colors.common.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border,
  },
  modalCancelBtn: {
    fontSize: 16,
    color: '#d9534f',
    fontWeight: '600',
  },
  modalTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
  },
  formScroll: {
    padding: 24,
    paddingBottom: 60,
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
    backgroundColor: colors.agriShop.light,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.agriShop.primary,
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
    color: colors.agriShop.primary,
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
    color: colors.agriShop.primary,
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: colors.agriShop.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonText: {
    color: colors.common.white,
    fontSize: 18,
    fontWeight: 'bold',
  },

  // Dropdown overlays
  dropdownOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dropdownBox: {
    backgroundColor: colors.common.white,
    borderRadius: 12,
    width: '100%',
    padding: 16,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.common.border,
  },
  dropdownText: {
    fontSize: 16,
    textAlign: 'center',
  },
  dropdownClose: {
    marginTop: 16,
    paddingVertical: 12,
    backgroundColor: colors.common.background,
    borderRadius: 8,
  },
  dropdownCloseText: {
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default ManageProductsScreen;
