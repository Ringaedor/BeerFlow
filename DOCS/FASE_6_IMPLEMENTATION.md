# FASE 6 - FRONTEND COMPLETE & BUSINESS INTELLIGENCE IMPLEMENTATION

## Obiettivo Fase
Completare l'ecosistema BeerFlow con frontend React/PWA completo per tutte le funzionalità implementate nelle fasi 1-5, Business Intelligence Dashboard con analytics avanzate, Mobile App nativa, sistema di reporting avanzato e optimizzazioni performance per deployment production-ready dell'intera piattaforma.

## Prerequisiti Verificati
- Fase 1-5: Tutti i backend systems operativi e testati
- API Complete: Tutti gli endpoint documentati e funzionanti
- Database: Schema completo con dati di test
- Authentication: JWT system funzionante
- File Storage: S3-compatible storage configurato
- Monitoring: Prometheus/Grafana operativo

## Architettura Moduli Fase 6
- **Frontend Complete**: React PWA con tutti i moduli Fasi 1-5
- **Business Intelligence**: Dashboard analytics avanzate con insights
- **Mobile App**: React Native app per iOS/Android o PWA avanzata
- **Reporting Engine**: Sistema reporting avanzato con export multipli
- **Analytics Engine**: Customer insights, sales analytics, predictive metrics
- **Internationalization**: Multi-language support (IT/EN/DE)
- **Performance Optimization**: CDN, caching, code splitting avanzato
- **Production Frontend**: Deployment ottimizzato con monitoring

---

## 1. Frontend Architecture Complete

### 1.1 Dipendenze Frontend Advanced
```bash
cd frontend

# Core React ecosystem
npm install react@18 react-dom@18 react-router-dom@6
npm install @types/react @types/react-dom

# State management & API
npm install @tanstack/react-query@5 zustand
npm install axios @types/axios

# UI & Design System
npm install @headlessui/react @heroicons/react
npm install tailwindcss @tailwindcss/forms @tailwindcss/typography
npm install class-variance-authority clsx tailwind-merge lucide-react

# Charts & Analytics
npm install recharts @types/recharts
npm install chart.js react-chartjs-2 @types/chart.js
npm install d3 @types/d3 visx
npm install react-virtualized @types/react-virtualized

# Forms & Validation
npm install react-hook-form @hookform/resolvers
npm install zod yup @types/yup

# PWA & Mobile
npm install workbox-webpack-plugin workbox-precaching
npm install react-native-web @types/react-native

# Internationalization
npm install react-i18next i18next i18next-browser-languagedetector
npm install i18next-http-backend

# Advanced Features
npm install framer-motion react-spring
npm install react-virtual react-window @types/react-window
npm install date-fns @types/date-fns
npm install lodash @types/lodash

# Reporting & Export
npm install jspdf html2canvas xlsx
npm install react-to-print @types/react-to-print

# Real-time & WebSocket
npm install socket.io-client @types/socket.io-client

# Testing
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jest-environment-jsdom
npm install -D cypress @cypress/react @cypress/webpack-dev-server
npm install -D storybook @storybook/react-vite

# Performance & Monitoring
npm install web-vitals @types/web-vitals
npm install @sentry/react @sentry/tracing

# Development tools
npm install -D @vitejs/plugin-react @vitejs/plugin-pwa
npm install -D vite-plugin-windicss vite-plugin-eslint
npm install -D prettier eslint-config-prettier
```

### 1.2 Project Structure Complete
```
frontend/
├── public/
│   ├── icons/                    # PWA icons
│   ├── locales/                  # i18n translations
│   └── sw.js                     # Service Worker
├── src/
│   ├── components/               # Shared components
│   │   ├── ui/                   # Base UI components (shadcn/ui style)
│   │   ├── forms/                # Form components
│   │   ├── charts/               # Chart components
│   │   ├── tables/               # Data table components
│   │   └── layout/               # Layout components
│   ├── features/                 # Feature-based modules
│   │   ├── auth/                 # Authentication (Phase 1)
│   │   ├── venues/               # Venue management (Phase 1)
│   │   ├── products/             # Product catalog (Phase 2)
│   │   ├── inventory/            # Inventory management (Phase 2)
│   │   ├── orders/               # Order management (Phase 3)
│   │   ├── pos/                  # POS system (Phase 3)
│   │   ├── tables/               # Table management (Phase 3)
│   │   ├── employees/            # Employee portal (Phase 4)
│   │   ├── haccp/                # HACCP compliance (Phase 4)
│   │   ├── documents/            # Document intelligence (Phase 5)
│   │   ├── customers/            # CRM system (Phase 5)
│   │   ├── providers/            # Provider management (Phase 5)
│   │   ├── analytics/            # Business Intelligence (Phase 6)
│   │   └── reports/              # Advanced reporting (Phase 6)
│   ├── hooks/                    # Custom React hooks
│   ├── services/                 # API services
│   ├── stores/                   # Zustand stores
│   ├── utils/                    # Utility functions
│   ├── types/                    # TypeScript types
│   ├── i18n/                     # Internationalization
│   ├── constants/                # App constants
│   └── App.tsx                   # Main app component
├── docs/                         # Component documentation
├── cypress/                      # E2E tests
├── .storybook/                   # Storybook config
└── vite.config.ts               # Vite configuration
```

