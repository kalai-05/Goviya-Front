import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuthStore } from '../../store/authStore';
import { shopService } from '../../services/shopService';
import { colors } from '../../constants/colors';

interface ShopProduct {
  id: string;
  shopName: string;
  productName: string;
  price: number;
  distance: number;
}

const CropScannerScreen = () => {
  const user = useAuthStore(state => state.user);
  const [image, setImage] = useState<Asset | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<{ disease: string; solution: string } | null>(null);
  const [nearbyShops, setNearbyShops] = useState<ShopProduct[]>([]);

  const handleCamera = async () => {
    const result = await launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
      analyzeImage(result.assets[0]);
    }
  };

  const handleGallery = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setImage(result.assets[0]);
      analyzeImage(result.assets[0]);
    }
  };

  const analyzeImage = async (img: Asset) => {
    setIsAnalyzing(true);
    setResult(null);
    setNearbyShops([]);

    // TODO: Integrate exact ML Kit models using @react-native-ml-kit/image-labeling 
    // Moduling a timeout to replicate AI extraction pipeline for UI purposes securely!
    setTimeout(async () => {
      setResult({
        disease: 'Late Blight (Phytophthora infestans)',
        solution: 'Apply Copper-based fungicides. Remove and destroy infected leaves immediately to prevent spread.',
      });

      await fetchNearbyShops();
      setIsAnalyzing(false);
    }, 2000);
  };

  const fetchNearbyShops = async () => {
    if (!user?.district) return;
    try {
      const response = await shopService.getShops(user.district);

      if (response.success) {
        const shops: ShopProduct[] = response.data.map((item: any) => ({
          id: item.id,
          shopName: item.name || 'Agri Shop',
          productName: item.productName || 'Agri Product', // Adjusted to match potential API fields
          price: item.price || 0,
          distance: item.distance || Math.floor(Math.random() * 10) + 1,
        }));

        setNearbyShops(shops.sort((a, b) => a.distance - b.distance));
      } else if (response.data?.length === 0) {
        // Populate mock data if DB runs empty for preview
        setNearbyShops([
          { id: '1', shopName: 'Saman Agri Center', productName: 'Copper Oxychloride 50%', price: 1200, distance: 3 },
          { id: '2', shopName: 'Nimal Hardware & Agri', productName: 'Mancozeb 80%', price: 850, distance: 5 },
        ]);
      }
    } catch (error) {
      console.error('Failed to fetch shops', error);
    }
  };

  const renderShop = ({ item }: { item: ShopProduct }) => (
    <View style={styles.shopCard}>
      <View style={{ flex: 1 }}>
        <Text style={styles.productName}>{item.productName}</Text>
        <Text style={styles.shopName}><Icon name="storefront-outline" /> {item.shopName}</Text>
        <Text style={styles.distanceText}><Icon name="navigate-outline" /> {item.distance} km away</Text>
      </View>
      <View style={styles.priceContainer}>
        <Text style={styles.priceText}>Rs. {item.price}</Text>
        <TouchableOpacity style={styles.buyButton}>
          <Text style={styles.buyButtonText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={nearbyShops}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Scan Crop</Text>
              <Text style={styles.headerSubtitle}>Identify diseases instantly</Text>
            </View>

            <View style={styles.previewArea}>
              {image ? (
                <Image source={{ uri: image.uri }} style={styles.previewImage} />
              ) : (
                <View style={styles.placeholderContainer}>
                  <Icon name="scan-outline" size={64} color={colors.common.textSecondary} />
                  <Text style={styles.placeholderText}>Tap below to select an image</Text>
                </View>
              )}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleCamera}>
                <Icon name="camera" size={24} color={colors.common.white} />
                <Text style={styles.actionButtonText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonSecondary} onPress={handleGallery}>
                <Icon name="images" size={24} color={colors.farmer.primary} />
                <Text style={styles.actionButtonTextSecondary}>Gallery</Text>
              </TouchableOpacity>
            </View>

            {isAnalyzing && (
              <View style={styles.analyzingContainer}>
                <ActivityIndicator size="large" color={colors.farmer.primary} />
                <Text style={styles.analyzingText}>Analyzing with AI...</Text>
              </View>
            )}

            {!isAnalyzing && result && (
              <View style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  <Icon name="warning" size={24} color="#d9534f" />
                  <Text style={styles.diseaseName}>{result.disease}</Text>
                </View>
                <Text style={styles.solutionTitle}>Recommended Solution:</Text>
                <Text style={styles.solutionText}>{result.solution}</Text>
              </View>
            )}

            {!isAnalyzing && result && (
              <Text style={styles.sectionTitle}>Recommended Agri Shops</Text>
            )}
          </View>
        }
        renderItem={renderShop}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.common.background,
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.farmer.primary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.common.textSecondary,
  },
  previewArea: {
    width: '100%',
    height: 300,
    backgroundColor: '#eaeaea',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#cccccc',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 16,
    color: colors.common.textSecondary,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.farmer.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.farmer.light,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 1,
    borderColor: colors.farmer.primary,
  },
  actionButtonText: {
    color: colors.common.white,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  actionButtonTextSecondary: {
    color: colors.farmer.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  analyzingContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  analyzingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
  resultCard: {
    backgroundColor: '#fdf2f2',
    borderWidth: 1,
    borderColor: '#f5c6cb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  diseaseName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#d9534f',
    marginLeft: 8,
    flex: 1,
  },
  solutionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  solutionText: {
    fontSize: 14,
    color: colors.common.textSecondary,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 16,
  },
  shopCard: {
    flexDirection: 'row',
    backgroundColor: colors.common.white,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.common.border,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 4,
  },
  shopName: {
    fontSize: 14,
    color: colors.common.textSecondary,
    marginBottom: 4,
  },
  distanceText: {
    fontSize: 12,
    color: colors.farmer.primary,
    fontWeight: '600',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.common.textPrimary,
    marginBottom: 8,
  },
  buyButton: {
    backgroundColor: colors.farmer.light,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.farmer.primary,
  },
  buyButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.farmer.primary,
  },
});

export default CropScannerScreen;
