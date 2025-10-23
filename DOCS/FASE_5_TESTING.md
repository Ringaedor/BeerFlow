# FASE 5 - TESTING STRATEGY & IMPLEMENTATION

## Obiettivo Testing
Validare completamente il sistema Document Intelligence con OCR multi-provider, Customer Relationship Management con GDPR compliance e Provider System intercambiabile attraverso test comprehensivi che garantiscano l'affidabilità del document processing, accuracy del parsing, customer data integrity e provider failover automatico per operazioni restaurant complete.

## Componenti Phase 5 da Testare
- **Document Intelligence System**: Upload, OCR processing, document parsing, human review workflow
- **OCR Multi-Provider Pipeline**: Tesseract, Google Vision, AWS Textract con fallback automatico
- **Document Parser Engine**: Template recognition, data extraction, supplier matching
- **Customer Relationship Management**: CRUD, multi-identity, segmentation, analytics
- **GDPR Compliance System**: Consent management, data export, erasure, audit trail
- **Provider System**: Configuration, health monitoring, failover, cost tracking
- **Storage Integration**: S3-compatible storage, file management, security
- **Integration Testing**: Document → Inventory, Customer → Orders, Provider notifications

---

## 1. Unit Tests Document Intelligence

### 1.1 OCR Service Tests
```typescript
// src/documents/ocr.service.spec.ts
describe('OCRService', () => {
  let service: OCRService;
  let providerRepository: Repository<Provider>;
  let documentRepository: Repository<Document>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OCRService,
        {
          provide: getRepositoryToken(Provider),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(Document),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<OCRService>(OCRService);
    providerRepository = module.get<Repository<Provider>>(getRepositoryToken(Provider));
    documentRepository = module.get<Repository<Document>>(getRepositoryToken(Document));
  });

  describe('processDocument', () => {
    it('should process document with primary provider successfully', async () => {
      // Mock document
      const mockDocument = {
        id: 'doc-123',
        file_path: '/test/document.pdf',
        venue_id: 'venue-123',
        processing_status: ProcessingStatus.PENDING
      } as Document;

      // Mock providers
      const mockProviders = [
        {
          id: 'provider-1',
          provider_name: 'tesseract',
          provider_type: ProviderType.OCR,
          status: ProviderStatus.ACTIVE,
          priority: 100
        }
      ] as Provider[];

      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service as any, 'getAvailableOCRProviders').mockResolvedValue(mockProviders);
      jest.spyOn(service as any, 'processWithProvider').mockResolvedValue({
        text: 'Test OCR Result',
        confidence: 85,
        metadata: { provider: 'tesseract' },
        provider: 'tesseract',
        processingTime: 5000
      });

      const result = await service.processDocument('doc-123');

      expect(result.text).toBe('Test OCR Result');
      expect(result.confidence).toBe(85);
      expect(result.provider).toBe('tesseract');
      expect(documentRepository.update).toHaveBeenCalledWith('doc-123', {
        ocr_text: 'Test OCR Result',
        confidence_score: 85,
        ocr_metadata: { provider: 'tesseract' },
        processing_status: ProcessingStatus.OCR_COMPLETED
      });
    });

    it('should failover to secondary provider when primary fails', async () => {
      const mockDocument = {
        id: 'doc-123',
        file_path: '/test/document.pdf',
        venue_id: 'venue-123'
      } as Document;

      const mockProviders = [
        {
          id: 'provider-1',
          provider_name: 'tesseract',
          priority: 100
        },
        {
          id: 'provider-2',
          provider_name: 'google_vision',
          priority: 90
        }
      ] as Provider[];

      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service as any, 'getAvailableOCRProviders').mockResolvedValue(mockProviders);
      
      // First provider fails
      jest.spyOn(service as any, 'processWithProvider')
        .mockRejectedValueOnce(new Error('Tesseract failed'))
        .mockResolvedValueOnce({
          text: 'Google Vision Result',
          confidence: 92,
          provider: 'google_vision',
          processingTime: 3000
        });

      const result = await service.processDocument('doc-123');

      expect(result.provider).toBe('google_vision');
      expect(result.confidence).toBe(92);
    });

    it('should reject low confidence results and try next provider', async () => {
      const mockDocument = {
        id: 'doc-123',
        file_path: '/test/document.pdf',
        venue_id: 'venue-123'
      } as Document;

      const mockProviders = [
        { id: 'provider-1', provider_name: 'tesseract', priority: 100 },
        { id: 'provider-2', provider_name: 'google_vision', priority: 90 }
      ] as Provider[];

      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service as any, 'getAvailableOCRProviders').mockResolvedValue(mockProviders);
      
      // First provider returns low confidence
      jest.spyOn(service as any, 'processWithProvider')
        .mockResolvedValueOnce({
          text: 'Low quality result',
          confidence: 45, // Below threshold
          provider: 'tesseract'
        })
        .mockResolvedValueOnce({
          text: 'High quality result',
          confidence: 88,
          provider: 'google_vision'
        });

      const result = await service.processDocument('doc-123');

      expect(result.provider).toBe('google_vision');
      expect(result.confidence).toBe(88);
    });

    it('should update provider health on failure', async () => {
      const mockDocument = { id: 'doc-123', venue_id: 'venue-123' } as Document;
      const mockProvider = { id: 'provider-1', provider_name: 'tesseract' } as Provider;

      jest.spyOn(documentRepository, 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service as any, 'getAvailableOCRProviders').mockResolvedValue([mockProvider]);
      jest.spyOn(service as any, 'processWithProvider').mockRejectedValue(new Error('OCR failed'));
      jest.spyOn(service as any, 'updateProviderHealth').mockResolvedValue(undefined);

      await expect(service.processDocument('doc-123')).rejects.toThrow();
      
      expect(service['updateProviderHealth']).toHaveBeenCalledWith('provider-1', false);
    });
  });

  describe('Tesseract OCR Processing', () => {
    it('should process document with Tesseract successfully', async () => {
      const mockDocument = { file_path: '/test/invoice.pdf' } as Document;
      const mockProvider = { provider_name: 'tesseract', config_encrypted: {} } as Provider;

      jest.spyOn(service as any, 'callPythonOCRWorker').mockResolvedValue({
        text: 'FATTURA N. 12345\nFornitore: Test Supplier\nTotale: €100.00',
        confidence: 82,
        version: '5.0.0',
        language: 'ita'
      });

      const result = await service['processTesseract'](mockDocument, mockProvider);

      expect(result.text).toContain('FATTURA N. 12345');
      expect(result.confidence).toBe(82);
      expect(result.provider).toBe('tesseract');
      expect(result.metadata.language).toBe('ita');
    });
  });

  describe('Google Vision OCR Processing', () => {
    it('should process document with Google Vision successfully', async () => {
      const mockDocument = { file_path: '/test/ddt.pdf' } as Document;
      const mockProvider = {
        provider_name: 'google_vision',
        config_encrypted: {
          keyFilename: '/path/to/credentials.json',
          projectId: 'test-project'
        }
      } as Provider;

      // Mock Google Vision client
      const mockVisionClient = {
        textDetection: jest.fn().mockResolvedValue([{
          textAnnotations: [
            {
              description: 'DDT N. 54321\nDest: Test Venue\nData: 15/12/2024',
              boundingPoly: { vertices: [{ x: 0, y: 0 }, { x: 100, y: 100 }] }
            }
          ]
        }])
      };

      jest.doMock('@google-cloud/vision', () => ({
        ImageAnnotatorClient: jest.fn(() => mockVisionClient)
      }));

      const result = await service['processGoogleVision'](mockDocument, mockProvider);

      expect(result.text).toContain('DDT N. 54321');
      expect(result.provider).toBe('google_vision');
      expect(result.confidence).toBeGreaterThan(50);
    });
  });
});
```