---

## 2. Business Intelligence Dashboard

### 2.1 Analytics Store (src/stores/analyticsStore.ts)
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { analyticsService } from '../services/analyticsService';

export interface AnalyticsMetrics {
  // Sales Analytics
  dailySales: {
    date: string;
    totalRevenue: number;
    orderCount: number;
    averageOrderValue: number;
    topProducts: Array<{
      product_id: string;
      name: string;
      quantity: number;
      revenue: number;
    }>;
  }[];
  
  weeklySales: {
    weekStart: string;
    totalRevenue: number;
    orderCount: number;
    growth: number;
  }[];
  
  monthlySales: {
    month: string;
    totalRevenue: number;
    orderCount: number;
    growth: number;
  }[];

  // Customer Analytics
  customerMetrics: {
    totalCustomers: number;
    newCustomers: number;
    returningCustomers: number;
    customerGrowth: number;
    averageLifetimeValue: number;
    retentionRate: number;
    customerSegments: Array<{
      tier: string;
      count: number;
      averageSpent: number;
      percentageOfTotal: number;
    }>;
  };

  // Employee Analytics
  employeeMetrics: {
    totalEmployees: number;
    activeEmployees: number;
    averageHoursPerWeek: number;
    overtimeHours: number;
    productivityScore: number;
    topPerformers: Array<{
      employee_id: string;
      name: string;
      ordersServed: number;
      averageOrderValue: number;
      customerSatisfaction: number;
    }>;
  };

  // Inventory Analytics
  inventoryMetrics: {
    totalProducts: number;
    lowStockItems: number;
    expiringItems: number;
    wasteReduction: number;
    topMovingProducts: Array<{
      product_id: string;
      name: string;
      soldQuantity: number;
      revenue: number;
      margin: number;
    }>;
    slowMovingProducts: Array<{
      product_id: string;
      name: string;
      daysInInventory: number;
      currentStock: number;
    }>;
  };

  // HACCP Analytics
  haccpMetrics: {
    complianceScore: number;
    totalChecks: number;
    onTimeChecks: number;
    criticalEvents: number;
    averageResponseTime: number;
    temperatureTrends: Array<{
      area_id: string;
      area_name: string;
      averageTemp: number;
      violations: number;
      trend: 'improving' | 'stable' | 'declining';
    }>;
  };

  // Financial Analytics
  financialMetrics: {
    grossRevenue: number;
    netRevenue: number;
    grossMargin: number;
    operatingExpenses: number;
    profitMargin: number;
    revenueByCategory: Array<{
      category: string;
      revenue: number;
      percentage: number;
    }>;
    expenseBreakdown: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
  };
}

interface AnalyticsState {
  metrics: AnalyticsMetrics | null;
  isLoading: boolean;
  error: string | null;
  selectedPeriod: 'day' | 'week' | 'month' | 'quarter' | 'year';
  selectedDateRange: {
    start: Date;
    end: Date;
  };
  
  // Actions
  fetchMetrics: (venueId: string, period?: string) => Promise<void>;
  setSelectedPeriod: (period: 'day' | 'week' | 'month' | 'quarter' | 'year') => void;
  setDateRange: (start: Date, end: Date) => void;
  refreshMetrics: () => Promise<void>;
  clearError: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      metrics: null,
      isLoading: false,
      error: null,
      selectedPeriod: 'week',
      selectedDateRange: {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        end: new Date()
      },

