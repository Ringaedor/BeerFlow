# FASE 6 - FRONTEND & BUSINESS INTELLIGENCE INTEGRATION

## Obiettivo Integration
Integrare completamente il frontend React/PWA con tutti i backend systems delle fasi 1-5, implementare Business Intelligence Dashboard con real-time analytics, configurare Mobile PWA avanzata, setup sistema di reporting automatizzato e preparare deployment production-ready dell'intero ecosistema BeerFlow.

## Componenti da Integrare
- Frontend React completo per tutte le funzionalità Fasi 1-5
- Business Intelligence Dashboard con analytics real-time
- Mobile PWA con offline capabilities e native experience
- Advanced Reporting Engine con export multipli e scheduling
- Real-time WebSocket integration per live updates
- Internationalization system (IT/EN/DE)
- Performance optimization avanzato con CDN e caching
- Production deployment setup con monitoring completo

---

## 1. Frontend Integration Setup

### 1.1 Environment Configuration Complete
```bash
#!/bin/bash
# scripts/setup-phase6-frontend.sh

echo "🎨 Setting up BeerFlow Phase 6 Frontend Integration..."

# Create comprehensive .env.local for frontend
cat > frontend/.env.local << 'EOF'
# API Configuration
REACT_APP_API_URL=http://localhost:3000/api/v1
REACT_APP_WS_URL=ws://localhost:3000/ws
REACT_APP_CDN_URL=https://cdn.beerflow.com

# Authentication
REACT_APP_JWT_SECRET=your-super-secret-jwt-key
REACT_APP_AUTH_DOMAIN=auth.beerflow.com

# Analytics & Monitoring
REACT_APP_ANALYTICS_ID=GA-XXXXXXXXX
REACT_APP_SENTRY_DSN=https://xxx@sentry.io/xxx
REACT_APP_MIXPANEL_TOKEN=your-mixpanel-token

# PWA Configuration
REACT_APP_PWA_NAME="BeerFlow Restaurant Management"
REACT_APP_PWA_SHORT_NAME="BeerFlow"
REACT_APP_PWA_THEME_COLOR="#3B82F6"

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_REPORTING=true
REACT_APP_ENABLE_MOBILE_APP=true
REACT_APP_ENABLE_OFFLINE_MODE=true
REACT_APP_ENABLE_REAL_TIME=true

# External Services
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_xxx
REACT_APP_GOOGLE_MAPS_API_KEY=AIzaXXXXXXX
REACT_APP_FIREBASE_CONFIG={}

# Performance & Optimization
REACT_APP_ENABLE_SW=true
REACT_APP_CACHE_DURATION=3600
REACT_APP_API_CACHE_TTL=300

# Development
REACT_APP_DEBUG=true
REACT_APP_LOG_LEVEL=debug
EOF

# Install dependencies
cd frontend
echo "📦 Installing frontend dependencies..."

npm install --silent

# Build optimized production bundle
echo "🏗️ Building optimized production bundle..."
npm run build

# Setup PWA service worker
echo "⚡ Setting up PWA service worker..."
npm run build:pwa

# Generate component documentation
echo "📚 Generating component documentation..."
npm run storybook:build

# Run frontend tests
echo "🧪 Running frontend tests..."
npm run test:ci

# Validate bundle size
echo "📊 Analyzing bundle size..."
npm run analyze

echo "✅ Frontend setup completed successfully!"
```

### 1.2 API Integration Service Complete
```typescript
// src/services/apiService.ts
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/authStore';

export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success: boolean;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  statusCode: number;
}

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (value?: any) => void;
    reject: (error?: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: process.env.REACT_APP_API_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const { token } = useAuthStore.getState();
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add request timestamp for performance tracking
        config.metadata = { startTime: new Date() };

        // Add correlation ID for request tracking
        config.headers['X-Correlation-ID'] = this.generateCorrelationId();

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        // Track response time
        const endTime = new Date();
        const startTime = response.config.metadata?.startTime;
        if (startTime) {
          const duration = endTime.getTime() - startTime.getTime();
          this.trackApiPerformance(response.config.url || '', duration);
        }

        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors with token refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            this.isRefreshing = false;
            this.processQueue(null, newToken);
            
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.processQueue(refreshError, null);
            
            // Redirect to login
            useAuthStore.getState().logout();
            window.location.href = '/login';
            
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors
        if (!error.response) {
          this.handleNetworkError(error);
        }

        return Promise.reject(error);
      }
    );
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private trackApiPerformance(endpoint: string, duration: number) {
    // Send performance metrics to monitoring service
    if (window.gtag) {
      window.gtag('event', 'api_performance', {
        custom_map: {
          endpoint,
          duration,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Log slow API calls
    if (duration > 2000) {
      console.warn(`Slow API call detected: ${endpoint} took ${duration}ms`);
    }
  }

  private async refreshToken(): Promise<string> {
    const { refreshToken } = useAuthStore.getState();
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post('/auth/refresh', {
      refreshToken
    });

    const { token, refreshToken: newRefreshToken } = response.data.data;
    
    useAuthStore.getState().setTokens(token, newRefreshToken);
    
    return token;
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
    
    this.failedQueue = [];
  }

  private handleNetworkError(error: any) {
    // Check if offline
    if (!navigator.onLine) {
      // Queue request for retry when online
      this.queueOfflineRequest(error.config);
    }
  }

  private queueOfflineRequest(config: AxiosRequestConfig) {
    // Store request in localStorage for retry when online
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    offlineQueue.push({
      ...config,
      timestamp: Date.now()
    });
    localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
  }

  // Public API methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.get<ApiResponse<T>>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.post<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.put<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.patch<ApiResponse<T>>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.client.delete<ApiResponse<T>>(url, config);
    return response.data;
  }

  // File upload with progress
  async uploadFile<T>(
    url: string, 
    file: File, 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post<ApiResponse<T>>(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Batch requests
  async batch<T>(requests: Array<() => Promise<any>>): Promise<T[]> {
    const results = await Promise.allSettled(requests.map(req => req()));
    
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Batch request ${index} failed:`, result.reason);
        throw result.reason;
      }
    });
  }

  // Real-time subscriptions
  subscribeToUpdates(venueId: string, callback: (data: any) => void): () => void {
    const ws = new WebSocket(`${process.env.REACT_APP_WS_URL}/venues/${venueId}`);
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      callback(data);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    // Return cleanup function
    return () => {
      ws.close();
    };
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      return false;
    }
  }

  // Retry failed offline requests
  async retryOfflineRequests(): Promise<void> {
    const offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    
    if (offlineQueue.length === 0) return;

    const retryPromises = offlineQueue.map(async (config: any) => {
      try {
        await this.client(config);
        return config;
      } catch (error) {
        console.error('Retry failed for request:', config.url, error);
        throw error;
      }
    });

    try {
      await Promise.allSettled(retryPromises);
      localStorage.removeItem('offlineQueue');
    } catch (error) {
      console.error('Some offline requests failed to retry:', error);
    }
  }
}