### 1.2 Document Parser Tests
```typescript
// src/documents/document-parser.service.spec.ts
describe('DocumentParserService', () => {
  let service: DocumentParserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentParserService,
        {
          provide: getRepositoryToken(Document),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(DocumentLine),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<DocumentParserService>(DocumentParserService);
  });

  describe('parseDocument', () => {
    it('should parse Italian invoice correctly', async () => {
      const mockDocument = {
        id: 'doc-123',
        ocr_text: `
          FATTURA N. 2024/001234
          Data: 15/12/2024
          
          Fornitore Test SRL
          Via Roma 123, Milano
          P.IVA: 12345678901
          
          Descrizione          Qta    Prezzo   Totale
          Birra Lager 33cl     24     €2.50    €60.00
          Birra IPA 33cl       12     €3.00    €36.00
          
          Totale: €96.00
        `
      } as Document;

      jest.spyOn(service['documentRepository'], 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service['documentRepository'], 'update').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'createDocumentLines').mockResolvedValue(undefined);

      const result = await service.parseDocument('doc-123');

      expect(result.documentType).toBe(DocumentType.INVOICE);
      expect(result.supplier.name).toContain('Fornitore Test SRL');
      expect(result.documentNumber).toBe('2024/001234');
      expect(result.totalAmount).toBe(96);
      expect(result.lines).toHaveLength(2);
      expect(result.lines[0].description).toContain('Birra Lager');
      expect(result.lines[0].quantity).toBe(24);
      expect(result.lines[0].unitPrice).toBe(2.5);
    });

    it('should parse DDT (Documento di Trasporto) correctly', async () => {
      const mockDocument = {
        id: 'doc-456',
        ocr_text: `
          DOCUMENTO DI TRASPORTO N. DDT-2024-5678
          Data: 16/12/2024
          
          Mittente: Birrificio Artigianale SNC
          Destinatario: Pub Central
          
          Descrizione              Qta    
          Fusto Pilsner 20L        2      
          Fusto Weizen 20L         1      
          Bottiglie Stout 33cl     48     
        `
      } as Document;

      jest.spyOn(service['documentRepository'], 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service['documentRepository'], 'update').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'createDocumentLines').mockResolvedValue(undefined);

      const result = await service.parseDocument('doc-456');

      expect(result.documentType).toBe(DocumentType.DDT);
      expect(result.supplier.name).toContain('Birrificio Artigianale');
      expect(result.documentNumber).toBe('DDT-2024-5678');
      expect(result.lines).toHaveLength(3);
      expect(result.lines[0].description).toContain('Fusto Pilsner');
      expect(result.lines[0].quantity).toBe(2);
    });

    it('should detect document type correctly', async () => {
      expect(service['detectDocumentType']('FATTURA N. 123')).toBe(DocumentType.INVOICE);
      expect(service['detectDocumentType']('DDT N. 456')).toBe(DocumentType.DDT);
      expect(service['detectDocumentType']('DOCUMENTO DI TRASPORTO')).toBe(DocumentType.DDT);
      expect(service['detectDocumentType']('SCONTRINO FISCALE')).toBe(DocumentType.RECEIPT);
      expect(service['detectDocumentType']('PREVENTIVO N. 789')).toBe(DocumentType.QUOTE);
      expect(service['detectDocumentType']('Random text')).toBe(DocumentType.UNKNOWN);
    });

    it('should extract supplier information correctly', async () => {
      const lines = [
        'FATTURA N. 123',
        'Birrificio Test SRL',
        'Via Milano 45, Roma',
        'P.IVA: 11223344556',
        'Telefono: 06-1234567'
      ];

      const supplier = service['extractSupplierInfo'](lines);

      expect(supplier.name).toBe('Birrificio Test SRL');
      expect(supplier.vatNumber).toBe('11223344556');
      expect(supplier.address).toBe('Via Milano 45, Roma');
    });

    it('should extract dates in various Italian formats', async () => {
      const testDates = [
        { text: 'Data: 15/12/2024', expected: new Date(2024, 11, 15) },
        { text: 'Del 25-11-2024', expected: new Date(2024, 10, 25) },
        { text: '5 gennaio 2024', expected: new Date(2024, 0, 5) },
        { text: '20 dicembre 2024', expected: new Date(2024, 11, 20) }
      ];

      testDates.forEach(({ text, expected }) => {
        const result = service['extractDate']([text]);
        expect(result.getFullYear()).toBe(expected.getFullYear());
        expect(result.getMonth()).toBe(expected.getMonth());
        expect(result.getDate()).toBe(expected.getDate());
      });
    });

    it('should extract line items with Italian formatting', async () => {
      const lines = [
        'Descrizione              Qta    Prezzo   Totale',
        'Birra Pilsner 50cl       12     €4,50    €54,00',
        'Chips Patatine 150g      24     €1,25    €30,00',
        'Olio EVO 0.5L            6      €8,90    €53,40'
      ];

      const lineItems = service['extractLineItems'](lines);

      expect(lineItems).toHaveLength(3);
      
      expect(lineItems[0].description).toContain('Birra Pilsner');
      expect(lineItems[0].quantity).toBe(12);
      expect(lineItems[0].unitPrice).toBe(4.5);
      expect(lineItems[0].totalPrice).toBe(54);

      expect(lineItems[1].description).toContain('Chips Patatine');
      expect(lineItems[1].quantity).toBe(24);
      expect(lineItems[1].unitPrice).toBe(1.25);
      expect(lineItems[1].totalPrice).toBe(30);
    });

    it('should calculate parsing confidence correctly', async () => {
      const goodParsingResult = {
        documentType: DocumentType.INVOICE,
        supplier: { name: 'Known Supplier' },
        documentNumber: 'INV-2024-001',
        totalAmount: 150.50,
        lines: [
          { description: 'Product 1', quantity: 2, unitPrice: 10, totalPrice: 20 },
          { description: 'Product 2', quantity: 3, unitPrice: 15, totalPrice: 45 }
        ]
      } as ParsedDocument;

      const confidence = service['calculateParsingConfidence']('test text', goodParsingResult);
      expect(confidence).toBeGreaterThanOrEqual(90);

      const poorParsingResult = {
        documentType: DocumentType.UNKNOWN,
        supplier: { name: 'Unknown Supplier' },
        documentNumber: 'UNKNOWN',
        totalAmount: 0,
        lines: []
      } as ParsedDocument;

      const lowConfidence = service['calculateParsingConfidence']('test text', poorParsingResult);
      expect(lowConfidence).toBeLessThanOrEqual(60);
    });
  });

  describe('Error Handling', () => {
    it('should handle documents without OCR text', async () => {
      const mockDocument = {
        id: 'doc-no-ocr',
        ocr_text: null
      } as Document;

      jest.spyOn(service['documentRepository'], 'findOne').mockResolvedValue(mockDocument);

      await expect(service.parseDocument('doc-no-ocr')).rejects.toThrow('OCR text not available');
    });

    it('should update processing status on parsing failure', async () => {
      const mockDocument = {
        id: 'doc-fail',
        ocr_text: 'invalid text'
      } as Document;

      jest.spyOn(service['documentRepository'], 'findOne').mockResolvedValue(mockDocument);
      jest.spyOn(service['documentRepository'], 'update').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'detectDocumentType').mockImplementation(() => {
        throw new Error('Parsing failed');
      });

      await expect(service.parseDocument('doc-fail')).rejects.toThrow('Parsing failed');

      expect(service['documentRepository'].update).toHaveBeenCalledWith('doc-fail', {
        processing_status: ProcessingStatus.PARSING_FAILED,
        processing_errors: { parsing_error: 'Parsing failed' }
      });
    });
  });
});
```

