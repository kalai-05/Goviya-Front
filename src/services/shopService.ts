import api from './api';

export const shopService = {
  getShops: async (district?: string) => {
    const response = await api.get('/shops/', {
      params: { district }
    });
    return response.data;
  },

  getShopProfile: async (shopId: string) => {
    const response = await api.get(`/shops/${shopId}`);
    return response.data;
  }
};