      fetchMetrics: async (venueId: string, period?: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const { selectedPeriod, selectedDateRange } = get();
          const activePeriod = period || selectedPeriod;
          
          const metrics = await analyticsService.getMetrics(venueId, {
            period: activePeriod,
            startDate: selectedDateRange.start,
            endDate: selectedDateRange.end
          });
          
          set({ metrics, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : 'Failed to fetch metrics',
            isLoading: false 
          });
        }
      },

      setSelectedPeriod: (period) => {
        set({ selectedPeriod: period });
        
        // Auto-adjust date range based on period
        const now = new Date();
        let start: Date;
        
        switch (period) {
          case 'day':
            start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            break;
          case 'week':
            start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            break;
          case 'quarter':
            start = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
          case 'year':
            start = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        }
        
        set({ selectedDateRange: { start, end: now } });
      },

      setDateRange: (start, end) => {
        set({ selectedDateRange: { start, end } });
      },

      refreshMetrics: async () => {
        const { fetchMetrics } = get();
        // Re-fetch with current settings - venueId should come from context
        await fetchMetrics('current-venue-id');
      },

      clearError: () => {
        set({ error: null });
      }
    }),
    {
      name: 'analytics-store'
    }
  )
);
```

### 2.2 Business Intelligence Dashboard Component
```typescript
// src/features/analytics/pages/BusinessIntelligencePage.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart, Package, 
  DollarSign, Clock, AlertTriangle, Target, Award
} from 'lucide-react';

import { useAnalyticsStore } from '../stores/analyticsStore';
import { SalesOverviewChart } from '../components/SalesOverviewChart';
import { CustomerSegmentChart } from '../components/CustomerSegmentChart';
import { RevenueBreakdownChart } from '../components/RevenueBreakdownChart';
import { EmployeePerformanceChart } from '../components/EmployeePerformanceChart';
import { InventoryAnalyticsChart } from '../components/InventoryAnalyticsChart';
import { HACCPComplianceChart } from '../components/HACCPComplianceChart';
import { KPICard } from '../components/KPICard';
import { TopProductsTable } from '../components/TopProductsTable';
import { AlertsOverview } from '../components/AlertsOverview';