---

## 2. Unit Tests Customer Management

### 2.1 Customer Service Tests
```typescript
// src/customers/customers.service.spec.ts
describe('CustomersService', () => {
  let service: CustomersService;
  let customerRepository: Repository<Customer>;
  let identityRepository: Repository<CustomerIdentity>;
  let consentRepository: Repository<CustomerConsent>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: getRepositoryToken(Customer),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerIdentity),
          useClass: Repository,
        },
        {
          provide: getRepositoryToken(CustomerConsent),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    customerRepository = module.get<Repository<Customer>>(getRepositoryToken(Customer));
    identityRepository = module.get<Repository<CustomerIdentity>>(getRepositoryToken(CustomerIdentity));
    consentRepository = module.get<Repository<CustomerConsent>>(getRepositoryToken(CustomerConsent));
  });

  describe('createCustomer', () => {
    it('should create customer with identities and consents', async () => {
      const createCustomerDto = {
        first_name: 'Marco',
        last_name: 'Bianchi',
        identities: [
          {
            identity_type: IdentityType.EMAIL,
            identity_value: 'marco.bianchi@email.com',
            is_primary: true
          },
          {
            identity_type: IdentityType.PHONE,
            identity_value: '+39123456789',
            is_primary: false
          }
        ],
        consents: [
          {
            consent_type: ConsentType.MARKETING,
            status: ConsentStatus.GRANTED,
            purpose: 'Email marketing',
            legal_basis: 'consent',
            collection_method: 'website_form'
          }
        ]
      };

      const mockCustomer = {
        id: 'customer-123',
        ...createCustomerDto,
        gdpr_consent_date: new Date(),
        venue_id: 'venue-123'
      } as Customer;

      jest.spyOn(customerRepository, 'create').mockReturnValue(mockCustomer);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(mockCustomer);
      jest.spyOn(service as any, 'createCustomerIdentities').mockResolvedValue([]);
      jest.spyOn(service as any, 'createCustomerConsents').mockResolvedValue([]);

      const result = await service.createCustomer('venue-123', createCustomerDto);

      expect(result.first_name).toBe('Marco');
      expect(result.last_name).toBe('Bianchi');
      expect(result.gdpr_consent_date).toBeDefined();
      expect(service['createCustomerIdentities']).toHaveBeenCalledWith('customer-123', createCustomerDto.identities);
      expect(service['createCustomerConsents']).toHaveBeenCalledWith('customer-123', createCustomerDto.consents);
    });

    it('should prevent duplicate primary identity for same type', async () => {
      const duplicateIdentityDto = {
        first_name: 'Test',
        last_name: 'User',
        identities: [
          {
            identity_type: IdentityType.EMAIL,
            identity_value: 'existing@email.com',
            is_primary: true
          }
        ]
      };

      jest.spyOn(identityRepository, 'findOne').mockResolvedValue({
        id: 'existing-identity',
        customer_id: 'other-customer'
      } as CustomerIdentity);

      await expect(service.createCustomer('venue-123', duplicateIdentityDto))
        .rejects.toThrow('Identity already exists');
    });

    it('should automatically set customer tier based on criteria', async () => {
      const vipCustomerDto = {
        first_name: 'VIP',
        last_name: 'Customer',
        total_spent: 2500, // VIP threshold
        identities: [{ identity_type: IdentityType.EMAIL, identity_value: 'vip@test.com' }]
      };

      const mockCustomer = { id: 'vip-123', tier: CustomerTier.VIP } as Customer;

      jest.spyOn(customerRepository, 'create').mockReturnValue(mockCustomer);
      jest.spyOn(customerRepository, 'save').mockResolvedValue(mockCustomer);
      jest.spyOn(service as any, 'determineCustomerTier').mockReturnValue(CustomerTier.VIP);

      const result = await service.createCustomer('venue-123', vipCustomerDto);

      expect(result.tier).toBe(CustomerTier.VIP);
    });
  });

  describe('GDPR Compliance', () => {
    it('should export complete customer data for GDPR request', async () => {
      const mockCustomer = {
        id: 'customer-gdpr',
        first_name: 'John',
        last_name: 'Privacy',
        email: 'john@privacy.com',
        created_at: new Date('2024-01-01'),
        gdpr_consent_date: new Date('2024-01-01')
      } as Customer;

      const mockIdentities = [
        { identity_type: IdentityType.EMAIL, identity_value: 'john@privacy.com' },
        { identity_type: IdentityType.PHONE, identity_value: '+39987654321' }
      ] as CustomerIdentity[];

      const mockConsents = [
        {
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
          granted_at: new Date('2024-01-01')
        }
      ] as CustomerConsent[];

      const mockOrders = [
        {
          id: 'order-1',
          total_amount: 45.50,
          created_at: new Date('2024-02-01')
        }
      ] as any[];

      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(service as any, 'getCustomerIdentities').mockResolvedValue(mockIdentities);
      jest.spyOn(service as any, 'getCustomerConsents').mockResolvedValue(mockConsents);
      jest.spyOn(service as any, 'getCustomerOrders').mockResolvedValue(mockOrders);

      const gdprData = await service.exportGDPRData('customer-gdpr');

      expect(gdprData.personal_data).toEqual({
        customer_id: 'customer-gdpr',
        first_name: 'John',
        last_name: 'Privacy',
        registration_date: new Date('2024-01-01'),
        gdpr_consent_date: new Date('2024-01-01')
      });

      expect(gdprData.identities).toHaveLength(2);
      expect(gdprData.consent_history).toHaveLength(1);
      expect(gdprData.order_history).toHaveLength(1);
      expect(gdprData.export_timestamp).toBeDefined();
    });

    it('should handle GDPR data deletion request', async () => {
      const mockCustomer = {
        id: 'customer-delete',
        gdpr_data_deletion_requested: false
      } as Customer;

      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerRepository, 'update').mockResolvedValue(undefined);
      jest.spyOn(service as any, 'scheduleDataDeletion').mockResolvedValue(undefined);

      await service.requestDataDeletion('customer-delete', 'User requested deletion');

      expect(customerRepository.update).toHaveBeenCalledWith('customer-delete', {
        gdpr_data_deletion_requested: true,
        gdpr_deletion_scheduled_date: expect.any(Date),
        status: CustomerStatus.INACTIVE
      });
    });

    it('should validate consent requirements for data processing', async () => {
      const mockCustomer = { id: 'customer-consent' } as Customer;
      
      const validConsents = [
        {
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
          expires_at: new Date(Date.now() + 86400000) // Tomorrow
        }
      ] as CustomerConsent[];

      jest.spyOn(consentRepository, 'find').mockResolvedValue(validConsents);

      const hasValidConsent = await service.hasValidConsent('customer-consent', ConsentType.MARKETING);
      expect(hasValidConsent).toBe(true);

      // Test expired consent
      const expiredConsents = [
        {
          consent_type: ConsentType.MARKETING,
          status: ConsentStatus.GRANTED,
          expires_at: new Date(Date.now() - 86400000) // Yesterday
        }
      ] as CustomerConsent[];

      jest.spyOn(consentRepository, 'find').mockResolvedValue(expiredConsents);

      const hasExpiredConsent = await service.hasValidConsent('customer-consent', ConsentType.MARKETING);
      expect(hasExpiredConsent).toBe(false);
    });
  });

  describe('Customer Analytics', () => {
    it('should calculate customer lifetime value correctly', async () => {
      const mockOrders = [
        { total_amount: 45.50 },
        { total_amount: 78.25 },
        { total_amount: 123.00 }
      ] as any[];

      jest.spyOn(service as any, 'getCustomerOrders').mockResolvedValue(mockOrders);

      const lifetimeValue = await service.calculateLifetimeValue('customer-analytics');
      expect(lifetimeValue).toBe(246.75);
    });

    it('should update customer tier based on spending', async () => {
      const mockCustomer = {
        id: 'customer-tier',
        total_spent: 1200,
        tier: CustomerTier.REGULAR
      } as Customer;

      jest.spyOn(customerRepository, 'findOne').mockResolvedValue(mockCustomer);
      jest.spyOn(customerRepository, 'update').mockResolvedValue(undefined);

      await service.updateCustomerTier('customer-tier');

      expect(customerRepository.update).toHaveBeenCalledWith('customer-tier', {
        tier: CustomerTier.VIP // Should upgrade to VIP
      });
    });

    it('should segment customers correctly', async () => {
      const mockCustomers = [
        { id: '1', total_spent: 50, total_visits: 2, tier: CustomerTier.REGULAR },
        { id: '2', total_spent: 1500, total_visits: 25, tier: CustomerTier.VIP },
        { id: '3', total_spent: 5000, total_visits: 50, tier: CustomerTier.PREMIUM }
      ] as Customer[];

      jest.spyOn(customerRepository, 'find').mockResolvedValue(mockCustomers);

      const segments = await service.getCustomerSegments('venue-123');

      expect(segments.regular.count).toBe(1);
      expect(segments.vip.count).toBe(1);
      expect(segments.premium.count).toBe(1);
      expect(segments.vip.averageSpent).toBe(1500);
      expect(segments.premium.averageVisits).toBe(50);
    });
  });
});
```

