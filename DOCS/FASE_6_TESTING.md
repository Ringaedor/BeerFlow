# FASE 6 - FRONTEND & BUSINESS INTELLIGENCE TESTING

## Obiettivo Testing
Validare completamente il frontend React/PWA per tutte le funzionalità delle fasi 1-5, Business Intelligence Dashboard con real-time analytics, Mobile PWA experience, Advanced Reporting System e Complete User Experience attraverso test comprehensivi che garantiscano performance, usability, accessibility e business logic accuracy per deployment production-ready.

## Componenti Fase 6 da Testare
- **Frontend Complete**: React components per tutti i moduli Fasi 1-5
- **Business Intelligence**: Dashboard analytics con real-time data e insights
- **PWA Experience**: Mobile app con offline capabilities e native-like experience
- **Reporting Engine**: Advanced reporting con export multipli e scheduling
- **Real-time Integration**: WebSocket updates e live data synchronization
- **Performance**: Load times, bundle optimization, Lighthouse scores
- **Accessibility**: WCAG compliance, keyboard navigation, screen readers
- **Cross-browser Compatibility**: Chrome, Firefox, Safari, Edge support

---

## 1. Unit Tests Frontend Components

### 1.1 Business Intelligence Dashboard Tests
```typescript
// src/features/analytics/components/BusinessIntelligencePage.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BusinessIntelligencePage } from './BusinessIntelligencePage';
import { useAnalyticsStore } from '../stores/analyticsStore';
import { websocketService } from '@/services/websocketService';

// Mock the analytics store
jest.mock('../stores/analyticsStore');
jest.mock('@/services/websocketService');

const mockUseAnalyticsStore = useAnalyticsStore as jest.MockedFunction<typeof useAnalyticsStore>;
const mockWebSocketService = websocketService as jest.Mocked<typeof websocketService>;

const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('BusinessIntelligencePage', () => {
  const mockMetrics = {
    dailySales: [
      {
        date: '2024-12-20',
        totalRevenue: 1250.50,
        orderCount: 45,
        averageOrderValue: 27.79,
        topProducts: [
          { product_id: 'prod-1', name: 'Birra Lager', quantity: 24, revenue: 132.00 }
        ]
      }
    ],
    customerMetrics: {
      totalCustomers: 1250,
      newCustomers: 25,
      returningCustomers: 1225,
      customerGrowth: 5.2,
      averageLifetimeValue: 285.50,
      retentionRate: 78.5,
      customerSegments: [
        { tier: 'regular', count: 1000, averageSpent: 125.50, percentageOfTotal: 80 },
        { tier: 'vip', count: 200, averageSpent: 450.00, percentageOfTotal: 16 },
        { tier: 'premium', count: 50, averageSpent: 1200.00, percentageOfTotal: 4 }
      ]
    },
    employeeMetrics: {
      totalEmployees: 12,
      activeEmployees: 8,
      averageHoursPerWeek: 32.5,
      overtimeHours: 15.5,
      productivityScore: 87.3,
      topPerformers: [
        {
          employee_id: 'emp-1',
          name: 'Marco Rossi',
          ordersServed: 125,
          averageOrderValue: 35.50,
          customerSatisfaction: 4.8
        }
      ]
    },
    haccpMetrics: {
      complianceScore: 94.5,
      totalChecks: 150,
      onTimeChecks: 142,
      criticalEvents: 2,
      averageResponseTime: 8.5,
      temperatureTrends: [
        {
          area_id: 'area-1',
          area_name: 'Cold Storage',
          averageTemp: 2.5,
          violations: 1,
          trend: 'stable' as const
        }
      ]
    },
    financialMetrics: {
      grossRevenue: 15250.75,
      netRevenue: 13725.50,
      grossMargin: 65.2,
      operatingExpenses: 8500.00,
      profitMargin: 32.1,
      revenueByCategory: [
        { category: 'Beverages', revenue: 8500.00, percentage: 55.7 },
        { category: 'Food', revenue: 6750.75, percentage: 44.3 }
      ],
      expenseBreakdown: [
        { category: 'Staff', amount: 5500.00, percentage: 64.7 },
        { category: 'Utilities', amount: 1200.00, percentage: 14.1 },
        { category: 'Supplies', amount: 1800.00, percentage: 21.2 }
      ]
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseAnalyticsStore.mockReturnValue({
      metrics: mockMetrics,
      isLoading: false,
      error: null,
      selectedPeriod: 'week',
      selectedDateRange: {
        start: new Date('2024-12-14'),
        end: new Date('2024-12-20')
      },
      fetchMetrics: jest.fn(),
      setSelectedPeriod: jest.fn(),
      setDateRange: jest.fn(),
      refreshMetrics: jest.fn(),
      clearError: jest.fn()
    });
  });

  describe('Dashboard Rendering', () => {
    it('should render main dashboard elements', async () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('Business Intelligence')).toBeInTheDocument();
      expect(screen.getByText('Comprehensive analytics and insights for your restaurant')).toBeInTheDocument();
      
      // Check KPI cards
      expect(screen.getByText('Total Revenue')).toBeInTheDocument();
      expect(screen.getByText('Orders Today')).toBeInTheDocument();
      expect(screen.getByText('Active Customers')).toBeInTheDocument();
      expect(screen.getByText('HACCP Compliance')).toBeInTheDocument();
      
      // Check tabs
      expect(screen.getByRole('tab', { name: 'Overview' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Sales' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Customers' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Employees' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Inventory' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Compliance' })).toBeInTheDocument();
    });

    it('should display correct KPI values', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('€15,250.75')).toBeInTheDocument(); // Gross revenue
      expect(screen.getByText('45')).toBeInTheDocument(); // Today's orders
      expect(screen.getByText('1,250')).toBeInTheDocument(); // Total customers
      expect(screen.getByText('94.5%')).toBeInTheDocument(); // HACCP compliance
    });

    it('should handle loading state', () => {
      mockUseAnalyticsStore.mockReturnValue({
        metrics: null,
        isLoading: true,
        error: null,
        selectedPeriod: 'week',
        selectedDateRange: { start: new Date(), end: new Date() },
        fetchMetrics: jest.fn(),
        setSelectedPeriod: jest.fn(),
        setDateRange: jest.fn(),
        refreshMetrics: jest.fn(),
        clearError: jest.fn()
      });

      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
      expect(screen.getByRole('progressbar', { hidden: true })).toBeInTheDocument();
    });

    it('should handle error state', () => {
      mockUseAnalyticsStore.mockReturnValue({
        metrics: null,
        isLoading: false,
        error: 'Failed to load analytics data',
        selectedPeriod: 'week',
        selectedDateRange: { start: new Date(), end: new Date() },
        fetchMetrics: jest.fn(),
        setSelectedPeriod: jest.fn(),
        setDateRange: jest.fn(),
        refreshMetrics: jest.fn(),
        clearError: jest.fn()
      });

      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText(/failed to load analytics data/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });
  });

  describe('Period Selection', () => {
    it('should change period when dropdown selection changes', async () => {
      const mockSetSelectedPeriod = jest.fn();
      
      mockUseAnalyticsStore.mockReturnValue({
        ...mockUseAnalyticsStore(),
        setSelectedPeriod: mockSetSelectedPeriod
      });

      renderWithQueryClient(<BusinessIntelligencePage />);
      
      const periodSelector = screen.getByRole('combobox');
      await userEvent.click(periodSelector);
      
      await userEvent.click(screen.getByText('This Month'));
      
      expect(mockSetSelectedPeriod).toHaveBeenCalledWith('month');
    });

    it('should handle date range selection', async () => {
      const mockSetDateRange = jest.fn();
      
      mockUseAnalyticsStore.mockReturnValue({
        ...mockUseAnalyticsStore(),
        setDateRange: mockSetDateRange
      });

      renderWithQueryClient(<BusinessIntelligencePage />);
      
      // Simulate date range picker interaction
      const dateRangePicker = screen.getByTestId('date-range-picker');
      fireEvent.click(dateRangePicker);
      
      // Mock date selection (would be handled by date picker component)
      const startDate = new Date('2024-12-01');
      const endDate = new Date('2024-12-31');
      
      // Simulate the date picker callback
      mockSetDateRange(startDate, endDate);
      
      expect(mockSetDateRange).toHaveBeenCalledWith(startDate, endDate);
    });
  });

  describe('Tab Navigation', () => {
    it('should switch between analytics tabs', async () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      // Start on Overview tab
      expect(screen.getByRole('tabpanel', { name: /overview/i })).toBeInTheDocument();
      
      // Switch to Sales tab
      await userEvent.click(screen.getByRole('tab', { name: 'Sales' }));
      expect(screen.getByRole('tabpanel', { name: /sales/i })).toBeInTheDocument();
      
      // Switch to Customers tab
      await userEvent.click(screen.getByRole('tab', { name: 'Customers' }));
      expect(screen.getByRole('tabpanel', { name: /customers/i })).toBeInTheDocument();
      
      // Switch to Employees tab
      await userEvent.click(screen.getByRole('tab', { name: 'Employees' }));
      expect(screen.getByRole('tabpanel', { name: /employees/i })).toBeInTheDocument();
    });

    it('should display tab-specific content', async () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      // Sales tab content
      await userEvent.click(screen.getByRole('tab', { name: 'Sales' }));
      expect(screen.getByText('Revenue Analysis')).toBeInTheDocument();
      expect(screen.getByText('Financial Summary')).toBeInTheDocument();
      
      // Customers tab content
      await userEvent.click(screen.getByRole('tab', { name: 'Customers' }));
      expect(screen.getByText('Customer Metrics')).toBeInTheDocument();
      expect(screen.getByText('Customer Segments')).toBeInTheDocument();
    });
  });

  describe('Real-time Updates', () => {
    it('should handle auto-refresh toggle', async () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      const autoRefreshButton = screen.getByRole('button', { name: /auto refresh off/i });
      await userEvent.click(autoRefreshButton);
      
      expect(screen.getByRole('button', { name: /auto refresh on/i })).toBeInTheDocument();
    });

    it('should refresh metrics when refresh button is clicked', async () => {
      const mockRefreshMetrics = jest.fn();
      
      mockUseAnalyticsStore.mockReturnValue({
        ...mockUseAnalyticsStore(),
        refreshMetrics: mockRefreshMetrics
      });

      renderWithQueryClient(<BusinessIntelligencePage />);
      
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      await userEvent.click(refreshButton);
      
      expect(mockRefreshMetrics).toHaveBeenCalled();
    });
  });

  describe('Chart Components', () => {
    it('should render sales overview chart', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
      expect(screen.getByTestId('sales-overview-chart')).toBeInTheDocument();
    });

    it('should render customer segment chart', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('Customer Segments')).toBeInTheDocument();
      expect(screen.getByTestId('customer-segment-chart')).toBeInTheDocument();
    });

    it('should handle chart interactions', async () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      const chartElement = screen.getByTestId('sales-overview-chart');
      
      // Simulate chart hover
      fireEvent.mouseOver(chartElement);
      
      // Should show tooltip (would be handled by chart library)
      await waitFor(() => {
        expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Data Formatting', () => {
    it('should format currency values correctly', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      // Italian locale currency formatting
      expect(screen.getByText('€15.250,75')).toBeInTheDocument();
      expect(screen.getByText('€1.250,50')).toBeInTheDocument();
    });

    it('should format percentages correctly', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('94,5%')).toBeInTheDocument(); // HACCP compliance
      expect(screen.getByText('65,2%')).toBeInTheDocument(); // Gross margin
    });

    it('should format numbers with proper separators', () => {
      renderWithQueryClient(<BusinessIntelligencePage />);
      
      expect(screen.getByText('1.250')).toBeInTheDocument(); // Customer count
      expect(screen.getByText('15.250,75')).toBeInTheDocument(); // Revenue
    });
  });
});
```