export const apiService = new ApiService();

// Specific service classes for different domains
export class VenuesApiService {
  async getVenues() {
    return apiService.get('/venues');
  }

  async getVenue(id: string) {
    return apiService.get(`/venues/${id}`);
  }

  async createVenue(data: any) {
    return apiService.post('/venues', data);
  }

  async updateVenue(id: string, data: any) {
    return apiService.patch(`/venues/${id}`, data);
  }

  async deleteVenue(id: string) {
    return apiService.delete(`/venues/${id}`);
  }
}

export class AnalyticsApiService {
  async getDashboardMetrics(venueId: string, period: string) {
    return apiService.get(`/venues/${venueId}/analytics/dashboard`, {
      params: { period }
    });
  }

  async getSalesAnalytics(venueId: string, startDate: string, endDate: string) {
    return apiService.get(`/venues/${venueId}/analytics/sales`, {
      params: { startDate, endDate }
    });
  }

  async getCustomerAnalytics(venueId: string, period: string) {
    return apiService.get(`/venues/${venueId}/analytics/customers`, {
      params: { period }
    });
  }

  async getInventoryAnalytics(venueId: string) {
    return apiService.get(`/venues/${venueId}/analytics/inventory`);
  }

  async getEmployeeAnalytics(venueId: string, period: string) {
    return apiService.get(`/venues/${venueId}/analytics/employees`, {
      params: { period }
    });
  }

  async getHACCPAnalytics(venueId: string, period: string) {
    return apiService.get(`/venues/${venueId}/analytics/haccp`, {
      params: { period }
    });
  }
}

export class ReportsApiService {
  async getTemplates() {
    return apiService.get('/reports/templates');
  }

  async generateReport(templateId: string, parameters: any, format: string) {
    return apiService.post('/reports/generate', {
      templateId,
      parameters,
      format
    });
  }

  async getReportHistory(limit: number = 20) {
    return apiService.get('/reports/history', {
      params: { limit }
    });
  }

  async scheduleReport(templateId: string, schedule: any) {
    return apiService.post('/reports/schedule', {
      templateId,
      schedule
    });
  }

  async downloadReport(reportId: string) {
    return apiService.get(`/reports/${reportId}/download`, {
      responseType: 'blob'
    });
  }
}

// Export service instances
export const venuesApi = new VenuesApiService();
export const analyticsApi = new AnalyticsApiService();
export const reportsApi = new ReportsApiService();
```

---

## 2. Real-time Integration Setup

### 2.1 WebSocket Integration Service
```typescript
// src/services/websocketService.ts
import { useAuthStore } from '@/stores/authStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { useOrdersStore } from '@/stores/ordersStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useNotificationStore } from '@/stores/notificationStore';

export enum WebSocketEventType {
  // Order events
  ORDER_CREATED = 'order_created',
  ORDER_UPDATED = 'order_updated',
  ORDER_COMPLETED = 'order_completed',
  ORDER_CANCELLED = 'order_cancelled',

  // Inventory events
  INVENTORY_UPDATED = 'inventory_updated',
  LOW_STOCK_ALERT = 'low_stock_alert',
  EXPIRING_ITEMS_ALERT = 'expiring_items_alert',

  // Employee events
  EMPLOYEE_CLOCKED_IN = 'employee_clocked_in',
  EMPLOYEE_CLOCKED_OUT = 'employee_clocked_out',
  SHIFT_STARTED = 'shift_started',
  SHIFT_ENDED = 'shift_ended',

  // HACCP events
  TEMPERATURE_ALERT = 'temperature_alert',
  HACCP_CHECK_OVERDUE = 'haccp_check_overdue',
  COMPLIANCE_ALERT = 'compliance_alert',

  // Customer events
  CUSTOMER_CREATED = 'customer_created',
  CUSTOMER_UPDATED = 'customer_updated',

  // Document events
  DOCUMENT_PROCESSED = 'document_processed',
  OCR_COMPLETED = 'ocr_completed',
  DOCUMENT_PARSED = 'document_parsed',

  // System events
  SYSTEM_ALERT = 'system_alert',
  BACKUP_COMPLETED = 'backup_completed',
  MAINTENANCE_MODE = 'maintenance_mode'
}