---

## 3. Integration Tests Phase 5

### 3.1 Document Processing Workflow Integration
```typescript
// test/integration/document-workflow.integration.spec.ts
describe('Document Processing Workflow Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Document Processing Pipeline', () => {
    it('should process Italian invoice from upload to inventory application', async () => {
      // Create test PDF with Italian invoice content
      const testInvoiceBuffer = Buffer.from(createTestInvoicePDF());
      
      // 1. Upload document
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/documents/upload')
        .attach('file', testInvoiceBuffer, 'fattura-test.pdf')
        .expect(201);

      const documentId = uploadResponse.body.id;
      expect(documentId).toBeDefined();
      expect(uploadResponse.body.file_type).toBe('application/pdf');

      // 2. Wait for OCR processing
      let ocrStatus = 'pending';
      for (let i = 0; i < 30 && ocrStatus !== 'ocr_completed'; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const statusResponse = await request(app.getHttpServer())
          .get(`/api/v1/venues/test-venue/documents/${documentId}/ocr-status`)
          .expect(200);
        
        ocrStatus = statusResponse.body.processing_status;
      }

      expect(ocrStatus).toBe('ocr_completed');

      // 3. Verify OCR results
      const documentResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/documents/${documentId}`)
        .expect(200);

      expect(documentResponse.body.ocr_text).toContain('FATTURA');
      expect(documentResponse.body.confidence_score).toBeGreaterThan(60);

      // 4. Wait for parsing completion
      let parsingStatus = 'ocr_completed';
      for (let i = 0; i < 10 && parsingStatus !== 'parsing_completed'; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const statusResponse = await request(app.getHttpServer())
          .get(`/api/v1/venues/test-venue/documents/${documentId}`)
          .expect(200);
        
        parsingStatus = statusResponse.body.processing_status;
      }

      expect(parsingStatus).toBe('parsing_completed');

      // 5. Verify parsed data
      expect(documentResponse.body.document_type).toBe('invoice');
      expect(documentResponse.body.supplier_name).toBeDefined();
      expect(documentResponse.body.document_number).toBeDefined();
      expect(documentResponse.body.total_amount).toBeGreaterThan(0);

      // 6. Get document lines
      const linesResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/documents/${documentId}/lines`)
        .expect(200);

      expect(linesResponse.body).toHaveLength(2); // Test invoice has 2 items
      expect(linesResponse.body[0].description).toContain('Birra');

      // 7. Human review and approval
      const reviewResponse = await request(app.getHttpServer())
        .patch(`/api/v1/venues/test-venue/documents/${documentId}/review`)
        .send({
          approved: true,
          review_notes: 'Integration test approval',
          corrections: {
            supplier_name: 'Corrected Supplier Name',
            total_amount: 125.50
          }
        })
        .expect(200);

      expect(reviewResponse.body.status).toBe('reviewed');

      // 8. Apply to inventory
      const inventoryResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/test-venue/documents/${documentId}/apply-inventory`)
        .send({
          create_missing_products: true,
          default_category: 'beverages'
        })
        .expect(200);

      expect(inventoryResponse.body.applied_items).toBeGreaterThan(0);
      expect(inventoryResponse.body.created_products).toBeGreaterThan(0);

      // 9. Verify inventory was updated
      const inventoryCheck = await request(app.getHttpServer())
        .get('/api/v1/venues/test-venue/products')
        .query({ search: 'Birra' })
        .expect(200);

      expect(inventoryCheck.body.data.length).toBeGreaterThan(0);
    });

    it('should handle OCR provider failover', async () => {
      // Disable primary OCR provider
      await request(app.getHttpServer())
        .patch('/api/v1/venues/test-venue/providers/tesseract-primary')
        .send({ status: 'maintenance' })
        .expect(200);

      // Upload document (should use secondary provider)
      const testBuffer = Buffer.from(createTestDDTPDF());
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/documents/upload')
        .attach('file', testBuffer, 'ddt-test.pdf')
        .expect(201);

      // Wait for processing with secondary provider
      const documentId = uploadResponse.body.id;
      await waitForOCRCompletion(app, documentId);

      // Verify processing completed with different provider
      const documentResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/documents/${documentId}`)
        .expect(200);

      expect(documentResponse.body.ocr_metadata.provider).not.toBe('tesseract');
      expect(documentResponse.body.processing_status).toBe('ocr_completed');

      // Re-enable primary provider
      await request(app.getHttpServer())
        .patch('/api/v1/venues/test-venue/providers/tesseract-primary')
        .send({ status: 'active' })
        .expect(200);
    });

    it('should handle document processing errors gracefully', async () => {
      // Upload corrupted file
      const corruptedBuffer = Buffer.from('This is not a valid PDF file');
      
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/documents/upload')
        .attach('file', corruptedBuffer, 'corrupted.pdf')
        .expect(201);

      const documentId = uploadResponse.body.id;

      // Wait for processing to fail
      await new Promise(resolve => setTimeout(resolve, 5000));

      const documentResponse = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/documents/${documentId}`)
        .expect(200);

      expect(documentResponse.body.processing_status).toBe('ocr_failed');
      expect(documentResponse.body.processing_errors).toBeDefined();
    });
  });

  describe('Document Template Recognition', () => {
    it('should recognize different Italian document types', async () => {
      const documentTypes = [
        { file: createTestInvoicePDF(), expected: 'invoice', keywords: ['FATTURA'] },
        { file: createTestDDTPDF(), expected: 'ddt', keywords: ['DDT', 'DOCUMENTO DI TRASPORTO'] },
        { file: createTestReceiptPDF(), expected: 'receipt', keywords: ['SCONTRINO'] },
        { file: createTestQuotePDF(), expected: 'quote', keywords: ['PREVENTIVO'] }
      ];

      for (const docType of documentTypes) {
        const uploadResponse = await request(app.getHttpServer())
          .post('/api/v1/venues/test-venue/documents/upload')
          .attach('file', Buffer.from(docType.file), `test-${docType.expected}.pdf`)
          .expect(201);

        await waitForParsingCompletion(app, uploadResponse.body.id);

        const documentResponse = await request(app.getHttpServer())
          .get(`/api/v1/venues/test-venue/documents/${uploadResponse.body.id}`)
          .expect(200);

        expect(documentResponse.body.document_type).toBe(docType.expected);
        expect(docType.keywords.some(keyword => 
          documentResponse.body.ocr_text.toUpperCase().includes(keyword)
        )).toBe(true);
      }
    });
  });
});