### 1.2 Mobile POS Component Tests
```typescript
// src/components/mobile/MobilePOSSystem.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobilePOSSystem } from './MobilePOSSystem';
import { useCartStore } from '@/stores/cartStore';
import { useProductsStore } from '@/stores/productsStore';
import { useOrdersStore } from '@/stores/ordersStore';

jest.mock('@/stores/cartStore');
jest.mock('@/stores/productsStore');
jest.mock('@/stores/ordersStore');

const mockUseCartStore = useCartStore as jest.MockedFunction<typeof useCartStore>;
const mockUseProductsStore = useProductsStore as jest.MockedFunction<typeof useProductsStore>;
const mockUseOrdersStore = useOrdersStore as jest.MockedFunction<typeof useOrdersStore>;

describe('MobilePOSSystem', () => {
  const mockProducts = [
    {
      id: 'prod-1',
      name: 'Birra Lager 33cl',
      description: 'Birra chiara italiana',
      price: 5.50,
      category_id: 'cat-beer',
      available_quantity: 25,
      image_url: '/images/beer-lager.jpg'
    },
    {
      id: 'prod-2',
      name: 'Pizza Margherita',
      description: 'Pizza con pomodoro e mozzarella',
      price: 12.00,
      category_id: 'cat-food',
      available_quantity: 100,
      image_url: '/images/pizza-margherita.jpg'
    }
  ];

  const mockCategories = [
    { id: 'cat-beer', name: 'Birre', display_order: 1 },
    { id: 'cat-food', name: 'Cibo', display_order: 2 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mock implementations
    mockUseCartStore.mockReturnValue({
      items: [],
      addItem: jest.fn(),
      removeItem: jest.fn(),
      updateQuantity: jest.fn(),
      clearCart: jest.fn(),
      getTotal: jest.fn(() => 0),
      getItemCount: jest.fn(() => 0)
    });

    mockUseProductsStore.mockReturnValue({
      products: mockProducts,
      categories: mockCategories,
      isLoading: false,
      error: null,
      fetchProducts: jest.fn(),
      searchProducts: jest.fn()
    });

    mockUseOrdersStore.mockReturnValue({
      orders: [],
      isLoading: false,
      error: null,
      createOrder: jest.fn(),
      updateOrder: jest.fn(),
      fetchOrders: jest.fn()
    });
  });

  describe('Mobile POS Interface', () => {
    it('should render mobile-optimized POS layout', () => {
      render(<MobilePOSSystem />);
      
      expect(screen.getByText('POS System')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /customer/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cart/i })).toBeInTheDocument();
    });

    it('should display product grid in mobile format', () => {
      render(<MobilePOSSystem />);
      
      // Products should be displayed in grid
      expect(screen.getByText('Birra Lager 33cl')).toBeInTheDocument();
      expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
      
      // Products should show prices
      expect(screen.getByText('€5,50')).toBeInTheDocument();
      expect(screen.getByText('€12,00')).toBeInTheDocument();
    });

    it('should filter products by category', async () => {
      render(<MobilePOSSystem />);
      
      // Click on beer category
      await userEvent.click(screen.getByText('Birre'));
      
      // Should show only beer products
      expect(screen.getByText('Birra Lager 33cl')).toBeInTheDocument();
      expect(screen.queryByText('Pizza Margherita')).not.toBeInTheDocument();
    });

    it('should search products by name', async () => {
      render(<MobilePOSSystem />);
      
      const searchInput = screen.getByPlaceholderText('Search products...');
      await userEvent.type(searchInput, 'pizza');
      
      // Should filter to pizza products
      expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
      expect(screen.queryByText('Birra Lager 33cl')).not.toBeInTheDocument();
    });
  });

  describe('Cart Management', () => {
    it('should add product to cart', async () => {
      const mockAddItem = jest.fn();
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        addItem: mockAddItem
      });

      render(<MobilePOSSystem />);
      
      const addButton = screen.getAllByText('+')[0];
      await userEvent.click(addButton);
      
      expect(mockAddItem).toHaveBeenCalledWith({
        product_id: 'prod-1',
        name: 'Birra Lager 33cl',
        price: 5.50,
        quantity: 1,
        notes: ''
      });
    });

    it('should update cart badge when items added', () => {
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        getItemCount: jest.fn(() => 3),
        items: [
          { product_id: 'prod-1', quantity: 2 },
          { product_id: 'prod-2', quantity: 1 }
        ]
      });

      render(<MobilePOSSystem />);
      
      expect(screen.getByText('3')).toBeInTheDocument(); // Cart badge
    });

    it('should update product quantity in cart', async () => {
      const mockUpdateQuantity = jest.fn();
      const mockRemoveItem = jest.fn();
      
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        updateQuantity: mockUpdateQuantity,
        removeItem: mockRemoveItem,
        items: [{ product_id: 'prod-1', quantity: 2 }],
        getItemCount: jest.fn(() => 2)
      });

      render(<MobilePOSSystem />);
      
      // Find quantity controls for first product
      const minusButton = screen.getAllByText('-')[0];
      await userEvent.click(minusButton);
      
      expect(mockUpdateQuantity).toHaveBeenCalledWith('prod-1', 1);
    });

    it('should remove item when quantity reaches zero', async () => {
      const mockRemoveItem = jest.fn();
      
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        removeItem: mockRemoveItem,
        items: [{ product_id: 'prod-1', quantity: 1 }],
        getItemCount: jest.fn(() => 1)
      });

      render(<MobilePOSSystem />);
      
      const minusButton = screen.getAllByText('-')[0];
      await userEvent.click(minusButton);
      
      expect(mockRemoveItem).toHaveBeenCalledWith('prod-1');
    });
  });

  describe('Checkout Process', () => {
    beforeEach(() => {
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        items: [
          { product_id: 'prod-1', name: 'Birra Lager', price: 5.50, quantity: 2 },
          { product_id: 'prod-2', name: 'Pizza Margherita', price: 12.00, quantity: 1 }
        ],
        getItemCount: jest.fn(() => 3),
        getTotal: jest.fn(() => 23.00)
      });
    });

    it('should open checkout sheet when cart button clicked', async () => {
      render(<MobilePOSSystem />);
      
      const cartButton = screen.getByRole('button', { name: /cart/i });
      await userEvent.click(cartButton);
      
      expect(screen.getByText('Checkout')).toBeInTheDocument();
    });

    it('should display cart items in checkout', async () => {
      render(<MobilePOSSystem />);
      
      await userEvent.click(screen.getByRole('button', { name: /cart/i }));
      
      expect(screen.getByText('Birra Lager')).toBeInTheDocument();
      expect(screen.getByText('Pizza Margherita')).toBeInTheDocument();
      expect(screen.getByText('€23,00')).toBeInTheDocument();
    });

    it('should complete checkout process', async () => {
      const mockCreateOrder = jest.fn().mockResolvedValue({ id: 'order-123' });
      const mockClearCart = jest.fn();
      
      mockUseOrdersStore.mockReturnValue({
        ...mockUseOrdersStore(),
        createOrder: mockCreateOrder
      });
      
      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        clearCart: mockClearCart,
        items: [{ product_id: 'prod-1', name: 'Birra Lager', price: 5.50, quantity: 2 }],
        getItemCount: jest.fn(() => 2),
        getTotal: jest.fn(() => 11.00)
      });

      render(<MobilePOSSystem />);
      
      await userEvent.click(screen.getByRole('button', { name: /cart/i }));
      
      // Fill payment form (mocked)
      const completeOrderButton = screen.getByRole('button', { name: /complete order/i });
      await userEvent.click(completeOrderButton);
      
      await waitFor(() => {
        expect(mockCreateOrder).toHaveBeenCalled();
        expect(mockClearCart).toHaveBeenCalled();
      });
    });
  });

  describe('Customer Selection', () => {
    it('should open customer selector sheet', async () => {
      render(<MobilePOSSystem />);
      
      const customerButton = screen.getByRole('button', { name: /customer/i });
      await userEvent.click(customerButton);
      
      expect(screen.getByText('Select Customer')).toBeInTheDocument();
    });

    it('should search for customers', async () => {
      render(<MobilePOSSystem />);
      
      await userEvent.click(screen.getByRole('button', { name: /customer/i }));
      
      const searchInput = screen.getByPlaceholderText('Search customers...');
      await userEvent.type(searchInput, 'Mario');
      
      // Should trigger customer search
      expect(searchInput).toHaveValue('Mario');
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch events for product cards', async () => {
      render(<MobilePOSSystem />);
      
      const productCard = screen.getByText('Birra Lager 33cl').closest('div');
      
      // Simulate touch interaction
      fireEvent.touchStart(productCard!);
      fireEvent.touchEnd(productCard!);
      
      // Should show product details or add to cart
    });

    it('should handle swipe gestures for category scrolling', async () => {
      render(<MobilePOSSystem />);
      
      const categoryScroll = screen.getByTestId('category-scroll');
      
      // Simulate swipe gesture
      fireEvent.touchStart(categoryScroll, { touches: [{ clientX: 100 }] });
      fireEvent.touchMove(categoryScroll, { touches: [{ clientX: 50 }] });
      fireEvent.touchEnd(categoryScroll);
      
      // Should scroll categories horizontally
    });
  });

  describe('Offline Functionality', () => {
    it('should handle offline state', () => {
      // Mock offline state
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      render(<MobilePOSSystem />);
      
      expect(screen.getByText(/offline/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cart/i })).toBeDisabled();
    });

    it('should queue orders when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      mockUseCartStore.mockReturnValue({
        ...mockUseCartStore(),
        items: [{ product_id: 'prod-1', quantity: 1 }],
        getItemCount: jest.fn(() => 1)
      });

      render(<MobilePOSSystem />);
      
      // Should show offline indicator and queue capability
      expect(screen.getByText(/will be sent when online/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be accessible via keyboard navigation', async () => {
      render(<MobilePOSSystem />);
      
      // Tab through elements
      await userEvent.tab();
      expect(screen.getByPlaceholderText('Search products...')).toHaveFocus();
      
      await userEvent.tab();
      expect(screen.getByRole('button', { name: 'All' })).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(<MobilePOSSystem />);
      
      expect(screen.getByRole('button', { name: /cart/i })).toHaveAttribute('aria-label');
      expect(screen.getByRole('button', { name: /customer/i })).toHaveAttribute('aria-label');
    });

    it('should support screen readers', () => {
      render(<MobilePOSSystem />);
      
      // Should have proper heading structure
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('POS System');
      
      // Should have proper region labels
      expect(screen.getByRole('region', { name: /products/i })).toBeInTheDocument();
    });
  });
});
```