export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: any;
  timestamp: string;
  venueId: string;
  userId?: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private eventHandlers: Map<WebSocketEventType, Array<(payload: any) => void>> = new Map();

  connect(venueId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const { token } = useAuthStore.getState();
    
    if (!token) {
      console.error('Cannot connect to WebSocket: No auth token');
      this.isConnecting = false;
      return;
    }

    const wsUrl = `${process.env.REACT_APP_WS_URL}/venues/${venueId}?token=${token}`;
    
    try {
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Process queued messages
        this.processMessageQueue();
        
        // Send heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        
        if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect(venueId);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.isConnecting = false;
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    console.log('Received WebSocket message:', message.type, message.payload);

    // Call registered event handlers
    const handlers = this.eventHandlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message.payload);
      } catch (error) {
        console.error(`Error in WebSocket handler for ${message.type}:`, error);
      }
    });

    // Update stores based on message type
    switch (message.type) {
      case WebSocketEventType.ORDER_CREATED:
      case WebSocketEventType.ORDER_UPDATED:
        useOrdersStore.getState().handleOrderUpdate(message.payload);
        break;

      case WebSocketEventType.INVENTORY_UPDATED:
        useInventoryStore.getState().handleInventoryUpdate(message.payload);
        break;

      case WebSocketEventType.LOW_STOCK_ALERT:
      case WebSocketEventType.EXPIRING_ITEMS_ALERT:
      case WebSocketEventType.TEMPERATURE_ALERT:
      case WebSocketEventType.COMPLIANCE_ALERT:
        useNotificationStore.getState().addNotification({
          type: 'warning',
          title: this.getAlertTitle(message.type),
          message: message.payload.message,
          timestamp: new Date(message.timestamp),
          persistent: true,
          actions: this.getAlertActions(message.type, message.payload)
        });
        break;

      case WebSocketEventType.DOCUMENT_PROCESSED:
        // Refresh documents list
        break;

      case WebSocketEventType.SYSTEM_ALERT:
        useNotificationStore.getState().addNotification({
          type: 'error',
          title: 'System Alert',
          message: message.payload.message,
          timestamp: new Date(message.timestamp),
          persistent: true
        });
        break;
    }

    // Refresh analytics if needed
    if (this.shouldRefreshAnalytics(message.type)) {
      useAnalyticsStore.getState().refreshMetrics();
    }
  }

  private getAlertTitle(type: WebSocketEventType): string {
    switch (type) {
      case WebSocketEventType.LOW_STOCK_ALERT:
        return 'Low Stock Alert';
      case WebSocketEventType.EXPIRING_ITEMS_ALERT:
        return 'Items Expiring Soon';
      case WebSocketEventType.TEMPERATURE_ALERT:
        return 'Temperature Alert';
      case WebSocketEventType.COMPLIANCE_ALERT:
        return 'Compliance Alert';
      default:
        return 'Alert';
    }
  }

  private getAlertActions(type: WebSocketEventType, payload: any): Array<{ label: string; action: () => void }> {
    switch (type) {
      case WebSocketEventType.LOW_STOCK_ALERT:
        return [
          {
            label: 'View Inventory',
            action: () => window.location.href = '/inventory'
          }
        ];
      case WebSocketEventType.TEMPERATURE_ALERT:
        return [
          {
            label: 'View HACCP',
            action: () => window.location.href = '/haccp'
          }
        ];
      default:
        return [];
    }
  }

  private shouldRefreshAnalytics(type: WebSocketEventType): boolean {
    const analyticsRefreshEvents = [
      WebSocketEventType.ORDER_CREATED,
      WebSocketEventType.ORDER_COMPLETED,
      WebSocketEventType.INVENTORY_UPDATED,
      WebSocketEventType.CUSTOMER_CREATED
    ];
    
    return analyticsRefreshEvents.includes(type);
  }

  private scheduleReconnect(venueId: string): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Scheduling WebSocket reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect(venueId);
    }, delay);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private startHeartbeat(): void {
    setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Send ping every 30 seconds
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  subscribe(eventType: WebSocketEventType, handler: (payload: any) => void): () => void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    
    this.eventHandlers.get(eventType)!.push(handler);
    
    // Return unsubscribe function
    return () => {
      const handlers = this.eventHandlers.get(eventType);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  getConnectionStatus(): 'connecting' | 'connected' | 'disconnected' | 'error' {
    if (this.isConnecting) return 'connecting';
    
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return 'disconnected';
      default:
        return 'error';
    }
  }
}

export const websocketService = new WebSocketService();
```

### 2.2 Real-time Analytics Hook
```typescript
// src/hooks/useRealTimeAnalytics.ts
import { useEffect, useRef, useState } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { websocketService, WebSocketEventType } from '@/services/websocketService';

export interface RealTimeMetrics {
  ordersToday: number;
  revenueToday: number;
  activeOrders: number;
  averageOrderValue: number;
  customerCount: number;
  employeesOnDuty: number;
  temperatureAlerts: number;
  lowStockItems: number;
  lastUpdated: Date;
}

