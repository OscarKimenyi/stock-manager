const API = {
    baseURL: '/api',
    
    // Helper function for API calls
    async request(endpoint, options = {}) {
        const url = this.baseURL + endpoint;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'API request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    // Auth APIs
    auth: {
        login: (credentials) => API.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        }),
        
        logout: () => API.request('/auth/logout', {
            method: 'POST'
        }),
        
        checkAuth: () => API.request('/auth/check')
    },

    // Product APIs
    products: {
        getAll: (page = 1, search = '') => 
            API.request(`/products?page=${page}&search=${encodeURIComponent(search)}`),
        
        getOne: (id) => API.request(`/products/${id}`),
        
        create: (data) => API.request('/products', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/products/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/products/${id}`, {
            method: 'DELETE'
        }),
        
        getLowStock: () => API.request('/products/low-stock')
    },

    // Supplier APIs
    suppliers: {
        getAll: () => API.request('/suppliers'),
        
        getOne: (id) => API.request(`/suppliers/${id}`),
        
        create: (data) => API.request('/suppliers', {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        
        update: (id, data) => API.request(`/suppliers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        
        delete: (id) => API.request(`/suppliers/${id}`, {
            method: 'DELETE'
        }),
        
        getHistory: (id) => API.request(`/suppliers/${id}/history`)
    },

    // Stock In APIs
    stockIn: {
        getAll: (page = 1) => API.request(`/stock-in?page=${page}`),
        
        create: (formData) => {
            return fetch(API.baseURL + '/stock-in', {
                method: 'POST',
                body: formData
            }).then(res => res.json());
        },
        
        getUnpaid: () => API.request('/stock-in/unpaid'),
        
        getTotalUnpaid: () => API.request('/stock-in/unpaid/total')
    },

    // Stock Out APIs
    stockOut: {
        getAll: (page = 1) => API.request(`/stock-out?page=${page}`),
        
        create: (data) => API.request('/stock-out', {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // Report APIs
    reports: {
        dashboard: () => API.request('/reports/dashboard'),
        
        currentStock: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.request(`/reports/current-stock?${params}`);
        },
        
        stockIn: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.request(`/reports/stock-in?${params}`);
        },
        
        stockOut: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.request(`/reports/stock-out?${params}`);
        },
        
        supplierPurchases: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.request(`/reports/supplier-purchases?${params}`);
        },
        
        unpaid: (filters = {}) => {
            const params = new URLSearchParams(filters).toString();
            return API.request(`/reports/unpaid?${params}`);
        },
        
        lowStock: () => API.request('/reports/low-stock')
    }
};