---

## 2. Integration Tests Complete System

### 2.1 Complete User Journey Integration
```typescript
// test/integration/complete-user-journey.integration.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete BeerFlow User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application
    await page.goto('/');
    
    // Login as manager
    await page.fill('[data-testid="email-input"]', 'manager@restaurant.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard"]');
  });

  test('should complete full restaurant management workflow', async ({ page }) => {
    // 1. Check analytics dashboard
    await page.click('[data-testid="analytics-nav"]');
    await page.waitForSelector('[data-testid="business-intelligence-dashboard"]');
    
    // Verify KPI cards are visible
    await expect(page.locator('[data-testid="revenue-kpi"]')).toBeVisible();
    await expect(page.locator('[data-testid="orders-kpi"]')).toBeVisible();
    await expect(page.locator('[data-testid="customers-kpi"]')).toBeVisible();
    
    // Switch to sales tab
    await page.click('[data-testid="sales-tab"]');
    await expect(page.locator('[data-testid="revenue-chart"]')).toBeVisible();
    
    // 2. Process a customer order via POS
    await page.click('[data-testid="pos-nav"]');
    await page.waitForSelector('[data-testid="pos-system"]');
    
    // Add products to cart
    await page.click('[data-testid="product-birra-lager"]');
    await page.click('[data-testid="add-to-cart-prod-1"]');
    
    await page.click('[data-testid="product-pizza-margherita"]');
    await page.click('[data-testid="add-to-cart-prod-2"]');
    
    // Verify cart badge
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('2');
    
    // Open checkout
    await page.click('[data-testid="cart-button"]');
    await page.waitForSelector('[data-testid="checkout-sheet"]');
    
    // Select customer
    await page.click('[data-testid="select-customer-button"]');
    await page.click('[data-testid="customer-mario-rossi"]');
    
    // Select table
    await page.selectOption('[data-testid="table-select"]', 'table-5');
    
    // Complete payment
    await page.click('[data-testid="payment-method-cash"]');
    await page.click('[data-testid="complete-order-button"]');
    
    // Verify order confirmation
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
    
    // 3. Verify order appears in orders list
    await page.click('[data-testid="orders-nav"]');
    await page.waitForSelector('[data-testid="orders-list"]');
    
    await expect(page.locator('[data-testid="order-list"]').first()).toContainText('Mario Rossi');
    await expect(page.locator('[data-testid="order-list"]').first()).toContainText('Table 5');
    
    // 4. Update inventory based on order
    await page.click('[data-testid="inventory-nav"]');
    await page.waitForSelector('[data-testid="inventory-dashboard"]');
    
    // Verify stock levels updated
    const beerStock = page.locator('[data-testid="stock-birra-lager"]');
    await expect(beerStock).toContainText('24'); // Should be reduced by 1
    
    // 5. Check customer profile updated
    await page.click('[data-testid="customers-nav"]');
    await page.waitForSelector('[data-testid="customers-list"]');
    
    // Find and click on Mario Rossi
    await page.click('[data-testid="customer-mario-rossi"]');
    await page.waitForSelector('[data-testid="customer-profile"]');
    
    // Verify visit count increased
    await expect(page.locator('[data-testid="total-visits"]')).toContainText('2');
    
    // 6. Generate and download report
    await page.click('[data-testid="reports-nav"]');
    await page.waitForSelector('[data-testid="reports-dashboard"]');
    
    // Select daily sales report
    await page.click('[data-testid="report-daily-sales"]');
    
    // Set report date
    await page.fill('[data-testid="report-date"]', '2024-12-20');
    
    // Generate report
    await page.click('[data-testid="generate-report-button"]');
    
    // Wait for download
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-report-button"]');
    const download = await downloadPromise;
    
    expect(download.suggestedFilename()).toContain('daily-sales');
    
    // 7. Check HACCP compliance
    await page.click('[data-testid="haccp-nav"]');
    await page.waitForSelector('[data-testid="haccp-dashboard"]');
    
    // Verify compliance score
    await expect(page.locator('[data-testid="compliance-score"]')).toContainText('94.5%');
    
    // Add temperature check
    await page.click('[data-testid="area-cold-storage"]');
    await page.click('[data-testid="log-temperature-button"]');
    
    await page.fill('[data-testid="temperature-input"]', '2.5');
    await page.click('[data-testid="submit-temperature-button"]');
    
    await expect(page.locator('[data-testid="temperature-success"]')).toBeVisible();
    
    // 8. Verify real-time analytics update
    await page.click('[data-testid="analytics-nav"]');
    
    // Should see updated metrics from the order
    await expect(page.locator('[data-testid="orders-today"]')).toContainText('46'); // +1 from previous
    await expect(page.locator('[data-testid="revenue-today"]')).toContainText('€1,278.29'); // Updated
  });

  test('should handle mobile PWA experience', async ({ page, context }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Navigate to POS in mobile mode
    await page.click('[data-testid="pos-nav"]');
    
    // Verify mobile layout
    await expect(page.locator('[data-testid="mobile-pos-layout"]')).toBeVisible();
    await expect(page.locator('[data-testid="product-grid-mobile"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="product-birra-lager"]');
    await page.tap('[data-testid="add-to-cart-prod-1"]');
    
    // Verify cart update
    await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
    
    // Test swipe gesture for categories
    const categoryScroll = page.locator('[data-testid="category-scroll"]');
    await categoryScroll.hover();
    await page.mouse.down();
    await page.mouse.move(100, 0);
    await page.mouse.up();
    
    // Test PWA installation
    await page.evaluate(() => {
      // Mock beforeinstallprompt event
      const event = new Event('beforeinstallprompt');
      event.preventDefault = jest.fn();
      window.dispatchEvent(event);
    });
    
    await expect(page.locator('[data-testid="install-pwa-button"]')).toBeVisible();
    await page.click('[data-testid="install-pwa-button"]');
  });

  test('should handle offline functionality', async ({ page, context }) => {
    // Go offline
    await context.setOffline(true);
    
    // Navigate to POS
    await page.click('[data-testid="pos-nav"]');
    
    // Should show offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    
    // Should still allow adding to cart
    await page.click('[data-testid="product-birra-lager"]');
    await page.click('[data-testid="add-to-cart-prod-1"]');
    
    // Attempt checkout - should queue for when online
    await page.click('[data-testid="cart-button"]');
    await page.click('[data-testid="complete-order-button"]');
    
    await expect(page.locator('[data-testid="order-queued"]')).toBeVisible();
    
    // Go back online
    await context.setOffline(false);
    
    // Should process queued orders
    await page.waitForSelector('[data-testid="sync-complete"]');
    await expect(page.locator('[data-testid="order-success"]')).toBeVisible();
  });

  test('should handle real-time updates via WebSocket', async ({ page }) => {
    // Navigate to analytics
    await page.click('[data-testid="analytics-nav"]');
    
    // Note initial metrics
    const initialOrders = await page.locator('[data-testid="orders-today"]').textContent();
    
    // Simulate WebSocket message from another client
    await page.evaluate(() => {
      // Mock WebSocket message
      const event = new MessageEvent('message', {
        data: JSON.stringify({
          type: 'order_created',
          payload: {
            todayCount: 47,
            todayRevenue: 1305.29
          }
        })
      });
      
      // Dispatch to WebSocket handlers
      window.mockWebSocket.onmessage(event);
    });
    
    // Should see updated metrics
    await expect(page.locator('[data-testid="orders-today"]')).toContainText('47');
    await expect(page.locator('[data-testid="revenue-today"]')).toContainText('€1,305.29');
  });

  test('should maintain performance standards', async ({ page }) => {
    // Test page load performance
    const navigationStart = Date.now();
    await page.goto('/analytics');
    await page.waitForSelector('[data-testid="business-intelligence-dashboard"]');
    const loadTime = Date.now() - navigationStart;
    
    expect(loadTime).toBeLessThan(3000); // < 3 seconds
    
    // Test chart rendering performance
    const chartRenderStart = Date.now();
    await page.click('[data-testid="sales-tab"]');
    await page.waitForSelector('[data-testid="revenue-chart"]');
    const chartRenderTime = Date.now() - chartRenderStart;
    
    expect(chartRenderTime).toBeLessThan(1000); // < 1 second
    
    // Test bundle size
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')[0];
    });
    
    expect(performanceEntries.transferSize).toBeLessThan(2 * 1024 * 1024); // < 2MB
  });
});
```