// Helper functions
function createTestInvoicePDF(): string {
  return `%PDF-1.4
    FATTURA N. 2024/001234
    Data: 15/12/2024
    
    Birrificio Artigianale SRL
    Via Roma 123, Milano
    P.IVA: 12345678901
    
    Descrizione          Qta    Prezzo   Totale
    Birra Lager 33cl     24     €2.50    €60.00
    Birra IPA 33cl       12     €3.00    €36.00
    
    Totale: €96.00
  %%EOF`;
}

function createTestDDTPDF(): string {
  return `%PDF-1.4
    DOCUMENTO DI TRASPORTO N. DDT-2024-5678
    Data: 16/12/2024
    
    Mittente: Birrificio Test SNC
    Destinatario: Pub Central
    
    Descrizione              Qta    
    Fusto Pilsner 20L        2      
    Fusto Weizen 20L         1      
  %%EOF`;
}

async function waitForOCRCompletion(app: INestApplication, documentId: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/venues/test-venue/documents/${documentId}/ocr-status`)
      .expect(200);

    if (response.body.processing_status === 'ocr_completed') {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('OCR processing timed out');
}
```

### 3.2 Customer Management Integration
```typescript
// test/integration/customer-management.integration.spec.ts
describe('Customer Management Integration', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // App setup similar to previous test
  });

  describe('Customer Lifecycle Management', () => {
    it('should handle complete customer journey with GDPR compliance', async () => {
      // 1. Create customer with multiple identities
      const customerData = {
        first_name: 'Alessandro',
        last_name: 'Rossi',
        date_of_birth: '1985-05-15',
        identities: [
          {
            identity_type: 'email',
            identity_value: 'alessandro.rossi@email.com',
            is_primary: true
          },
          {
            identity_type: 'phone',
            identity_value: '+39123456789'
          },
          {
            identity_type: 'loyalty_card',
            identity_value: 'CARD123456'
          }
        ],
        consents: [
          {
            consent_type: 'essential',
            status: 'granted',
            purpose: 'Service provision',
            legal_basis: 'contract',
            collection_method: 'in_person'
          },
          {
            consent_type: 'marketing',
            status: 'granted',
            purpose: 'Email marketing',
            legal_basis: 'consent',
            collection_method: 'website_form'
          }
        ]
      };

      const customerResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send(customerData)
        .expect(201);

      const customerId = customerResponse.body.id;

      // Verify customer creation
      expect(customerResponse.body.first_name).toBe('Alessandro');
      expect(customerResponse.body.identities).toHaveLength(3);
      expect(customerResponse.body.consents).toHaveLength(2);
      expect(customerResponse.body.gdpr_consent_date).toBeDefined();

      // 2. Create orders to build customer history
      const orders = [
        {
          table_id: 'table-1',
          items: [
            { product_id: 'beer-lager', quantity: 2, unit_price: 5.50 },
            { product_id: 'pizza-margherita', quantity: 1, unit_price: 12.00 }
          ]
        },
        {
          table_id: 'table-2',
          items: [
            { product_id: 'beer-ipa', quantity: 3, unit_price: 6.00 },
            { product_id: 'burger-classic', quantity: 1, unit_price: 15.00 }
          ]
        }
      ];

      for (const orderData of orders) {
        await request(app.getHttpServer())
          .post('/api/v1/venues/test-venue/orders')
          .send({
            customer_id: customerId,
            ...orderData
          })
          .expect(201);
      }

      // 3. Verify customer metrics updated
      const updatedCustomer = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customerId}`)
        .expect(200);

      expect(updatedCustomer.body.total_visits).toBe(2);
      expect(parseFloat(updatedCustomer.body.total_spent)).toBe(56.00); // (11+33) + (18+15)
      expect(updatedCustomer.body.first_visit_date).toBeDefined();
      expect(updatedCustomer.body.last_visit_date).toBeDefined();

      // 4. Test customer tier upgrade
      // Simulate high-value customer by updating spending
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/test-venue/customers/${customerId}`)
        .send({ total_spent: 1500.00 })
        .expect(200);

      const tierUpdateResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/test-venue/customers/${customerId}/update-tier`)
        .expect(200);

      expect(tierUpdateResponse.body.tier).toBe('vip');

      // 5. Test customer segmentation
      const segmentationResponse = await request(app.getHttpServer())
        .get('/api/v1/venues/test-venue/customers/segments')
        .expect(200);

      expect(segmentationResponse.body.vip.count).toBeGreaterThanOrEqual(1);

      // 6. Test GDPR data export
      const gdprExport = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customerId}/gdpr-data`)
        .expect(200);

      expect(gdprExport.body.personal_data.customer_id).toBe(customerId);
      expect(gdprExport.body.identities).toHaveLength(3);
      expect(gdprExport.body.consent_history).toHaveLength(2);
      expect(gdprExport.body.order_history).toHaveLength(2);

      // 7. Test consent withdrawal
      const consentWithdrawal = await request(app.getHttpServer())
        .patch(`/api/v1/venues/test-venue/customers/${customerId}/consents/marketing`)
        .send({
          status: 'withdrawn',
          withdrawal_reason: 'Customer request'
        })
        .expect(200);

      expect(consentWithdrawal.body.status).toBe('withdrawn');

      // 8. Test data deletion request
      const deletionRequest = await request(app.getHttpServer())
        .post(`/api/v1/venues/test-venue/customers/${customerId}/request-deletion`)
        .send({
          reason: 'Customer requested account closure'
        })
        .expect(200);

      expect(deletionRequest.body.gdpr_data_deletion_requested).toBe(true);
      expect(deletionRequest.body.gdpr_deletion_scheduled_date).toBeDefined();
    });

    it('should prevent duplicate customer identities', async () => {
      // Create first customer with email
      const firstCustomer = {
        first_name: 'Mario',
        last_name: 'Bianchi',
        identities: [
          {
            identity_type: 'email',
            identity_value: 'unique@email.com',
            is_primary: true
          }
        ]
      };

      await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send(firstCustomer)
        .expect(201);

      // Try to create second customer with same email
      const duplicateCustomer = {
        first_name: 'Luigi',
        last_name: 'Verdi',
        identities: [
          {
            identity_type: 'email',
            identity_value: 'unique@email.com',
            is_primary: true
          }
        ]
      };

      await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send(duplicateCustomer)
        .expect(409); // Conflict
    });

    it('should handle customer merging', async () => {
      // Create two customers that are actually the same person
      const customer1Response = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send({
          first_name: 'Giovanni',
          last_name: 'Rossi',
          identities: [{ identity_type: 'email', identity_value: 'giovanni@email.com' }]
        })
        .expect(201);

      const customer2Response = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send({
          first_name: 'Giovanni',
          last_name: 'Rossi',
          identities: [{ identity_type: 'phone', identity_value: '+39987654321' }]
        })
        .expect(201);

      // Merge customers
      const mergeResponse = await request(app.getHttpServer())
        .post(`/api/v1/venues/test-venue/customers/${customer1Response.body.id}/merge`)
        .send({
          merge_with_customer_id: customer2Response.body.id,
          keep_primary_customer: true
        })
        .expect(200);

      // Verify merged customer has both identities
      const mergedCustomer = await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customer1Response.body.id}`)
        .expect(200);

      expect(mergedCustomer.body.identities).toHaveLength(2);
      expect(mergedCustomer.body.identities.some(i => i.identity_type === 'email')).toBe(true);
      expect(mergedCustomer.body.identities.some(i => i.identity_type === 'phone')).toBe(true);

      // Verify second customer is marked as merged
      await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customer2Response.body.id}`)
        .expect(404); // Should be soft-deleted/merged
    });
  });
});
```