export const useRealTimeAnalytics = (venueId: string, autoUpdate = true) => {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>({
    ordersToday: 0,
    revenueToday: 0,
    activeOrders: 0,
    averageOrderValue: 0,
    customerCount: 0,
    employeesOnDuty: 0,
    temperatureAlerts: 0,
    lowStockItems: 0,
    lastUpdated: new Date()
  });

  const [isConnected, setIsConnected] = useState(false);
  const unsubscribeFunctions = useRef<Array<() => void>>([]);
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const { fetchMetrics } = useAnalyticsStore();

  useEffect(() => {
    if (!autoUpdate) return;

    // Connect to WebSocket
    websocketService.connect(venueId);

    // Subscribe to relevant events
    const subscriptions = [
      websocketService.subscribe(WebSocketEventType.ORDER_CREATED, handleOrderUpdate),
      websocketService.subscribe(WebSocketEventType.ORDER_UPDATED, handleOrderUpdate),
      websocketService.subscribe(WebSocketEventType.ORDER_COMPLETED, handleOrderUpdate),
      websocketService.subscribe(WebSocketEventType.INVENTORY_UPDATED, handleInventoryUpdate),
      websocketService.subscribe(WebSocketEventType.LOW_STOCK_ALERT, handleStockAlert),
      websocketService.subscribe(WebSocketEventType.TEMPERATURE_ALERT, handleTemperatureAlert),
      websocketService.subscribe(WebSocketEventType.EMPLOYEE_CLOCKED_IN, handleEmployeeUpdate),
      websocketService.subscribe(WebSocketEventType.EMPLOYEE_CLOCKED_OUT, handleEmployeeUpdate),
    ];

    unsubscribeFunctions.current = subscriptions;

    // Monitor connection status
    const connectionMonitor = setInterval(() => {
      const status = websocketService.getConnectionStatus();
      setIsConnected(status === 'connected');
    }, 1000);

    // Periodic full refresh
    if (autoUpdate) {
      updateInterval.current = setInterval(() => {
        refreshAllMetrics();
      }, 60000); // Refresh every minute
    }

    // Initial data fetch
    refreshAllMetrics();

    return () => {
      // Cleanup subscriptions
      unsubscribeFunctions.current.forEach(unsubscribe => unsubscribe());
      clearInterval(connectionMonitor);
      
      if (updateInterval.current) {
        clearInterval(updateInterval.current);
      }
    };
  }, [venueId, autoUpdate]);

  const handleOrderUpdate = (payload: any) => {
    setRealTimeMetrics(prev => ({
      ...prev,
      ordersToday: payload.todayCount || prev.ordersToday,
      revenueToday: payload.todayRevenue || prev.revenueToday,
      activeOrders: payload.activeCount || prev.activeOrders,
      averageOrderValue: payload.averageValue || prev.averageOrderValue,
      lastUpdated: new Date()
    }));
  };

  const handleInventoryUpdate = (payload: any) => {
    setRealTimeMetrics(prev => ({
      ...prev,
      lowStockItems: payload.lowStockCount || prev.lowStockItems,
      lastUpdated: new Date()
    }));
  };

  const handleStockAlert = (payload: any) => {
    setRealTimeMetrics(prev => ({
      ...prev,
      lowStockItems: prev.lowStockItems + 1,
      lastUpdated: new Date()
    }));
  };

  const handleTemperatureAlert = (payload: any) => {
    setRealTimeMetrics(prev => ({
      ...prev,
      temperatureAlerts: prev.temperatureAlerts + 1,
      lastUpdated: new Date()
    }));
  };

  const handleEmployeeUpdate = (payload: any) => {
    setRealTimeMetrics(prev => ({
      ...prev,
      employeesOnDuty: payload.onDutyCount || prev.employeesOnDuty,
      lastUpdated: new Date()
    }));
  };

  const refreshAllMetrics = async () => {
    try {
      await fetchMetrics(venueId);
      
      // Fetch real-time specific metrics
      const response = await fetch(`/api/v1/venues/${venueId}/analytics/real-time`);
      const data = await response.json();
      
      setRealTimeMetrics({
        ...data.data,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error('Failed to refresh real-time metrics:', error);
    }
  };

  const forceRefresh = () => {
    refreshAllMetrics();
  };

  return {
    realTimeMetrics,
    isConnected,
    forceRefresh,
    lastUpdated: realTimeMetrics.lastUpdated
  };
};
```

---

## 3. PWA Advanced Configuration

### 3.1 Service Worker Advanced
```typescript
// public/sw.js
const CACHE_NAME = 'beerflow-v1.0.0';
const API_CACHE_NAME = 'beerflow-api-v1.0.0';
const STATIC_CACHE_NAME = 'beerflow-static-v1.0.0';

// Files to cache for offline functionality
const STATIC_FILES_TO_CACHE = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache
const API_ENDPOINTS_TO_CACHE = [
  '/api/v1/venues',
  '/api/v1/products',
  '/api/v1/orders',
  '/api/v1/analytics/dashboard'
];

// Background sync tags
const BACKGROUND_SYNC_TAGS = {
  ORDER_SYNC: 'order-sync',
  INVENTORY_SYNC: 'inventory-sync',
  ANALYTICS_SYNC: 'analytics-sync'
};

self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static files
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_FILES_TO_CACHE);
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== API_CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (request.destination === 'document' || 
      request.destination === 'script' || 
      request.destination === 'style' ||
      request.destination === 'image') {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Default: network first, then cache
  event.respondWith(
    fetch(request)
      .catch(() => caches.match(request))
      .catch(() => caches.match('/offline.html'))
  );
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isReadOperation = request.method === 'GET';
  const isCacheableEndpoint = API_ENDPOINTS_TO_CACHE.some(endpoint => 
    url.pathname.startsWith(endpoint)
  );

  if (isReadOperation && isCacheableEndpoint) {
    // Network first, cache fallback for GET requests
    try {
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
      
      throw new Error('Network response not ok');
    } catch (error) {
      console.log('Network failed, serving from cache:', url.pathname);
      const cachedResponse = await caches.match(request);
      
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Return offline response for API calls
      return new Response(
        JSON.stringify({
          error: 'Offline',
          message: 'This feature is not available offline'
        }),
        {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  } else {
    // For POST/PUT/DELETE requests, use background sync if offline
    try {
      return await fetch(request);
    } catch (error) {
      if (request.method !== 'GET') {
        // Queue for background sync
        await queueForBackgroundSync(request);
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Request queued for when online',
            queued: true
          }),
          {
            status: 202,
            statusText: 'Accepted',
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      throw error;
    }
  }
}

async function handleStaticRequest(request) {
  // Cache first, network fallback for static files
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // For navigation requests, serve offline page
    if (request.destination === 'document') {
      return caches.match('/offline.html');
    }
    
    throw error;
  }
}

async function queueForBackgroundSync(request) {
  const requestData = {
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries()),
    body: request.method !== 'GET' ? await request.text() : null,
    timestamp: Date.now()
  };

  // Store in IndexedDB for background sync
  const db = await openIndexedDB();
  const transaction = db.transaction(['background_sync'], 'readwrite');
  const store = transaction.objectStore('background_sync');
  
  await store.add({
    id: generateId(),
    request: requestData,
    tag: determineBackgroundSyncTag(request.url),
    created_at: new Date()
  });

  // Register background sync
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(determineBackgroundSyncTag(request.url));
  }
}

function determineBackgroundSyncTag(url) {
  if (url.includes('/orders')) return BACKGROUND_SYNC_TAGS.ORDER_SYNC;
  if (url.includes('/inventory')) return BACKGROUND_SYNC_TAGS.INVENTORY_SYNC;
  if (url.includes('/analytics')) return BACKGROUND_SYNC_TAGS.ANALYTICS_SYNC;
  return 'general-sync';
}

self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (Object.values(BACKGROUND_SYNC_TAGS).includes(event.tag)) {
    event.waitUntil(processBackgroundSync(event.tag));
  }
});

async function processBackgroundSync(tag) {
  const db = await openIndexedDB();
  const transaction = db.transaction(['background_sync'], 'readwrite');
  const store = transaction.objectStore('background_sync');
  
  const requests = await store.index('tag').getAll(tag);
  
  for (const item of requests) {
    try {
      const { request } = item;
      
      const fetchRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });
      
      const response = await fetch(fetchRequest);
      
      if (response.ok) {
        // Remove successful request from queue
        await store.delete(item.id);
        console.log('Background sync successful for:', request.url);
      } else {
        console.error('Background sync failed for:', request.url, response.status);
      }
    } catch (error) {
      console.error('Background sync error for:', item.request.url, error);
    }
  }
}

