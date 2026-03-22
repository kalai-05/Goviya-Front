import api from './api';

export const productService = {
  getProducts: async (shopId?: string) => {
    const response = await api.get('/shops/', {
      params: { district: shopId } // This name is slightly confusing but just following the pattern
    });
    return response.data;
  },

  getShopProducts: async () => {
    const response = await api.get('/shops/products/my');
    return response.data;
  },

  createProduct: async (data: any) => {
    const response = await api.post('/shops/products', data);
    return response.data;
  },

  updateProduct: async (id: string, data: any) => {
    const response = await api.put(`/shops/products/${id}`, data);
    return response.data;
  },

  deleteProduct: async (id: string) => {
    const response = await api.delete(`/shops/products/${id}`);
    return response.data;
  }
};