### 2.2 Cross-browser Compatibility Tests
```typescript
// test/integration/cross-browser.integration.spec.ts
import { test, devices } from '@playwright/test';

// Test on multiple browsers
const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`Cross-browser compatibility - ${browserName}`, () => {
    test.use({ 
      ...devices['Desktop Chrome'],
      channel: browserName === 'chromium' ? 'chrome' : undefined
    });

    test('should work consistently across browsers', async ({ page }) => {
      await page.goto('/');
      
      // Test login
      await page.fill('[data-testid="email-input"]', 'manager@restaurant.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="login-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Test analytics dashboard
      await page.click('[data-testid="analytics-nav"]');
      await page.waitForSelector('[data-testid="business-intelligence-dashboard"]');
      
      // Verify charts render
      await expect(page.locator('[data-testid="sales-overview-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="customer-segment-chart"]')).toBeVisible();
      
      // Test POS system
      await page.click('[data-testid="pos-nav"]');
      await page.waitForSelector('[data-testid="pos-system"]');
      
      // Add product to cart
      await page.click('[data-testid="add-to-cart-prod-1"]');
      await expect(page.locator('[data-testid="cart-badge"]')).toHaveText('1');
      
      // Test responsive design
      await page.setViewportSize({ width: 768, height: 1024 });
      await expect(page.locator('[data-testid="mobile-layout"]')).toBeVisible();
    });

    test('should handle browser-specific features', async ({ page }) => {
      await page.goto('/');
      
      // Test service worker registration
      const swRegistration = await page.evaluate(async () => {
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js');
          return registration.active?.state;
        }
        return null;
      });
      
      if (browserName !== 'webkit') { // Safari has limited SW support
        expect(swRegistration).toBe('activated');
      }
      
      // Test local storage
      await page.evaluate(() => {
        localStorage.setItem('test', 'value');
      });
      
      const storedValue = await page.evaluate(() => {
        return localStorage.getItem('test');
      });
      
      expect(storedValue).toBe('value');
      
      // Test WebSocket support
      const wsSupport = await page.evaluate(() => {
        return typeof WebSocket !== 'undefined';
      });
      
      expect(wsSupport).toBe(true);
    });
  });
});

// Mobile device testing
const mobileDevices = [
  'iPhone 12',
  'iPhone 12 Pro',
  'Pixel 5',
  'Galaxy S21',
  'iPad Pro'
];

mobileDevices.forEach(deviceName => {
  test.describe(`Mobile device compatibility - ${deviceName}`, () => {
    test.use({ ...devices[deviceName] });

    test('should work on mobile devices', async ({ page }) => {
      await page.goto('/');
      
      // Test mobile login
      await page.fill('[data-testid="email-input"]', 'manager@restaurant.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.tap('[data-testid="login-button"]');
      
      await page.waitForSelector('[data-testid="dashboard"]');
      
      // Test mobile POS
      await page.tap('[data-testid="pos-nav"]');
      await page.waitForSelector('[data-testid="mobile-pos-layout"]');
      
      // Test touch interactions
      await page.tap('[data-testid="product-birra-lager"]');
      await page.tap('[data-testid="add-to-cart-prod-1"]');
      
      // Test swipe gestures
      const categoryScroll = page.locator('[data-testid="category-scroll"]');
      await categoryScroll.hover();
      
      // Simulate swipe
      await page.touchscreen.tap(100, 100);
      await page.mouse.move(50, 100);
      
      // Test viewport adaptation
      const viewport = page.viewportSize();
      if (viewport && viewport.width < 768) {
        await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
      }
    });

    test('should handle device orientation changes', async ({ page }) => {
      await page.goto('/pos');
      
      // Portrait mode
      await page.setViewportSize({ width: 375, height: 667 });
      await expect(page.locator('[data-testid="portrait-layout"]')).toBeVisible();
      
      // Landscape mode
      await page.setViewportSize({ width: 667, height: 375 });
      await expect(page.locator('[data-testid="landscape-layout"]')).toBeVisible();
    });
  });
});
```