---

## 4. Provider System Tests

### 4.1 Provider Management Tests
```typescript
// src/providers/providers.service.spec.ts
describe('ProvidersService', () => {
  let service: ProvidersService;
  let providerRepository: Repository<Provider>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProvidersService,
        {
          provide: getRepositoryToken(Provider),
          useClass: Repository,
        },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
    providerRepository = module.get<Repository<Provider>>(getRepositoryToken(Provider));
  });

  describe('createProvider', () => {
    it('should create provider with encrypted configuration', async () => {
      const createProviderDto = {
        provider_type: ProviderType.EMAIL,
        provider_name: 'sendgrid',
        display_name: 'SendGrid Email Service',
        config_encrypted: {
          api_key: 'SG.test-api-key',
          from_email: 'noreply@beerflow.com'
        },
        cost_per_unit: 0.001,
        rate_limits: {
          requests_per_minute: 100
        }
      };

      const mockProvider = {
        id: 'provider-123',
        ...createProviderDto,
        health_status: 'healthy'
      } as Provider;

      jest.spyOn(providerRepository, 'create').mockReturnValue(mockProvider);
      jest.spyOn(providerRepository, 'save').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'encryptConfiguration').mockReturnValue({
        encrypted: 'encrypted-config-data'
      });

      const result = await service.createProvider('venue-123', createProviderDto);

      expect(result.provider_name).toBe('sendgrid');
      expect(service['encryptConfiguration']).toHaveBeenCalledWith(createProviderDto.config_encrypted);
    });

    it('should validate provider configuration schema', async () => {
      const invalidConfigDto = {
        provider_type: ProviderType.EMAIL,
        provider_name: 'sendgrid',
        config_encrypted: {
          // Missing required api_key
          from_email: 'test@example.com'
        }
      };

      jest.spyOn(service as any, 'validateProviderConfig').mockImplementation(() => {
        throw new Error('Missing required field: api_key');
      });

      await expect(service.createProvider('venue-123', invalidConfigDto))
        .rejects.toThrow('Missing required field: api_key');
    });
  });

  describe('Provider Health Monitoring', () => {
    it('should check provider health correctly', async () => {
      const mockProvider = {
        id: 'provider-health',
        provider_type: ProviderType.EMAIL,
        provider_name: 'sendgrid',
        config_encrypted: { api_key: 'test-key' },
        health_status: 'healthy'
      } as Provider;

      jest.spyOn(providerRepository, 'findOne').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'testProviderConnectivity').mockResolvedValue({
        healthy: true,
        response_time: 150,
        test_timestamp: new Date()
      });

      const healthResult = await service.checkProviderHealth('provider-health');

      expect(healthResult.healthy).toBe(true);
      expect(healthResult.response_time).toBe(150);
    });

    it('should handle provider health check failures', async () => {
      const mockProvider = {
        id: 'provider-fail',
        provider_type: ProviderType.SMS,
        provider_name: 'twilio',
        health_status: 'healthy'
      } as Provider;

      jest.spyOn(providerRepository, 'findOne').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'testProviderConnectivity').mockRejectedValue(
        new Error('Connection timeout')
      );
      jest.spyOn(providerRepository, 'update').mockResolvedValue(undefined);

      const healthResult = await service.checkProviderHealth('provider-fail');

      expect(healthResult.healthy).toBe(false);
      expect(healthResult.error).toBe('Connection timeout');
      expect(providerRepository.update).toHaveBeenCalledWith('provider-fail', {
        health_status: 'failed',
        last_health_check: expect.any(Date)
      });
    });

    it('should implement provider failover logic', async () => {
      const primaryProvider = {
        id: 'primary',
        provider_type: ProviderType.OCR,
        provider_name: 'google_vision',
        priority: 100,
        health_status: 'failed'
      } as Provider;

      const secondaryProvider = {
        id: 'secondary',
        provider_type: ProviderType.OCR,
        provider_name: 'tesseract',
        priority: 90,
        health_status: 'healthy'
      } as Provider;

      jest.spyOn(providerRepository, 'find').mockResolvedValue([primaryProvider, secondaryProvider]);

      const availableProvider = await service.getAvailableProvider(
        'venue-123',
        ProviderType.OCR
      );

      expect(availableProvider.id).toBe('secondary');
      expect(availableProvider.provider_name).toBe('tesseract');
    });
  });

  describe('Provider Cost Tracking', () => {
    it('should track provider usage costs', async () => {
      const mockProvider = {
        id: 'provider-cost',
        cost_per_unit: 0.001,
        cost_currency: 'EUR'
      } as Provider;

      jest.spyOn(providerRepository, 'findOne').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'recordProviderUsage').mockResolvedValue(undefined);

      await service.trackProviderUsage('provider-cost', {
        operation_type: 'sms_send',
        units_consumed: 5,
        timestamp: new Date()
      });

      expect(service['recordProviderUsage']).toHaveBeenCalledWith('provider-cost', {
        operation_type: 'sms_send',
        units_consumed: 5,
        cost: 0.005, // 5 * 0.001
        currency: 'EUR',
        timestamp: expect.any(Date)
      });
    });

    it('should enforce cost limits', async () => {
      const mockProvider = {
        id: 'provider-limit',
        cost_per_unit: 0.01,
        cost_limits: {
          daily_limit: 10.00,
          monthly_limit: 100.00
        }
      } as Provider;

      jest.spyOn(providerRepository, 'findOne').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'getCurrentUsageCosts').mockResolvedValue({
        daily_cost: 9.50,
        monthly_cost: 85.00
      });

      // This should succeed (within limits)
      const canUse = await service.checkCostLimits('provider-limit', 50); // 50 * 0.01 = 0.50
      expect(canUse).toBe(true);

      // This should fail (exceeds daily limit)
      const cannotUse = await service.checkCostLimits('provider-limit', 100); // 100 * 0.01 = 1.00 (total 10.50)
      expect(cannotUse).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce provider rate limits', async () => {
      const mockProvider = {
        id: 'provider-rate',
        rate_limits: {
          requests_per_minute: 10,
          requests_per_hour: 100
        }
      } as Provider;

      jest.spyOn(providerRepository, 'findOne').mockResolvedValue(mockProvider);
      jest.spyOn(service as any, 'getCurrentRequestCounts').mockResolvedValue({
        requests_last_minute: 8,
        requests_last_hour: 45
      });

      // Should allow request (within limits)
      const canMakeRequest = await service.checkRateLimits('provider-rate');
      expect(canMakeRequest.allowed).toBe(true);

      // Simulate rate limit exceeded
      jest.spyOn(service as any, 'getCurrentRequestCounts').mockResolvedValue({
        requests_last_minute: 12,
        requests_last_hour: 105
      });

      const rateLimited = await service.checkRateLimits('provider-rate');
      expect(rateLimited.allowed).toBe(false);
      expect(rateLimited.reason).toContain('minute');
    });
  });
});
```