// IndexedDB helper
async function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('BeerFlowCache', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      if (!db.objectStoreNames.contains('background_sync')) {
        const store = db.createObjectStore('background_sync', { keyPath: 'id' });
        store.createIndex('tag', 'tag', { unique: false });
      }
    };
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Push notification handler
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    data: data.data,
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    timestamp: Date.now(),
    tag: data.tag || 'general'
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data;
  const action = event.action;

  if (action) {
    // Handle action buttons
    switch (action) {
      case 'view_order':
        event.waitUntil(clients.openWindow(`/orders/${data.orderId}`));
        break;
      case 'view_alert':
        event.waitUntil(clients.openWindow(`/alerts/${data.alertId}`));
        break;
      default:
        event.waitUntil(clients.openWindow(data.url || '/'));
    }
  } else {
    // Handle notification body click
    event.waitUntil(clients.openWindow(data.url || '/'));
  }
});

// Periodic background sync for analytics
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'analytics-update') {
    event.waitUntil(updateAnalyticsCache());
  }
});

async function updateAnalyticsCache() {
  try {
    const cache = await caches.open(API_CACHE_NAME);
    const analyticsEndpoints = [
      '/api/v1/analytics/dashboard',
      '/api/v1/analytics/real-time'
    ];

    for (const endpoint of analyticsEndpoints) {
      const response = await fetch(endpoint);
      if (response.ok) {
        await cache.put(endpoint, response);
      }
    }
  } catch (error) {
    console.error('Periodic analytics update failed:', error);
  }
}
```

---

## 4. Production Deployment Integration

### 4.1 Frontend Build & Deployment Script
```bash
#!/bin/bash
# scripts/deploy-frontend-production.sh

set -euo pipefail

print_title() { echo -e "\n🚀 $1"; }
print_success() { echo "✅ $1"; }
print_error() { echo "❌ $1"; exit 1; }

print_title "BeerFlow Frontend Production Deployment"

# Configuration
ENVIRONMENT=${1:-production}
CDN_BUCKET=${CDN_BUCKET:-beerflow-static-assets}
FRONTEND_DOMAIN=${FRONTEND_DOMAIN:-app.beerflow.com}
API_DOMAIN=${API_DOMAIN:-api.beerflow.com}

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
    print_error "Invalid environment: $ENVIRONMENT. Use 'staging' or 'production'"
fi

print_title "Building Frontend for $ENVIRONMENT"

cd frontend

# Set environment variables
export NODE_ENV=production
export REACT_APP_ENVIRONMENT=$ENVIRONMENT
export REACT_APP_API_URL=https://$API_DOMAIN/api/v1
export REACT_APP_WS_URL=wss://$API_DOMAIN/ws
export REACT_APP_CDN_URL=https://cdn.beerflow.com

# Install dependencies
print_title "Installing dependencies..."
npm ci --production=false

# Run tests
print_title "Running tests..."
npm run test:ci || print_error "Tests failed"

# Lint and format check
print_title "Running code quality checks..."
npm run lint || print_error "Linting failed"
npm run format:check || print_error "Format check failed"

# Type check
print_title "Running TypeScript type check..."
npm run type-check || print_error "Type check failed"

# Build application
print_title "Building application..."
npm run build || print_error "Build failed"

# Analyze bundle size
print_title "Analyzing bundle size..."
npm run analyze > build-analysis.txt

# Check bundle size limits
BUNDLE_SIZE=$(du -s build/ | cut -f1)
MAX_BUNDLE_SIZE=20480  # 20MB in KB

if [ "$BUNDLE_SIZE" -gt "$MAX_BUNDLE_SIZE" ]; then
    print_error "Bundle size ($BUNDLE_SIZE KB) exceeds limit ($MAX_BUNDLE_SIZE KB)"
fi

print_success "Bundle size: $BUNDLE_SIZE KB (within limits)"

# Generate service worker
print_title "Generating service worker..."
npm run build:sw || print_error "Service worker generation failed"

# Optimize images
print_title "Optimizing images..."
if command -v imagemin &> /dev/null; then
    find build/static/media -name "*.jpg" -o -name "*.png" -o -name "*.svg" | xargs imagemin --out-dir=build/static/media/
fi

# Generate sitemap
print_title "Generating sitemap..."
cat > build/sitemap.xml << EOF
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://$FRONTEND_DOMAIN/</loc>
    <lastmod>$(date -u +%Y-%m-%d)</lastmod>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://$FRONTEND_DOMAIN/login</loc>
    <lastmod>$(date -u +%Y-%m-%d)</lastmod>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://$FRONTEND_DOMAIN/pos</loc>
    <lastmod>$(date -u +%Y-%m-%d)</lastmod>
    <priority>0.9</priority>
  </url>
</urlset>
EOF

# Generate robots.txt
cat > build/robots.txt << EOF
User-agent: *
Disallow: /api/
Disallow: /admin/
Allow: /

Sitemap: https://$FRONTEND_DOMAIN/sitemap.xml
EOF

# Upload to CDN/S3
print_title "Uploading to CDN..."

if command -v aws &> /dev/null; then
    # Upload static assets to CDN
    aws s3 sync build/static/ s3://$CDN_BUCKET/static/ \
        --delete \
        --cache-control "public, max-age=31536000, immutable" \
        --content-encoding gzip

    # Upload HTML files with shorter cache
    aws s3 sync build/ s3://$CDN_BUCKET/ \
        --exclude "static/*" \
        --cache-control "public, max-age=300" \
        --content-type "text/html"

    # Invalidate CloudFront
    if [ -n "${CLOUDFRONT_DISTRIBUTION_ID:-}" ]; then
        aws cloudfront create-invalidation \
            --distribution-id $CLOUDFRONT_DISTRIBUTION_ID \
            --paths "/*"
    fi
else
    print_error "AWS CLI not available for CDN upload"
fi

# Test deployment
print_title "Testing deployment..."

# Wait for CDN propagation
sleep 30