---

## 3. Performance Tests Advanced

### 3.1 Lighthouse Performance Testing
```typescript
// test/performance/lighthouse.performance.spec.ts
import { test, expect } from '@playwright/test';
import { playAudit } from 'playwright-lighthouse';

test.describe('Lighthouse Performance Tests', () => {
  test('should meet performance benchmarks on desktop', async ({ page }) => {
    await page.goto('/');
    
    // Run Lighthouse audit
    const audit = await playAudit({
      page,
      port: 9222,
      thresholds: {
        performance: 90,
        accessibility: 95,
        'best-practices': 90,
        seo: 85,
        pwa: 90
      },
      opts: {
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false
        }
      }
    });

    expect(audit.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(90);
    expect(audit.lhr.categories.accessibility.score * 100).toBeGreaterThanOrEqual(95);
    expect(audit.lhr.categories['best-practices'].score * 100).toBeGreaterThanOrEqual(90);
    expect(audit.lhr.categories.pwa.score * 100).toBeGreaterThanOrEqual(90);
  });

  test('should meet performance benchmarks on mobile', async ({ page }) => {
    await page.goto('/');
    
    const audit = await playAudit({
      page,
      port: 9222,
      thresholds: {
        performance: 80, // Lower threshold for mobile
        accessibility: 95,
        'best-practices': 90,
        pwa: 95
      },
      opts: {
        screenEmulation: {
          mobile: true,
          width: 375,
          height: 667,
          deviceScaleFactor: 2,
          disabled: false
        }
      }
    });

    expect(audit.lhr.categories.performance.score * 100).toBeGreaterThanOrEqual(80);
    expect(audit.lhr.categories.pwa.score * 100).toBeGreaterThanOrEqual(95);
  });

  test('should have optimized Core Web Vitals', async ({ page }) => {
    await page.goto('/analytics');
    
    // Measure First Contentful Paint
    const fcp = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            resolve(fcpEntry.startTime);
          }
        }).observe({ entryTypes: ['paint'] });
      });
    });

    expect(fcp).toBeLessThan(2000); // < 2 seconds

    // Measure Largest Contentful Paint
    const lcp = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver(list => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // Fallback timeout
        setTimeout(() => resolve(0), 5000);
      });
    });

    expect(lcp).toBeLessThan(3000); // < 3 seconds

    // Measure Cumulative Layout Shift
    const cls = await page.evaluate(() => {
      return new Promise(resolve => {
        let clsValue = 0;
        
        new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          }
          resolve(clsValue);
        }).observe({ entryTypes: ['layout-shift'] });
        
        // Resolve after page is stable
        setTimeout(() => resolve(clsValue), 3000);
      });
    });

    expect(cls).toBeLessThan(0.1); // < 0.1 CLS score
  });

  test('should have optimized bundle sizes', async ({ page }) => {
    await page.goto('/');
    
    // Get all resource sizes
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(resource => ({
        name: resource.name,
        transferSize: resource.transferSize,
        decodedBodySize: resource.decodedBodySize
      }));
    });

    // Check main bundle size
    const mainBundle = resources.find(r => r.name.includes('main.') && r.name.includes('.js'));
    expect(mainBundle?.transferSize).toBeLessThan(500 * 1024); // < 500KB

    // Check vendor bundle size
    const vendorBundle = resources.find(r => r.name.includes('vendor.') && r.name.includes('.js'));
    expect(vendorBundle?.transferSize).toBeLessThan(800 * 1024); // < 800KB

    // Check total CSS size
    const cssResources = resources.filter(r => r.name.includes('.css'));
    const totalCssSize = cssResources.reduce((sum, css) => sum + (css.transferSize || 0), 0);
    expect(totalCssSize).toBeLessThan(200 * 1024); // < 200KB
  });
});
```