export const BusinessIntelligencePage: React.FC = () => {
  const {
    metrics,
    isLoading,
    error,
    selectedPeriod,
    selectedDateRange,
    fetchMetrics,
    setSelectedPeriod,
    setDateRange,
    refreshMetrics
  } = useAnalyticsStore();

  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchMetrics('current-venue-id');
  }, [selectedPeriod, selectedDateRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refreshMetrics();
      }, 300000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshMetrics]);

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const calculateGrowth = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Business Intelligence</h1>
          <p className="text-gray-600">Comprehensive analytics and insights for your restaurant</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            Auto Refresh {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
          
          <DatePickerWithRange
            date={selectedDateRange}
            onDateChange={(range) => {
              if (range?.from && range?.to) {
                setDateRange(range.from, range.to);
              }
            }}
          />
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Revenue"
          value={formatCurrency(metrics?.financialMetrics.grossRevenue || 0)}
          change={formatPercentage(12.5)}
          trend="up"
          icon={<DollarSign className="h-6 w-6" />}
        />
        
        <KPICard
          title="Orders Today"
          value={metrics?.dailySales?.[0]?.orderCount?.toString() || '0'}
          change={formatPercentage(8.2)}
          trend="up"
          icon={<ShoppingCart className="h-6 w-6" />}
        />
        
        <KPICard
          title="Active Customers"
          value={metrics?.customerMetrics.totalCustomers?.toString() || '0'}
          change={formatPercentage(5.7)}
          trend="up"
          icon={<Users className="h-6 w-6" />}
        />
        
        <KPICard
          title="HACCP Compliance"
          value={`${metrics?.haccpMetrics.complianceScore || 0}%`}
          change={formatPercentage(2.1)}
          trend="up"
          icon={<Target className="h-6 w-6" />}
        />
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sales Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Trends</CardTitle>
                <CardDescription>Daily revenue and order volume</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesOverviewChart data={metrics?.dailySales || []} />
              </CardContent>
            </Card>

            {/* Top Products */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best performing items this period</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsTable 
                  products={metrics?.dailySales?.[0]?.topProducts || []}
                />
              </CardContent>
            </Card>

            {/* Customer Segments */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Customer distribution by tier</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerSegmentChart 
                  segments={metrics?.customerMetrics.customerSegments || []}
                />
              </CardContent>
            </Card>
          </div>

          {/* Alerts and Important Metrics */}
          <AlertsOverview 
            lowStockItems={metrics?.inventoryMetrics.lowStockItems || 0}
            expiringItems={metrics?.inventoryMetrics.expiringItems || 0}
            criticalHACCP={metrics?.haccpMetrics.criticalEvents || 0}
            employeeOvertimeHours={metrics?.employeeMetrics.overtimeHours || 0}
          />
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Breakdown */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Analysis</CardTitle>
                <CardDescription>Detailed revenue breakdown and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <RevenueBreakdownChart 
                  data={metrics?.financialMetrics.revenueByCategory || []}
                />
              </CardContent>
            </Card>

            {/* Financial Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gross Revenue</span>
                  <span className="font-semibold">
                    {formatCurrency(metrics?.financialMetrics.grossRevenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Net Revenue</span>
                  <span className="font-semibold">
                    {formatCurrency(metrics?.financialMetrics.netRevenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Gross Margin</span>
                  <span className="font-semibold">
                    {(metrics?.financialMetrics.grossMargin || 0).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Profit Margin</span>
                  <span className="font-semibold">
                    {(metrics?.financialMetrics.profitMargin || 0).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Trends */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>Weekly Performance</CardTitle>
                <CardDescription>Week-over-week growth analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics?.weeklySales.map((week, index) => (
                    <div key={week.weekStart} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">Week of {new Date(week.weekStart).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">{week.orderCount} orders</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{formatCurrency(week.totalRevenue)}</p>
                        <p className={`text-sm ${week.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(week.growth)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Metrics</CardTitle>
                <CardDescription>Key customer performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {metrics?.customerMetrics.totalCustomers || 0}
                    </p>
                    <p className="text-sm text-gray-600">Total Customers</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {metrics?.customerMetrics.newCustomers || 0}
                    </p>
                    <p className="text-sm text-gray-600">New This Period</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(metrics?.customerMetrics.averageLifetimeValue || 0)}
                    </p>
                    <p className="text-sm text-gray-600">Avg Lifetime Value</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">
                      {(metrics?.customerMetrics.retentionRate || 0).toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600">Retention Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customer Segments</CardTitle>
                <CardDescription>Revenue by customer tier</CardDescription>
              </CardHeader>
              <CardContent>
                <CustomerSegmentChart 
                  segments={metrics?.customerMetrics.customerSegments || []}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="employees" className="space-y-6">
          <EmployeePerformanceChart 
            topPerformers={metrics?.employeeMetrics.topPerformers || []}
            totalEmployees={metrics?.employeeMetrics.totalEmployees || 0}
            averageHoursPerWeek={metrics?.employeeMetrics.averageHoursPerWeek || 0}
            overtimeHours={metrics?.employeeMetrics.overtimeHours || 0}
            productivityScore={metrics?.employeeMetrics.productivityScore || 0}
          />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-6">
          <InventoryAnalyticsChart 
            topMoving={metrics?.inventoryMetrics.topMovingProducts || []}
            slowMoving={metrics?.inventoryMetrics.slowMovingProducts || []}
            lowStock={metrics?.inventoryMetrics.lowStockItems || 0}
            expiring={metrics?.inventoryMetrics.expiringItems || 0}
            wasteReduction={metrics?.inventoryMetrics.wasteReduction || 0}
          />
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <HACCPComplianceChart 
            complianceScore={metrics?.haccpMetrics.complianceScore || 0}
            totalChecks={metrics?.haccpMetrics.totalChecks || 0}
            onTimeChecks={metrics?.haccpMetrics.onTimeChecks || 0}
            criticalEvents={metrics?.haccpMetrics.criticalEvents || 0}
            temperatureTrends={metrics?.haccpMetrics.temperatureTrends || []}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

---

## 3. Mobile App Implementation

### 3.1 PWA Configuration Advanced
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.beerflow\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheKeyWillBeUsed: async ({ request }) => {
                return `${request.url}?v=${Date.now()}`;
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'BeerFlow Restaurant Management',
        short_name: 'BeerFlow',
        description: 'Complete restaurant management solution with POS, inventory, HACCP compliance',
        theme_color: '#3B82F6',
        background_color: '#FFFFFF',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity', 'food'],
        screenshots: [
          {
            src: 'screenshots/desktop-home.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide'
          },
          {
            src: 'screenshots/mobile-pos.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow'
          }
        ],
        shortcuts: [
          {
            name: 'POS System',
            short_name: 'POS',
            description: 'Quick access to point of sale',
            url: '/pos',
            icons: [{ src: 'icons/pos-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'Orders',
            short_name: 'Orders',
            description: 'View and manage orders',
            url: '/orders',
            icons: [{ src: 'icons/orders-96x96.png', sizes: '96x96' }]
          },
          {
            name: 'HACCP',
            short_name: 'HACCP',
            description: 'HACCP compliance dashboard',
            url: '/haccp',
            icons: [{ src: 'icons/haccp-96x96.png', sizes: '96x96' }]
          }
        ]
      }
    })
  ],
  define: {
    global: 'globalThis'
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react', 'lucide-react'],
          charts: ['recharts', 'chart.js', 'react-chartjs-2'],
          analytics: ['d3', 'visx'],
          forms: ['react-hook-form', '@hookform/resolvers'],
          utils: ['date-fns', 'lodash', 'clsx']
        }
      }
    },
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: true
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom']
  }
});
```

### 3.2 Mobile-Optimized Components
```typescript
// src/components/mobile/MobilePOSSystem.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  Plus, Minus, ShoppingCart, CreditCard, Receipt, 
  Scan, Users, Search, X, Check
} from 'lucide-react';

import { useCartStore } from '@/stores/cartStore';
import { useProductsStore } from '@/stores/productsStore';
import { useOrdersStore } from '@/stores/ordersStore';
import { ProductCard } from './ProductCard';
import { CartSummary } from './CartSummary';
import { PaymentSheet } from './PaymentSheet';
import { CustomerSelector } from './CustomerSelector';

export const MobilePOSSystem: React.FC = () => {
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isCustomerOpen, setIsCustomerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const { 
    items: cartItems, 
    addItem, 
    removeItem, 
    updateQuantity, 
    clearCart,
    getTotal,
    getItemCount
  } = useCartStore();

  const { 
    products, 
    categories, 
    isLoading: productsLoading,
    fetchProducts,
    searchProducts
  } = useProductsStore();

  const {
    createOrder,
    isLoading: orderLoading
  } = useOrdersStore();

  useEffect(() => {
    fetchProducts();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category_id === selectedCategory;
    
    return matchesSearch && matchesCategory && product.available_quantity > 0;
  });

  const handleAddToCart = (product: any) => {
    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      notes: ''
    });
  };

  const handleQuantityChange = (productId: string, change: number) => {
    const currentItem = cartItems.find(item => item.product_id === productId);
    if (currentItem) {
      const newQuantity = currentItem.quantity + change;
      if (newQuantity <= 0) {
        removeItem(productId);
      } else {
        updateQuantity(productId, newQuantity);
      }
    }
  };

  const handleCheckout = async (paymentData: any) => {
    try {
      await createOrder({
        items: cartItems,
        customer_id: paymentData.customer_id,
        table_id: paymentData.table_id,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes
      });
      
      clearCart();
      setIsPaymentOpen(false);
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">POS System</h1>
        <div className="flex items-center space-x-2">
          <Sheet open={isCustomerOpen} onOpenChange={setIsCustomerOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="h-4 w-4 mr-1" />
                Customer
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Select Customer</SheetTitle>
              </SheetHeader>
              <CustomerSelector onSelect={() => setIsCustomerOpen(false)} />
            </SheetContent>
          </Sheet>
          
          <Button 
            variant="outline" 
            size="sm"
            className="relative"
            onClick={() => setIsPaymentOpen(true)}
            disabled={getItemCount() === 0}
          >
            <ShoppingCart className="h-4 w-4 mr-1" />
            Cart
            {getItemCount() > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                {getItemCount()}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white border-b px-4 py-3 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <ScrollArea className="w-full">
          <div className="flex space-x-2 pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {categories.map(category => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="whitespace-nowrap"
              >
                {category.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Products Grid */}
      <ScrollArea className="flex-1 px-4 py-4">
        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                cartQuantity={cartItems.find(item => item.product_id === product.id)?.quantity || 0}
                onAdd={() => handleAddToCart(product)}
                onQuantityChange={(change) => handleQuantityChange(product.id, change)}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Cart Summary (Sticky Bottom) */}
      {getItemCount() > 0 && (
        <div className="bg-white border-t px-4 py-3">
          <CartSummary
            items={cartItems}
            total={getTotal()}
            onCheckout={() => setIsPaymentOpen(true)}
          />
        </div>
      )}

      {/* Payment Sheet */}
      <Sheet open={isPaymentOpen} onOpenChange={setIsPaymentOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Checkout</SheetTitle>
          </SheetHeader>
          <PaymentSheet
            items={cartItems}
            total={getTotal()}
            onSubmit={handleCheckout}
            onCancel={() => setIsPaymentOpen(false)}
            isLoading={orderLoading}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
};
```

---

## 4. Advanced Reporting System

### 4.1 Report Engine
```typescript
// src/services/reportingService.ts
import { analyticsService } from './analyticsService';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: 'sales' | 'customers' | 'inventory' | 'employees' | 'haccp' | 'financial';
  parameters: ReportParameter[];
  outputFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  scheduling?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    time: string;
    recipients: string[];
  };
}

export interface ReportParameter {
  name: string;
  type: 'date' | 'dateRange' | 'select' | 'multiSelect' | 'number' | 'text';
  label: string;
  required: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: any;
}

export interface GeneratedReport {
  id: string;
  templateId: string;
  name: string;
  generatedAt: Date;
  parameters: Record<string, any>;
  format: string;
  fileUrl?: string;
  data: any;
  status: 'generating' | 'completed' | 'failed';
}

class ReportingService {
  private readonly baseUrl = process.env.REACT_APP_API_URL;

  // Predefined report templates
  private templates: ReportTemplate[] = [
    {
      id: 'daily-sales-summary',
      name: 'Daily Sales Summary',
      description: 'Comprehensive daily sales report with product breakdown',
      type: 'sales',
      parameters: [
        {
          name: 'date',
          type: 'date',
          label: 'Report Date',
          required: true,
          defaultValue: new Date()
        },
        {
          name: 'includeProducts',
          type: 'select',
          label: 'Include Product Details',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ],
          defaultValue: 'yes'
        }
      ],
      outputFormats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'weekly-performance',
      name: 'Weekly Performance Report',
      description: 'Week-over-week performance analysis',
      type: 'sales',
      parameters: [
        {
          name: 'weekStart',
          type: 'date',
          label: 'Week Starting',
          required: true,
          defaultValue: this.getWeekStart(new Date())
        }
      ],
      outputFormats: ['pdf', 'excel'],
      scheduling: {
        frequency: 'weekly',
        time: '08:00',
        recipients: ['manager@restaurant.com']
      }
    },
    {
      id: 'customer-analytics',
      name: 'Customer Analytics Report',
      description: 'Customer behavior and segmentation analysis',
      type: 'customers',
      parameters: [
        {
          name: 'dateRange',
          type: 'dateRange',
          label: 'Date Range',
          required: true,
          defaultValue: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        },
        {
          name: 'segments',
          type: 'multiSelect',
          label: 'Customer Segments',
          required: false,
          options: [
            { value: 'regular', label: 'Regular' },
            { value: 'vip', label: 'VIP' },
            { value: 'premium', label: 'Premium' }
          ]
        }
      ],
      outputFormats: ['pdf', 'excel']
    },
    {
      id: 'inventory-report',
      name: 'Inventory Status Report',
      description: 'Current inventory levels and movement analysis',
      type: 'inventory',
      parameters: [
        {
          name: 'includeExpiring',
          type: 'select',
          label: 'Include Expiring Items',
          required: true,
          options: [
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' }
          ],
          defaultValue: 'yes'
        },
        {
          name: 'daysAhead',
          type: 'number',
          label: 'Days Ahead for Expiring Items',
          required: false,
          defaultValue: 7
        }
      ],
      outputFormats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'employee-timesheet',
      name: 'Employee Timesheet Report',
      description: 'Employee hours and attendance report',
      type: 'employees',
      parameters: [
        {
          name: 'dateRange',
          type: 'dateRange',
          label: 'Period',
          required: true,
          defaultValue: {
            start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        },
        {
          name: 'employees',
          type: 'multiSelect',
          label: 'Employees',
          required: false,
          options: [] // Populated dynamically
        }
      ],
      outputFormats: ['pdf', 'excel', 'csv']
    },
    {
      id: 'haccp-compliance',
      name: 'HACCP Compliance Report',
      description: 'HACCP monitoring and compliance audit report',
      type: 'haccp',
      parameters: [
        {
          name: 'dateRange',
          type: 'dateRange',
          label: 'Period',
          required: true,
          defaultValue: {
            start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            end: new Date()
          }
        },
        {
          name: 'areas',
          type: 'multiSelect',
          label: 'Temperature Areas',
          required: false,
          options: [] // Populated dynamically
        }
      ],
      outputFormats: ['pdf', 'excel']
    }
  ];

  async getTemplates(): Promise<ReportTemplate[]> {
    return this.templates;
  }

  async getTemplate(id: string): Promise<ReportTemplate | null> {
    return this.templates.find(t => t.id === id) || null;
  }

  async generateReport(
    templateId: string, 
    parameters: Record<string, any>,
    format: 'pdf' | 'excel' | 'csv' | 'json' = 'pdf'
  ): Promise<GeneratedReport> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Validate parameters
    this.validateParameters(template, parameters);

    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Generate report data based on template type
      let reportData: any;
      
      switch (template.type) {
        case 'sales':
          reportData = await this.generateSalesReport(template, parameters);
          break;
        case 'customers':
          reportData = await this.generateCustomerReport(template, parameters);
          break;
        case 'inventory':
          reportData = await this.generateInventoryReport(template, parameters);
          break;
        case 'employees':
          reportData = await this.generateEmployeeReport(template, parameters);
          break;
        case 'haccp':
          reportData = await this.generateHACCPReport(template, parameters);
          break;
        case 'financial':
          reportData = await this.generateFinancialReport(template, parameters);
          break;
        default:
          throw new Error(`Unsupported report type: ${template.type}`);
      }

      // Format the report
      const formattedReport = await this.formatReport(reportData, format, template);

      return {
        id: reportId,
        templateId,
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        generatedAt: new Date(),
        parameters,
        format,
        fileUrl: formattedReport.fileUrl,
        data: reportData,
        status: 'completed'
      };
    } catch (error) {
      console.error('Report generation failed:', error);
      return {
        id: reportId,
        templateId,
        name: `${template.name} - ${new Date().toLocaleDateString()}`,
        generatedAt: new Date(),
        parameters,
        format,
        data: null,
        status: 'failed'
      };
    }
  }

  private validateParameters(template: ReportTemplate, parameters: Record<string, any>): void {
    for (const param of template.parameters) {
      if (param.required && !parameters[param.name]) {
        throw new Error(`Required parameter ${param.name} is missing`);
      }
    }
  }

  private async generateSalesReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { date, dateRange, includeProducts } = parameters;
    
    if (template.id === 'daily-sales-summary') {
      const salesData = await analyticsService.getDailySales(date);
      const productsData = includeProducts === 'yes' ? 
        await analyticsService.getProductSales(date) : null;
      
      return {
        date,
        summary: salesData,
        products: productsData,
        generated_at: new Date()
      };
    }
    
    if (template.id === 'weekly-performance') {
      const weeklyData = await analyticsService.getWeeklySales(parameters.weekStart);
      return {
        weekStart: parameters.weekStart,
        performance: weeklyData,
        generated_at: new Date()
      };
    }
    
    return {};
  }

  private async generateCustomerReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { dateRange, segments } = parameters;
    
    const customerData = await analyticsService.getCustomerAnalytics(
      dateRange.start,
      dateRange.end,
      segments
    );
    
    return {
      period: dateRange,
      segments: segments || 'all',
      metrics: customerData,
      generated_at: new Date()
    };
  }

  private async generateInventoryReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { includeExpiring, daysAhead } = parameters;
    
    const inventoryData = await analyticsService.getInventoryStatus();
    const expiringData = includeExpiring === 'yes' ? 
      await analyticsService.getExpiringItems(daysAhead || 7) : null;
    
    return {
      inventory: inventoryData,
      expiring: expiringData,
      generated_at: new Date()
    };
  }

  private async generateEmployeeReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { dateRange, employees } = parameters;
    
    const timesheetData = await analyticsService.getEmployeeTimesheets(
      dateRange.start,
      dateRange.end,
      employees
    );
    
    return {
      period: dateRange,
      employees: employees || 'all',
      timesheets: timesheetData,
      generated_at: new Date()
    };
  }

  private async generateHACCPReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    const { dateRange, areas } = parameters;
    
    const haccpData = await analyticsService.getHACCPCompliance(
      dateRange.start,
      dateRange.end,
      areas
    );
    
    return {
      period: dateRange,
      areas: areas || 'all',
      compliance: haccpData,
      generated_at: new Date()
    };
  }

  private async generateFinancialReport(template: ReportTemplate, parameters: Record<string, any>): Promise<any> {
    // Implementation for financial reports
    return {};
  }

  private async formatReport(data: any, format: string, template: ReportTemplate): Promise<{ fileUrl?: string }> {
    // This would integrate with actual file generation services
    // For now, return mock URLs
    const fileName = `${template.id}_${Date.now()}.${format}`;
    
    switch (format) {
      case 'pdf':
        return { fileUrl: `/reports/pdf/${fileName}` };
      case 'excel':
        return { fileUrl: `/reports/excel/${fileName}` };
      case 'csv':
        return { fileUrl: `/reports/csv/${fileName}` };
      case 'json':
        return { fileUrl: `/reports/json/${fileName}` };
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  async scheduleReport(templateId: string, schedule: any): Promise<void> {
    // Implementation for scheduling reports
    // This would integrate with a job queue system
    console.log(`Scheduling report ${templateId}:`, schedule);
  }

  async getScheduledReports(): Promise<any[]> {
    // Return list of scheduled reports
    return [];
  }

  async getReportHistory(limit: number = 20): Promise<GeneratedReport[]> {
    // Return list of previously generated reports
    return [];
  }
}

export const reportingService = new ReportingService();
```

---

## 5. Criteri di Completamento Fase 6

### Verifiche Funzionali Obbligatorie:
1. **Frontend Complete**: Tutti i componenti React per Fasi 1-5 implementati e integrati
2. **Business Intelligence**: Dashboard analytics con insights real-time e metriche business
3. **Mobile PWA**: App mobile-optimized con offline capabilities e native-like experience
4. **Reporting Engine**: Sistema reporting avanzato con export multipli e scheduling
5. **Internationalization**: Multi-language support (IT/EN) con localizzazione completa
6. **Performance Optimization**: Code splitting, lazy loading, CDN integration
7. **Production Deployment**: Frontend ottimizzato per production con monitoring

### Business Logic Requirements:
1. **Analytics Accuracy**: Metriche business real-time con accuracy >= 98%
2. **Mobile Performance**: PWA performance score >= 90 su Google Lighthouse
3. **Report Generation**: Report generation < 30s per standard reports
4. **Real-time Updates**: Dashboard updates in real-time via WebSocket
5. **Offline Functionality**: Core POS functions disponibili offline
6. **Multi-tenant UI**: Complete venue isolation nel frontend
7. **Accessibility**: WCAG 2.1 AA compliance per inclusivity

### Integration Requirements:
- **Complete API Integration**: Tutti gli endpoint Fasi 1-5 integrati nel frontend
- **Real-time Data**: WebSocket integration per updates in tempo reale
- **State Management**: Consistent state across tutti i moduli
- **Authentication Flow**: SSO seamless attraverso tutte le features
- **Error Handling**: Graceful error handling con user-friendly messages
- **Performance**: Frontend load time < 3s, API calls < 500ms average

### Endpoints da Validare:
- GET /api/v1/analytics/dashboard - Business Intelligence metrics
- GET /api/v1/reports/templates - Available report templates
- POST /api/v1/reports/generate - Generate custom reports
- GET /api/v1/venues/{venueId}/complete-data - Complete venue data per frontend
- WebSocket /ws/venues/{venueId} - Real-time updates subscription

### Production Readiness:
- **CDN Integration**: Static assets serviti via CDN per performance
- **Bundle Optimization**: Code splitting e tree shaking per bundle size ottimale
- **PWA Certification**: Service Worker funzionante con offline capabilities
- **Cross-browser Compatibility**: Supporto per Chrome, Firefox, Safari, Edge
- **Mobile Responsiveness**: Ottimizzazione per tutti i device sizes
- **Security**: CSP headers, secure cookies, XSS protection
- **Monitoring**: Frontend error tracking e performance monitoring

La Fase 6 è completa quando il frontend fornisce un'esperienza utente completa per tutte le funzionalità implementate nelle fasi precedenti, con business intelligence avanzata, mobile experience ottimale e production readiness certificata.