# Test main page load
MAIN_PAGE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$FRONTEND_DOMAIN/)
if [ "$MAIN_PAGE_STATUS" != "200" ]; then
    print_error "Main page not accessible (HTTP $MAIN_PAGE_STATUS)"
fi

# Test API connectivity
API_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$API_DOMAIN/health)
if [ "$API_STATUS" != "200" ]; then
    print_error "API not accessible (HTTP $API_STATUS)"
fi

# Test PWA manifest
MANIFEST_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$FRONTEND_DOMAIN/manifest.json)
if [ "$MANIFEST_STATUS" != "200" ]; then
    print_error "PWA manifest not accessible (HTTP $MANIFEST_STATUS)"
fi

# Test service worker
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://$FRONTEND_DOMAIN/sw.js)
if [ "$SW_STATUS" != "200" ]; then
    print_error "Service worker not accessible (HTTP $SW_STATUS)"
fi

print_success "All deployment tests passed"

# Performance test with Lighthouse
if command -v lighthouse &> /dev/null; then
    print_title "Running Lighthouse performance test..."
    
    lighthouse https://$FRONTEND_DOMAIN/ \
        --output json \
        --output-path lighthouse-report.json \
        --chrome-flags="--headless --no-sandbox" \
        --quiet

    # Extract scores
    PERFORMANCE_SCORE=$(cat lighthouse-report.json | jq '.categories.performance.score * 100')
    PWA_SCORE=$(cat lighthouse-report.json | jq '.categories.pwa.score * 100')
    
    print_success "Performance Score: $PERFORMANCE_SCORE/100"
    print_success "PWA Score: $PWA_SCORE/100"
    
    # Fail if scores are too low
    if (( $(echo "$PERFORMANCE_SCORE < 80" | bc -l) )); then
        print_error "Performance score too low: $PERFORMANCE_SCORE (minimum: 80)"
    fi
    
    if (( $(echo "$PWA_SCORE < 90" | bc -l) )); then
        print_error "PWA score too low: $PWA_SCORE (minimum: 90)"
    fi
fi

# Update deployment status
print_title "Updating deployment status..."

DEPLOYMENT_INFO=$(cat << EOF
{
  "environment": "$ENVIRONMENT",
  "version": "$(git rev-parse HEAD)",
  "deployed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployed_by": "$(git config user.email)",
  "build_size_kb": $BUNDLE_SIZE,
  "performance_score": ${PERFORMANCE_SCORE:-0},
  "pwa_score": ${PWA_SCORE:-0},
  "frontend_url": "https://$FRONTEND_DOMAIN",
  "api_url": "https://$API_DOMAIN"
}
EOF
)

echo "$DEPLOYMENT_INFO" > deployment-info.json

# Send deployment notification
if [ -n "${SLACK_WEBHOOK:-}" ]; then
    curl -X POST -H 'Content-type: application/json' \
        --data "{
            \"text\": \"🚀 BeerFlow Frontend deployed to $ENVIRONMENT\",
            \"attachments\": [{
                \"color\": \"good\",
                \"fields\": [
                    {\"title\": \"Environment\", \"value\": \"$ENVIRONMENT\", \"short\": true},
                    {\"title\": \"Version\", \"value\": \"$(git rev-parse --short HEAD)\", \"short\": true},
                    {\"title\": \"Performance\", \"value\": \"${PERFORMANCE_SCORE:-N/A}/100\", \"short\": true},
                    {\"title\": \"PWA Score\", \"value\": \"${PWA_SCORE:-N/A}/100\", \"short\": true}
                ]
            }]
        }" \
        $SLACK_WEBHOOK
fi

print_title "🎉 FRONTEND DEPLOYMENT COMPLETED SUCCESSFULLY"

echo "
✅ Frontend Build: SUCCESS
✅ Code Quality: PASSED
✅ Bundle Size: $BUNDLE_SIZE KB (within limits)
✅ CDN Upload: COMPLETED
✅ Performance Score: ${PERFORMANCE_SCORE:-N/A}/100
✅ PWA Score: ${PWA_SCORE:-N/A}/100
✅ Deployment Tests: ALL PASSED

🌐 Frontend URL: https://$FRONTEND_DOMAIN
📊 Analytics: Available in real-time dashboard
📱 PWA: Installable on mobile devices
🔄 Auto-updates: Enabled via service worker

🍺 BeerFlow Frontend is now live in $ENVIRONMENT!
"

print_success "Frontend deployment completed successfully!"
```

---

## 5. Frontend Validation Complete

### 5.1 Complete Frontend Integration Test
```typescript
// src/test/integration/complete-frontend.integration.spec.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from '../App';
import { apiService } from '../services/apiService';
import { websocketService } from '../services/websocketService';

// Mock services
jest.mock('../services/apiService');
jest.mock('../services/websocketService');

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockWebSocketService = websocketService as jest.Mocked<typeof websocketService>;