### 3.2 Load Testing
```typescript
// test/performance/load-testing.performance.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Load Testing', () => {
  test('should handle concurrent users on analytics dashboard', async ({ browser }) => {
    const concurrentUsers = 10;
    const userPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentUsers; i++) {
      userPromises.push(simulateUser(browser, i));
    }

    const startTime = Date.now();
    await Promise.all(userPromises);
    const totalTime = Date.now() - startTime;

    // Should complete all users within reasonable time
    expect(totalTime).toBeLessThan(30000); // < 30 seconds
  });

  test('should handle concurrent POS operations', async ({ browser }) => {
    const concurrentOrders = 5;
    const orderPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentOrders; i++) {
      orderPromises.push(simulatePOSOrder(browser, i));
    }

    const startTime = Date.now();
    await Promise.all(orderPromises);
    const totalTime = Date.now() - startTime;

    expect(totalTime).toBeLessThan(20000); // < 20 seconds for 5 concurrent orders
  });

  test('should maintain performance under sustained load', async ({ browser }) => {
    const loadDurationMs = 60000; // 1 minute
    const userSpawnInterval = 2000; // New user every 2 seconds
    const activeUsers: Promise<void>[] = [];
    
    const startTime = Date.now();
    let userCount = 0;

    while (Date.now() - startTime < loadDurationMs) {
      if (activeUsers.length < 20) { // Max 20 concurrent users
        activeUsers.push(simulateUser(browser, userCount++));
      }

      // Remove completed users
      const completedUsers = await Promise.allSettled(activeUsers);
      activeUsers.splice(0, completedUsers.length);

      await new Promise(resolve => setTimeout(resolve, userSpawnInterval));
    }

    // Wait for remaining users to complete
    await Promise.all(activeUsers);

    expect(userCount).toBeGreaterThan(20); // Should have spawned multiple users
  });
});

async function simulateUser(browser: any, userId: number): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', `user${userId}@test.com`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="dashboard"]');

    // Navigate to analytics
    await page.click('[data-testid="analytics-nav"]');
    await page.waitForSelector('[data-testid="business-intelligence-dashboard"]');

    // Switch between tabs
    await page.click('[data-testid="sales-tab"]');
    await page.waitForSelector('[data-testid="revenue-chart"]');

    await page.click('[data-testid="customers-tab"]');
    await page.waitForSelector('[data-testid="customer-metrics"]');

    // Generate a report
    await page.click('[data-testid="reports-nav"]');
    await page.waitForSelector('[data-testid="reports-dashboard"]');
    
    await page.click('[data-testid="report-daily-sales"]');
    await page.click('[data-testid="generate-report-button"]');
    
    await page.waitForSelector('[data-testid="report-generated"]');

  } finally {
    await context.close();
  }
}

async function simulatePOSOrder(browser: any, orderId: number): Promise<void> {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Login
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', `cashier${orderId}@test.com`);
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="dashboard"]');

    // Navigate to POS
    await page.click('[data-testid="pos-nav"]');
    await page.waitForSelector('[data-testid="pos-system"]');

    // Add random products to cart
    const productButtons = await page.locator('[data-testid^="add-to-cart-"]').all();
    const randomProducts = productButtons.slice(0, Math.floor(Math.random() * 3) + 1);

    for (const button of randomProducts) {
      await button.click();
    }

    // Complete checkout
    await page.click('[data-testid="cart-button"]');
    await page.waitForSelector('[data-testid="checkout-sheet"]');

    await page.selectOption('[data-testid="table-select"]', `table-${orderId % 10 + 1}`);
    await page.click('[data-testid="payment-method-cash"]');
    await page.click('[data-testid="complete-order-button"]');

    await page.waitForSelector('[data-testid="order-success"]');

  } finally {
    await context.close();
  }
}
```

