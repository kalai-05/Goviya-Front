import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { shopService } from '../../services/shopService';
import { colors } from '../../constants/colors';

type BuyerStackParamList = {
  ChatScreen: { targetUserId: string; targetUserName: string; targetUserRole: string; contextTitle: string };
};

type NavigationProp = NativeStackNavigationProp<BuyerStackParamList>;

interface ShopProduct {
  id: string;
  productName: string;
  category: string;
  price: number;
  unit: string;
  stockStatus: string;
  imageUrl?: string;
}

const ShopPublicProfileScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute<any>();
    const { shopId } = route.params;

    const [products, setProducts] = useState<ShopProduct[]>([]);
    const [shopInfo, setShopInfo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch products
                const prodResponse = await shopService.getShopProfile(shopId); 
                // The current backend getShopProfile returns products list (ShopService.java:22)
                if (Array.isArray(prodResponse)) {
                    setProducts(prodResponse);
                    if (prodResponse.length > 0) {
                        setShopInfo({
                            name: prodResponse[0].shopName || 'Agri Shop',
                            id: prodResponse[0].shopId
                        });
                    }
                }
            } catch (error) {
                console.error('Error fetching shop profile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [shopId]);

    const handleInquire = (product: ShopProduct) => {
        navigation.navigate('ChatScreen', {
            targetUserId: shopId,
            targetUserName: shopInfo?.name || 'Shop',
            targetUserRole: 'SHOP',
            contextTitle: product.productName
        });
    };

    const renderProduct = ({ item }: { item: ShopProduct }) => (
        <View style={styles.productCard}>
            <View style={styles.productInfo}>
                <Text style={styles.productName}>{item.productName}</Text>
                <Text style={styles.categoryText}>{item.category}</Text>
                <Text style={styles.priceText}>Rs. {item.price} / {item.unit}</Text>
                
                <View style={[styles.stockBadge, { backgroundColor: item.stockStatus === 'IN' ? '#e8f5e9' : '#fdeeea' }]}>
                    <Text style={[styles.stockText, { color: item.stockStatus === 'IN' ? '#4caf50' : '#d9534f' }]}>
                        {item.stockStatus === 'IN' ? 'In Stock' : 'Low Stock'}
                    </Text>
                </View>
            </View>

            <TouchableOpacity 
                style={styles.inquireBtn}
                onPress={() => handleInquire(item)}
            >
                <Icon name="chatbubble-ellipses-outline" size={20} color={colors.common.white} />
                <Text style={styles.inquireBtnText}>Inquire</Text>
            </TouchableOpacity>
        </View>
    );

    if (loading) {
        return (
            <View style={styles.loaderContainer}>
                <ActivityIndicator size="large" color={colors.buyer.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={24} color={colors.common.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{shopInfo?.name || 'Shop Products'}</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={products}
                keyExtractor={item => item.id}
                renderItem={renderProduct}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => (
                    <View style={styles.shopHeader}>
                        <Icon name="storefront-outline" size={60} color={colors.buyer.primary} />
                        <Text style={styles.shopNameLarge}>{shopInfo?.name || 'Agri Shop'}</Text>
                        <Text style={styles.shopDescription}>Browse available seeds, fertilizers, and tools.</Text>
                    </View>
                )}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Icon name="basket-outline" size={48} color={colors.common.textSecondary} />
                        <Text style={styles.emptyText}>No products available in this shop.</Text>
                    </View>
                )}
            />
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: colors.buyer.primary,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.common.white,
    },
    shopHeader: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: colors.common.white,
        marginBottom: 20,
        borderRadius: 20,
        elevation: 2,
    },
    shopNameLarge: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.common.textPrimary,
        marginTop: 10,
    },
    shopDescription: {
        fontSize: 14,
        color: colors.common.textSecondary,
        textAlign: 'center',
        marginTop: 5,
    },
    listContent: {
        padding: 16,
    },
    productCard: {
        flexDirection: 'row',
        backgroundColor: colors.common.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        elevation: 2,
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.common.textPrimary,
    },
    categoryText: {
        fontSize: 12,
        color: colors.common.textSecondary,
        marginVertical: 4,
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.buyer.primary,
    },
    stockBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginTop: 8,
    },
    stockText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    inquireBtn: {
        backgroundColor: colors.buyer.primary,
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
    },
    inquireBtnText: {
        color: colors.common.white,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: colors.common.textSecondary,
        marginTop: 10,
    }
});

export default ShopPublicProfileScreen;