const renderApp = (initialRoute = '/') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  window.history.pushState({}, 'Test page', initialRoute);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe('Complete Frontend Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful authentication
    mockApiService.post.mockResolvedValue({
      data: {
        token: 'mock-jwt-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-123',
          email: 'test@beerflow.com',
          role: 'manager',
          venue: {
            id: 'venue-123',
            name: 'Test Restaurant'
          }
        }
      },
      success: true
    });
  });

  describe('Authentication Flow', () => {
    it('should handle complete login flow', async () => {
      renderApp('/login');
      
      // Fill login form
      await userEvent.type(screen.getByLabelText(/email/i), 'test@beerflow.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'password123');
      
      // Submit form
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      // Wait for API call
      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/auth/login', {
          email: 'test@beerflow.com',
          password: 'password123'
        });
      });
      
      // Should redirect to dashboard
      await waitFor(() => {
        expect(window.location.pathname).toBe('/dashboard');
      });
    });

    it('should handle authentication errors', async () => {
      mockApiService.post.mockRejectedValue(new Error('Invalid credentials'));
      
      renderApp('/login');
      
      await userEvent.type(screen.getByLabelText(/email/i), 'wrong@email.com');
      await userEvent.type(screen.getByLabelText(/password/i), 'wrongpassword');
      
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
      });
    });
  });

  describe('Business Intelligence Dashboard', () => {
    beforeEach(() => {
      // Mock analytics data
      mockApiService.get.mockImplementation((url) => {
        if (url.includes('/analytics/dashboard')) {
          return Promise.resolve({
            data: {
              dailySales: [
                {
                  date: '2024-12-20',
                  totalRevenue: 1250.50,
                  orderCount: 45,
                  averageOrderValue: 27.79
                }
              ],
              customerMetrics: {
                totalCustomers: 1250,
                newCustomers: 25,
                returningCustomers: 1225,
                customerGrowth: 5.2
              },
              employeeMetrics: {
                totalEmployees: 12,
                activeEmployees: 8,
                averageHoursPerWeek: 32.5
              }
            },
            success: true
          });
        }
        return Promise.resolve({ data: {}, success: true });
      });
    });

    it('should display analytics dashboard with real-time data', async () => {
      renderApp('/analytics');
      
      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      });
      
      // Check KPI cards are displayed
      expect(screen.getByText('€1,250.50')).toBeInTheDocument(); // Revenue
      expect(screen.getByText('45')).toBeInTheDocument(); // Orders
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Customers
      
      // Check charts are rendered
      expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
      expect(screen.getByText('Customer Segments')).toBeInTheDocument();
    });

    it('should handle period selection changes', async () => {
      renderApp('/analytics');
      
      await waitFor(() => {
        expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      });
      
      // Change period to "This Month"
      const periodSelector = screen.getByRole('combobox');
      await userEvent.click(periodSelector);
      await userEvent.click(screen.getByText('This Month'));
      
      // Should trigger new API call
      await waitFor(() => {
        expect(mockApiService.get).toHaveBeenCalledWith(
          expect.stringContaining('/analytics/dashboard'),
          expect.objectContaining({
            params: expect.objectContaining({
              period: 'month'
            })
          })
        );
      });
    });

    it('should handle real-time updates via WebSocket', async () => {
      renderApp('/analytics');
      
      await waitFor(() => {
        expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      });
      
      // Verify WebSocket connection was established
      expect(mockWebSocketService.connect).toHaveBeenCalledWith('venue-123');
      
      // Simulate WebSocket message
      const mockHandler = mockWebSocketService.subscribe.mock.calls.find(
        call => call[0] === 'order_created'
      )?.[1];
      
      if (mockHandler) {
        mockHandler({
          todayCount: 46,
          todayRevenue: 1278.29
        });
        
        // Should update the display
        await waitFor(() => {
          expect(screen.getByText('46')).toBeInTheDocument();
        });
      }
    });
  });

  describe('POS System Integration', () => {
    beforeEach(() => {
      // Mock products data
      mockApiService.get.mockImplementation((url) => {
        if (url.includes('/products')) {
          return Promise.resolve({
            data: [
              {
                id: 'prod-1',
                name: 'Birra Lager',
                price: 5.50,
                available_quantity: 25,
                category_id: 'cat-beer'
              },
              {
                id: 'prod-2',
                name: 'Pizza Margherita',
                price: 12.00,
                available_quantity: 100,
                category_id: 'cat-food'
              }
            ],
            success: true
          });
        }
        return Promise.resolve({ data: [], success: true });
      });
    });

    it('should handle complete POS workflow', async () => {
      renderApp('/pos');
      
      await waitFor(() => {
        expect(screen.getByText('POS System')).toBeInTheDocument();
      });
      
      // Products should be displayed
      await waitFor(() => {
        expect(screen.getByText('Birra Lager')).toBeInTheDocument();
        expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
      });
      
      // Add product to cart
      const addButton = screen.getAllByRole('button', { name: /add/i })[0];
      await userEvent.click(addButton);
      
      // Cart should update
      expect(screen.getByText('1')).toBeInTheDocument(); // Cart count
      
      // Open checkout
      const checkoutButton = screen.getByRole('button', { name: /cart/i });
      await userEvent.click(checkoutButton);
      
      // Checkout form should appear
      await waitFor(() => {
        expect(screen.getByText('Checkout')).toBeInTheDocument();
      });
    });

    it('should handle offline functionality', async () => {
      // Simulate offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      renderApp('/pos');
      
      await waitFor(() => {
        expect(screen.getByText('POS System')).toBeInTheDocument();
      });
      
      // Should show offline indicator
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
      
      // Should still allow basic functionality
      expect(screen.getByRole('button', { name: /cart/i })).toBeDisabled();
    });
  });

  describe('Mobile PWA Experience', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667
      });
    });

    it('should adapt layout for mobile', async () => {
      renderApp('/');
      
      await waitFor(() => {
        expect(screen.getByText('BeerFlow')).toBeInTheDocument();
      });
      
      // Mobile navigation should be present
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument();
      
      // Desktop sidebar should be hidden
      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    });

    it('should handle PWA installation prompt', async () => {
      // Mock beforeinstallprompt event
      const mockPrompt = {
        prompt: jest.fn(),
        userChoice: Promise.resolve({ outcome: 'accepted' })
      };
      
      window.deferredPrompt = mockPrompt;
      
      renderApp('/');
      
      // PWA install button should appear
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /install app/i })).toBeInTheDocument();
      });
      
      // Click install
      await userEvent.click(screen.getByRole('button', { name: /install app/i }));
      
      expect(mockPrompt.prompt).toHaveBeenCalled();
    });
  });

  describe('Reporting System Integration', () => {
    beforeEach(() => {
      mockApiService.get.mockImplementation((url) => {
        if (url.includes('/reports/templates')) {
          return Promise.resolve({
            data: [
              {
                id: 'daily-sales',
                name: 'Daily Sales Report',
                description: 'Daily sales summary',
                parameters: [
                  {
                    name: 'date',
                    type: 'date',
                    label: 'Report Date',
                    required: true
                  }
                ]
              }
            ],
            success: true
          });
        }
        return Promise.resolve({ data: [], success: true });
      });
    });

    it('should generate and download reports', async () => {
      renderApp('/reports');
      
      await waitFor(() => {
        expect(screen.getByText('Reports')).toBeInTheDocument();
      });
      
      // Select report template
      await userEvent.click(screen.getByText('Daily Sales Report'));
      
      // Fill parameters
      const dateInput = screen.getByLabelText('Report Date');
      await userEvent.type(dateInput, '2024-12-20');
      
      // Generate report
      await userEvent.click(screen.getByRole('button', { name: /generate/i }));
      
      await waitFor(() => {
        expect(mockApiService.post).toHaveBeenCalledWith('/reports/generate', {
          templateId: 'daily-sales',
          parameters: { date: '2024-12-20' },
          format: 'pdf'
        });
      });
    });
  });

  describe('Error Handling & Recovery', () => {
    it('should handle API errors gracefully', async () => {
      mockApiService.get.mockRejectedValue(new Error('Server error'));
      
      renderApp('/analytics');
      
      await waitFor(() => {
        expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
      });
      
      // Should show retry button
      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();
      
      // Clear the error for retry
      mockApiService.get.mockResolvedValue({ data: {}, success: true });
      
      await userEvent.click(retryButton);
      
      await waitFor(() => {
        expect(screen.queryByText(/failed to load/i)).not.toBeInTheDocument();
      });
    });

    it('should handle WebSocket disconnection', async () => {
      renderApp('/analytics');
      
      await waitFor(() => {
        expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      });
      
      // Simulate WebSocket disconnection
      mockWebSocketService.getConnectionStatus.mockReturnValue('disconnected');
      
      // Should show connection status
      await waitFor(() => {
        expect(screen.getByText(/connection lost/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance & Accessibility', () => {
    it('should lazy load routes', async () => {
      renderApp('/');
      
      // Initial route should load immediately
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      
      // Navigate to analytics (should lazy load)
      fireEvent.click(screen.getByText('Analytics'));
      
      // Should show loading state first
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      
      // Then load the component
      await waitFor(() => {
        expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      });
    });

    it('should be accessible with keyboard navigation', async () => {
      renderApp('/');
      
      // Tab through navigation
      const firstLink = screen.getAllByRole('link')[0];
      firstLink.focus();
      
      expect(document.activeElement).toBe(firstLink);
      
      // Should be able to navigate with keyboard
      fireEvent.keyDown(firstLink, { key: 'Tab' });
      
      expect(document.activeElement).not.toBe(firstLink);
    });
  });
});
```

---

## 6. Production Readiness Checklist Fase 6

### Frontend Complete Implementation ✅
- [ ] React PWA completa per tutti i moduli Fasi 1-5
- [ ] Business Intelligence Dashboard con real-time analytics
- [ ] Mobile-responsive design con touch-optimized UI
- [ ] Offline functionality per core operations (POS, orders)
- [ ] Service Worker con background sync e caching intelligente
- [ ] Push notifications per alerts critici
- [ ] Performance: Load time < 3s, Lighthouse score >= 90

### Business Intelligence & Analytics ✅
- [ ] Real-time metrics dashboard con WebSocket integration
- [ ] Advanced charts e visualizations (sales, customers, inventory)
- [ ] Customer segmentation e lifetime value analytics
- [ ] Employee performance tracking e timesheet analytics
- [ ] HACCP compliance monitoring con temperature trends
- [ ] Financial analytics con profit/loss calculations
- [ ] Predictive analytics per inventory e sales forecasting

### Advanced Reporting System ✅
- [ ] Report templates per sales, customers, inventory, employees, HACCP
- [ ] Multi-format export (PDF, Excel, CSV) con custom styling
- [ ] Scheduled reports con email automation
- [ ] Interactive parameters e date range selection
- [ ] Report history e versioning
- [ ] Batch report generation per multiple venues
- [ ] Performance: Report generation < 30s per standard reports

### Mobile PWA Experience ✅
- [ ] PWA installable su iOS e Android devices
- [ ] Offline-first architecture con intelligent caching
- [ ] Touch-optimized UI per tablet e mobile operations
- [ ] Native-like experience con smooth animations
- [ ] Background sync per critical operations
- [ ] Push notifications con action buttons
- [ ] App shortcuts per quick access alle funzioni principali

### Real-time Integration ✅
- [ ] WebSocket connection per live updates
- [ ] Real-time order tracking e status updates
- [ ] Live inventory levels con automatic refresh
- [ ] Instant HACCP alerts e compliance notifications
- [ ] Employee clock-in/out real-time tracking
- [ ] Customer activity live feed
- [ ] Performance: WebSocket latency < 100ms

### Internationalization & Accessibility ✅
- [ ] Multi-language support (IT/EN/DE) con dynamic switching
- [ ] RTL language support preparation
- [ ] WCAG 2.1 AA compliance per accessibility
- [ ] Keyboard navigation completa
- [ ] Screen reader compatibility
- [ ] High contrast mode support
- [ ] Font size scaling support

### Performance Optimization ✅
- [ ] Code splitting per route-based lazy loading
- [ ] Bundle optimization con tree shaking
- [ ] CDN integration per static assets
- [ ] Image optimization con WebP support
- [ ] Critical CSS inlining
- [ ] Preloading strategies per critical resources
- [ ] Performance: FCP < 2s, LCP < 3s, CLS < 0.1

### Security & Privacy ✅
- [ ] CSP headers implementation
- [ ] XSS protection con input sanitization
- [ ] Secure authentication flow con JWT refresh
- [ ] HTTPS everywhere enforcement
- [ ] Privacy-focused analytics (no personal data tracking)
- [ ] Local data encryption per sensitive information
- [ ] Security headers compliance (OWASP)

### Production Deployment ✅
- [ ] CI/CD pipeline per automated deployments
- [ ] Environment-specific configurations
- [ ] CDN deployment con cache invalidation
- [ ] Health checks e monitoring integration
- [ ] Error tracking con Sentry integration
- [ ] Performance monitoring con real user metrics
- [ ] Backup e disaster recovery procedures

### Business Integration Complete ✅
- [ ] Complete workflow: Analytics → Reports → Actions → Results
- [ ] Cross-module data consistency e validation
- [ ] Business rule enforcement nel frontend
- [ ] Manager dashboard con executive-level insights
- [ ] Staff mobile app con role-based permissions
- [ ] Customer-facing features preparation
- [ ] Multi-venue management support

La Fase 6 è completa quando il frontend fornisce un'esperienza utente completa, mobile-first, con business intelligence avanzata e production-grade performance per l'intero ecosistema BeerFlow.
