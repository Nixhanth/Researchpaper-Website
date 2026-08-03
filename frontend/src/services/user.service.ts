import api from './api';

const userService = {
    updatePassword: async (currentPassword: string, newPassword: string) => {
        return api.post('/api/v1/users/password', { currentPassword, newPassword });
    },
    deactivateAccount: async (otp: string) => {
        return api.delete(`/api/v1/users/me?otp=${otp}`);
    },
    requestDeleteOtp: async (password: string) => {
        return api.post('/api/v1/users/request-delete-otp', { password });
    }
};

export default userService;