---

## 4. Accessibility Testing

### 4.1 WCAG Compliance Tests
```typescript
// test/accessibility/wcag-compliance.test.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA Compliance', () => {
  test('should pass accessibility audit on login page', async ({ page }) => {
    await page.goto('/login');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on analytics dashboard', async ({ page }) => {
    await page.goto('/');
    
    // Login first
    await page.fill('[data-testid="email-input"]', 'manager@restaurant.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForSelector('[data-testid="dashboard"]');
    
    // Navigate to analytics
    await page.click('[data-testid="analytics-nav"]');
    await page.waitForSelector('[data-testid="business-intelligence-dashboard"]');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass accessibility audit on POS system', async ({ page }) => {
    await page.goto('/pos');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="pos-system"]')
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/analytics');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    const headingLevels = await Promise.all(
      headings.map(heading => heading.evaluate(el => parseInt(el.tagName.charAt(1))))
    );

    // Check that heading levels don't skip
    for (let i = 1; i < headingLevels.length; i++) {
      expect(headingLevels[i] - headingLevels[i - 1]).toBeLessThanOrEqual(1);
    }
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/analytics');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include('[data-testid="kpi-cards"]')
      .analyze();
    
    const colorContrastViolations = accessibilityScanResults.violations.filter(
      violation => violation.id === 'color-contrast'
    );
    
    expect(colorContrastViolations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/pos');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.locator(':focus').getAttribute('data-testid');
    expect(focusedElement).toBe('search-input');
    
    await page.keyboard.press('Tab');
    focusedElement = await page.locator(':focus').getAttribute('data-testid');
    expect(focusedElement).toBe('category-all');
    
    // Test space/enter activation
    await page.keyboard.press('Space');
    // Should activate the category filter
    
    // Test escape key
    await page.keyboard.press('Escape');
    // Should close any open modals/sheets
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check for missing ARIA labels
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['aria-label', 'button-name', 'link-name'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
    
    // Check specific ARIA attributes
    const chartElements = await page.locator('[data-testid*="chart"]').all();
    
    for (const chart of chartElements) {
      const role = await chart.getAttribute('role');
      const ariaLabel = await chart.getAttribute('aria-label');
      
      expect(role).toBe('img');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/analytics');
    
    // Check for screen reader friendly content
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a'])
      .analyze();
    
    const screenReaderIssues = accessibilityScanResults.violations.filter(violation =>
      ['image-alt', 'label', 'link-name', 'button-name'].includes(violation.id)
    );
    
    expect(screenReaderIssues).toEqual([]);
    
    // Check for hidden content that should be available to screen readers
    const visuallyHidden = await page.locator('.sr-only').all();
    expect(visuallyHidden.length).toBeGreaterThan(0);
  });

  test('should handle reduced motion preferences', async ({ page }) => {
    // Simulate user preference for reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    await page.goto('/analytics');
    
    // Check that animations are disabled or reduced
    const animatedElements = await page.locator('[class*="animate"]').all();
    
    for (const element of animatedElements) {
      const animationDuration = await element.evaluate(el => 
        window.getComputedStyle(el).animationDuration
      );
      
      // Should be either 0s or very short
      expect(['0s', '0.01s'].includes(animationDuration)).toBe(true);
    }
  });

  test('should support high contrast mode', async ({ page }) => {
    // Simulate high contrast mode
    await page.emulateMedia({ forcedColors: 'active' });
    
    await page.goto('/analytics');
    
    // Check that content is still visible and readable
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });
});
```

