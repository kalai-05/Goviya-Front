import api from './api';

export const orderService = {
  createOrder: async (data: any) => {
    const response = await api.post('/orders', data);
    return response.data;
  },

  getMyOrders: async () => {
    const response = await api.get('/orders/my');
    return response.data;
  },

  confirmOrder: async (orderId: string) => {
    const response = await api.put(`/orders/${orderId}/confirm`);
    return response.data;
  }
};