---

## 5. Performance Tests Phase 5

### 5.1 Document Processing Performance
```typescript
// test/performance/document-processing.performance.spec.ts
describe('Document Processing Performance Tests', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Setup test app
  });

  describe('OCR Processing Performance', () => {
    it('should process single document within performance thresholds', async () => {
      const testDocument = Buffer.from(createTestInvoicePDF());
      
      const start = Date.now();
      
      const uploadResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/documents/upload')
        .attach('file', testDocument, 'performance-test.pdf')
        .expect(201);

      const uploadTime = Date.now() - start;
      expect(uploadTime).toBeLessThan(5000); // < 5s upload

      const documentId = uploadResponse.body.id;
      
      // Wait for OCR completion and measure time
      const ocrStart = Date.now();
      await waitForOCRCompletion(app, documentId);
      const ocrTime = Date.now() - ocrStart;
      
      expect(ocrTime).toBeLessThan(10000); // < 10s OCR processing

      // Check parsing time
      const parsingStart = Date.now();
      await waitForParsingCompletion(app, documentId);
      const parsingTime = Date.now() - parsingStart;
      
      expect(parsingTime).toBeLessThan(2000); // < 2s parsing
    });

    it('should handle concurrent document processing', async () => {
      const documentCount = 10;
      const testDocuments = Array(documentCount).fill(0).map((_, i) => ({
        buffer: Buffer.from(createTestInvoicePDF()),
        filename: `concurrent-test-${i}.pdf`
      }));

      const start = Date.now();
      
      // Upload all documents concurrently
      const uploadPromises = testDocuments.map(doc =>
        request(app.getHttpServer())
          .post('/api/v1/venues/test-venue/documents/upload')
          .attach('file', doc.buffer, doc.filename)
          .expect(201)
      );

      const uploadResponses = await Promise.all(uploadPromises);
      const uploadTime = Date.now() - start;
      
      expect(uploadTime).toBeLessThan(15000); // < 15s for 10 concurrent uploads

      // Wait for all OCR processing to complete
      const ocrStart = Date.now();
      const ocrPromises = uploadResponses.map(response =>
        waitForOCRCompletion(app, response.body.id)
      );

      await Promise.all(ocrPromises);
      const ocrTime = Date.now() - ocrStart;
      
      expect(ocrTime).toBeLessThan(30000); // < 30s for 10 concurrent OCR operations
    });

    it('should maintain performance under load', async () => {
      const loadTestDuration = 60000; // 1 minute
      const targetThroughput = 5; // documents per minute
      
      const startTime = Date.now();
      const processedDocuments: string[] = [];
      
      while (Date.now() - startTime < loadTestDuration) {
        const testDoc = Buffer.from(createTestInvoicePDF());
        
        try {
          const uploadResponse = await request(app.getHttpServer())
            .post('/api/v1/venues/test-venue/documents/upload')
            .attach('file', testDoc, `load-test-${Date.now()}.pdf`)
            .timeout(10000)
            .expect(201);
          
          processedDocuments.push(uploadResponse.body.id);
          
          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 5000));
        } catch (error) {
          console.warn('Document upload failed during load test:', error.message);
        }
      }
      
      expect(processedDocuments.length).toBeGreaterThanOrEqual(targetThroughput);
    });
  });

  describe('Customer Operations Performance', () => {
    it('should handle customer CRUD operations within thresholds', async () => {
      const customerData = {
        first_name: 'Performance',
        last_name: 'Test',
        identities: [
          { identity_type: 'email', identity_value: 'perf@test.com' }
        ]
      };

      // Test customer creation
      const createStart = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/customers')
        .send(customerData)
        .expect(201);
      const createTime = Date.now() - createStart;
      
      expect(createTime).toBeLessThan(200); // < 200ms

      const customerId = createResponse.body.id;

      // Test customer retrieval
      const readStart = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customerId}`)
        .expect(200);
      const readTime = Date.now() - readStart;
      
      expect(readTime).toBeLessThan(100); // < 100ms

      // Test customer update
      const updateStart = Date.now();
      await request(app.getHttpServer())
        .patch(`/api/v1/venues/test-venue/customers/${customerId}`)
        .send({ first_name: 'Updated' })
        .expect(200);
      const updateTime = Date.now() - updateStart;
      
      expect(updateTime).toBeLessThan(150); // < 150ms

      // Test GDPR data export
      const exportStart = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/customers/${customerId}/gdpr-data`)
        .expect(200);
      const exportTime = Date.now() - exportStart;
      
      expect(exportTime).toBeLessThan(2000); // < 2s for GDPR export
    });

    it('should handle high-volume customer operations', async () => {
      const customerCount = 100;
      const customers = Array(customerCount).fill(0).map((_, i) => ({
        first_name: `Customer${i}`,
        last_name: 'Load Test',
        identities: [
          { identity_type: 'email', identity_value: `customer${i}@loadtest.com` }
        ]
      }));

      const start = Date.now();
      
      // Create customers concurrently (in batches to avoid overwhelming)
      const batchSize = 10;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const batchPromises = batch.map(customer =>
          request(app.getHttpServer())
            .post('/api/v1/venues/test-venue/customers')
            .send(customer)
            .expect(201)
        );
        
        await Promise.all(batchPromises);
      }
      
      const totalTime = Date.now() - start;
      const averageTime = totalTime / customerCount;
      
      expect(averageTime).toBeLessThan(300); // < 300ms average per customer
      expect(totalTime).toBeLessThan(30000); // < 30s total for 100 customers
    });
  });

  describe('Provider System Performance', () => {
    it('should handle provider operations efficiently', async () => {
      const providerConfig = {
        provider_type: 'email',
        provider_name: 'performance-test',
        display_name: 'Performance Test Provider',
        config_encrypted: {
          api_key: 'test-key',
          from_email: 'test@beerflow.com'
        }
      };

      // Test provider creation
      const createStart = Date.now();
      const createResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/providers')
        .send(providerConfig)
        .expect(201);
      const createTime = Date.now() - createStart;
      
      expect(createTime).toBeLessThan(500); // < 500ms

      const providerId = createResponse.body.id;

      // Test provider health check
      const healthStart = Date.now();
      await request(app.getHttpServer())
        .get(`/api/v1/venues/test-venue/providers/${providerId}/health`)
        .expect(200);
      const healthTime = Date.now() - healthStart;
      
      expect(healthTime).toBeLessThan(1000); // < 1s for health check
    });

    it('should handle provider failover quickly', async () => {
      // Disable primary provider
      const disableStart = Date.now();
      await request(app.getHttpServer())
        .patch('/api/v1/venues/test-venue/providers/primary-provider')
        .send({ status: 'maintenance' })
        .expect(200);
      
      // Request service (should failover to secondary)
      const serviceResponse = await request(app.getHttpServer())
        .post('/api/v1/venues/test-venue/test-service')
        .send({ provider_type: 'email' })
        .expect(200);
      
      const failoverTime = Date.now() - disableStart;
      
      expect(failoverTime).toBeLessThan(2000); // < 2s for failover
      expect(serviceResponse.body.provider_used).not.toBe('primary-provider');
    });
  });
});
```