---

## 5. Criteri di Completamento Fase 6

### Test Coverage Requirements:
- **Unit Tests**: >= 95% coverage per tutti i React components
- **Integration Tests**: Complete user journeys end-to-end validation
- **Performance Tests**: Lighthouse scores >= 90 desktop, >= 80 mobile
- **Accessibility Tests**: WCAG 2.1 AA compliance 100%
- **Cross-browser Tests**: Chrome, Firefox, Safari, Edge compatibility
- **Mobile Tests**: iOS e Android device compatibility
- **Load Tests**: 20+ concurrent users support
- **PWA Tests**: Service worker, offline functionality, installation

### Business Logic Validation Requirements:
1. **Analytics Accuracy**: Real-time metrics con accuracy >= 98%
2. **Report Generation**: Standard reports < 30s, complex reports < 2 minutes
3. **Mobile Performance**: Touch interactions < 100ms response time
4. **Offline Capability**: Core POS functions available offline
5. **Real-time Updates**: WebSocket latency < 100ms
6. **Bundle Optimization**: Main bundle < 500KB, total < 2MB
7. **Accessibility**: Zero WCAG violations across all pages

### Automated Testing Pipeline:
```bash
# Complete Phase 6 testing suite
npm run test:phase6:unit           # React component unit tests
npm run test:phase6:integration    # E2E user journey tests
npm run test:phase6:performance    # Lighthouse and load tests
npm run test:phase6:accessibility  # WCAG compliance tests
npm run test:phase6:mobile         # Mobile device tests
npm run test:phase6:cross-browser  # Cross-browser compatibility
npm run test:phase6:pwa            # PWA functionality tests
npm run test:phase6:all            # Complete test suite
```

### Critical Business Scenarios:
- **Complete Analytics Workflow**: Dashboard → Insights → Reports → Actions
- **Mobile POS Experience**: Search → Add to Cart → Checkout → Complete Order
- **Real-time Updates**: Order Creation → Live Metrics Update → Dashboard Refresh
- **Offline/Online Sync**: Offline Order → Online Reconnection → Data Sync
- **Cross-device Experience**: Desktop Analytics → Mobile POS → Tablet Reports
- **Performance Under Load**: 20+ concurrent users con responsive experience

### Production Readiness Validation:
- **Lighthouse Scores**: Performance >= 90, PWA >= 95, Accessibility >= 95
- **Bundle Analysis**: Code splitting effective, lazy loading implemented
- **CDN Integration**: Static assets optimized e cached correctly
- **Service Worker**: Background sync, offline functionality, push notifications
- **Real-time Features**: WebSocket connection stability e failover
- **Error Handling**: Graceful degradation e user-friendly error messages
- **Analytics Integration**: Business metrics accuracy e real-time updates

La Fase 6 è completa quando l'entire frontend ecosystem fornisce un'esperienza utente seamless, performance-optimized, accessible e production-ready per l'ecosistema BeerFlow completo, con business intelligence avanzata e mobile-first experience che supporta tutte le funzionalità implementate nelle fasi precedenti.
