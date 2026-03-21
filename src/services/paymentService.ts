import api from './api';

export const paymentService = {
  initiatePayment: async (orderId: string) => {
    const response = await api.post('/payment/initiate', { orderId });
    // Secure PayHere parameters natively unpack scaling to the target component output boundaries 
    return response.data;
  }
};