---

## 6. Criteri di Completamento Phase 5

### Business Logic Validation Requirements:
1. **Document Intelligence**: OCR accuracy >= 85%, parsing accuracy >= 90% per documenti italiani
2. **Customer Management**: GDPR compliance 100%, customer data integrity verificata
3. **Provider System**: Failover < 2s, health monitoring accuracy >= 95%
4. **Integration**: Document → Inventory automation 100% funzionante
5. **Performance**: Tutti i benchmark rispettati secondo thresholds definiti

### Test Coverage Requirements:
- **Unit Tests**: >= 95% coverage per business logic critica
- **Integration Tests**: Complete workflow end-to-end validation
- **Performance Tests**: Load testing con volumi realistici
- **Security Tests**: GDPR compliance e data protection verification
- **Provider Tests**: Multi-provider failover e cost tracking validation

### Automated Testing Pipeline:
```bash
# Complete Phase 5 testing suite
npm run test:phase5:unit           # Unit tests con coverage report
npm run test:phase5:integration    # Integration workflow tests
npm run test:phase5:performance    # Performance benchmarks
npm run test:phase5:security       # Security e GDPR compliance
npm run test:phase5:providers      # Provider system validation
npm run test:phase5:all            # Complete test suite
```

### Critical Business Scenarios:
- **Document Processing**: Invoice DDT → OCR → Parsing → Inventory Load
- **Customer Journey**: Registration → Consent → Orders → Analytics → GDPR Export
- **Provider Failover**: Primary failure → Secondary activation → Service continuity
- **GDPR Compliance**: Data export → Consent withdrawal → Data deletion
- **Performance Load**: 50+ concurrent documents, 100+ customers simultanei

La Fase 5 è completa quando tutti i test passano al 100%, business logic è validata end-to-end, performance benchmarks rispettati e compliance GDPR certificata con audit trail immutabile.
