# FASE 5 - IMPLEMENTAZIONE DOCUMENT INTELLIGENCE, CRM & PROVIDER SYSTEM

## Obiettivo Fase
Implementare il sistema completo di Document Intelligence con OCR pipeline, Customer Relationship Management (CRM) con compliance GDPR e Provider System intercambiabile per servizi esterni, completando l'ecosistema BeerFlow con automazione documentale avanzata e gestione clienti integrata.

## Prerequisiti Verificati
- Fase 1: Core Backend con autenticazione funzionante
- Fase 2: Product & Inventory Management operativo
- Fase 3: Order Management & POS System operativo  
- Fase 4: Employee Portal & HACCP Compliance operativo
- Database con schema completo e storage configurato per file upload
- Provider system configuration pronto per integrazione servizi esterni

## Architettura Moduli Fase 5
- **Documents**: Document upload, OCR processing, human review workflow
- **OCR Workers**: Multi-provider OCR processing con fallback automatico
- **Customers**: CRM completo con GDPR compliance
- **Customer Consents**: Gestione consensi granulare per privacy
- **Providers**: Sistema intercambiabile per servizi esterni
- **Document Templates**: Template recognition per DDT, fatture, preventivi
- **Integration Engine**: Automatic inventory loading da documenti processati

---

## 1. Nuove Dipendenze Richieste

### 1.1 Installazione Dipendenze OCR e Document Processing
```bash
cd backend

# File upload e processing
npm install @nestjs/platform-express multer @types/multer
npm install sharp @types/sharp  # Image processing
npm install pdf-parse pdf2pic    # PDF processing

# OCR providers
npm install tesseract.js @google-cloud/vision aws-sdk
npm install @types/tesseract.js

# Document parsing e ML
npm install natural compromise date-fns
npm install fuse.js @types/fuse.js  # Fuzzy search

# Queue processing per OCR
npm install @nestjs/bull bull @types/bull

# File storage
npm install @aws-sdk/client-s3 @aws-sdk/lib-storage
npm install minio @types/minio  # S3-compatible storage

# GDPR compliance utilities
npm install crypto-js @types/crypto-js
npm install uuid-validate

# Provider integrations
npm install stripe @stripe/stripe-js
npm install twilio @types/twilio
npm install @sendgrid/mail
npm install paypal-rest-sdk @types/paypal-rest-sdk

# Dev dependencies
npm install -D @types/sharp @types/pdf-parse @types/natural
```

### 1.2 Python OCR Worker Setup
```bash
# Python dependencies for advanced OCR
cd workers
python -m venv ocr-env
source ocr-env/bin/activate  # Linux/Mac
# ocr-env\Scripts\activate   # Windows

pip install opencv-python pytesseract pillow
pip install google-cloud-vision boto3 azure-cognitiveservices-vision-computervision
pip install numpy pandas python-dateutil
pip install flask redis celery
pip install python-dotenv pyyaml
```

---

## 2. Entità Database Documents & CRM

### 2.1 Document Entity (src/database/entities/document.entity.ts)
```typescript
import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { User } from './user.entity';
import { DocumentLine } from './document-line.entity';
import { DocumentType } from '../enums/document-type.enum';
import { DocumentStatus } from '../enums/document-status.enum';
import { ProcessingStatus } from '../enums/processing-status.enum';

@Entity('documents')
export class Document extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'uuid' })
  uploaded_by: string;

  @Column({ type: 'varchar', length: 255 })
  original_filename: string;

  @Column({ type: 'varchar', length: 500 })
  file_path: string; // S3 or local path

  @Column({ type: 'varchar', length: 100 })
  file_type: string; // PDF, JPG, PNG, etc.

  @Column({ type: 'bigint' })
  file_size: number; // bytes

  @Column({ 
    type: 'enum', 
    enum: DocumentType, 
    default: DocumentType.UNKNOWN 
  })
  document_type: DocumentType;

  @Column({ 
    type: 'enum', 
    enum: DocumentStatus, 
    default: DocumentStatus.UPLOADED 
  })
  status: DocumentStatus;

  @Column({ 
    type: 'enum', 
    enum: ProcessingStatus, 
    default: ProcessingStatus.PENDING 
  })
  processing_status: ProcessingStatus;

  @Column({ type: 'text', nullable: true })
  ocr_text: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  confidence_score: number; // 0-100

  @Column({ type: 'jsonb', default: '{}' })
  ocr_metadata: Record<string, any>; // Provider info, processing details

  @Column({ type: 'jsonb', default: '{}' })
  extracted_data: Record<string, any>; // Parsed invoice data, supplier info, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  supplier_name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  document_number: string; // Invoice number, DDT number, etc.

  @Column({ type: 'date', nullable: true })
  document_date: Date;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  total_amount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  currency: string;

  @Column({ type: 'uuid', nullable: true })
  reviewed_by: string; // User who reviewed OCR results

  @Column({ type: 'timestamptz', nullable: true })
  reviewed_at: Date;

  @Column({ type: 'text', nullable: true })
  review_notes: string;

  @Column({ type: 'boolean', default: false })
  inventory_applied: boolean; // If extracted items were applied to inventory

  @Column({ type: 'timestamptz', nullable: true })
  inventory_applied_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  processing_errors: Record<string, any>; // OCR errors, parsing issues

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'reviewed_by' })
  reviewer: User;

  @OneToMany(() => DocumentLine, line => line.document)
  lines: DocumentLine[];
}
```

### 2.2 DocumentLine Entity (src/database/entities/document-line.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Document } from './document.entity';
import { Product } from './product.entity';

@Entity('document_lines')
export class DocumentLine extends BaseEntity {
  @Column({ type: 'uuid' })
  document_id: string;

  @Column({ type: 'integer' })
  line_number: number;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 3, nullable: true })
  quantity: number;

  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  unit_price: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  total_price: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  product_code: string; // Supplier product code

  @Column({ type: 'uuid', nullable: true })
  matched_product_id: string; // Matched to existing product

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  match_confidence: number; // Confidence of product matching

  @Column({ type: 'boolean', default: false })
  reviewed: boolean;

  @Column({ type: 'boolean', default: false })
  applied_to_inventory: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  extraction_metadata: Record<string, any>; // OCR coordinates, confidence per field

  // Relations
  @ManyToOne(() => Document, document => document.lines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'matched_product_id' })
  matchedProduct: Product;
}
```

### 2.3 Customer Entity (src/database/entities/customer.entity.ts)
```typescript
import { Entity, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { CustomerIdentity } from './customer-identity.entity';
import { CustomerConsent } from './customer-consent.entity';
import { Order } from './order.entity';
import { CustomerStatus } from '../enums/customer-status.enum';
import { CustomerTier } from '../enums/customer-tier.enum';

@Entity('customers')
export class Customer extends BaseEntity {
  @Column({ type: 'uuid' })
  venue_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  first_name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  last_name: string;

  @Column({ type: 'date', nullable: true })
  date_of_birth: Date;

  @Column({ type: 'varchar', length: 10, nullable: true })
  gender: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  city: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  postal_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  country: string;

  @Column({ 
    type: 'enum', 
    enum: CustomerStatus, 
    default: CustomerStatus.ACTIVE 
  })
  status: CustomerStatus;

  @Column({ 
    type: 'enum', 
    enum: CustomerTier, 
    default: CustomerTier.REGULAR 
  })
  tier: CustomerTier; // REGULAR, VIP, PREMIUM

  @Column({ type: 'integer', default: 0 })
  total_visits: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  total_spent: number;

  @Column({ type: 'decimal', precision: 12, scale: 4, default: 0 })
  lifetime_value: number;

  @Column({ type: 'timestamptz', nullable: true })
  first_visit_date: Date;

  @Column({ type: 'timestamptz', nullable: true })
  last_visit_date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  preferred_language: string;

  @Column({ type: 'jsonb', default: '{}' })
  preferences: Record<string, any>; // Food preferences, allergies, etc.

  @Column({ type: 'jsonb', default: '{}' })
  tags: string[]; // Custom tags for segmentation

  @Column({ type: 'text', nullable: true })
  notes: string; // Staff notes about customer

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  gdpr_consent_date: Date;

  @Column({ type: 'boolean', default: false })
  gdpr_data_deletion_requested: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  gdpr_deletion_scheduled_date: Date;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => CustomerIdentity, identity => identity.customer)
  identities: CustomerIdentity[];

  @OneToMany(() => CustomerConsent, consent => consent.customer)
  consents: CustomerConsent[];

  @OneToMany(() => Order, order => order.customer)
  orders: Order[];
}
```

### 2.4 CustomerIdentity Entity (src/database/entities/customer-identity.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { IdentityType } from '../enums/identity-type.enum';

@Entity('customer_identities')
@Index(['identity_type', 'identity_value'], { unique: true })
export class CustomerIdentity extends BaseEntity {
  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ 
    type: 'enum', 
    enum: IdentityType 
  })
  identity_type: IdentityType; // EMAIL, PHONE, SOCIAL, LOYALTY_CARD

  @Column({ type: 'varchar', length: 255 })
  identity_value: string; // The actual email, phone, etc.

  @Column({ type: 'boolean', default: false })
  is_primary: boolean;

  @Column({ type: 'boolean', default: false })
  is_verified: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  verified_at: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  verification_method: string; // email_link, sms_code, etc.

  @Column({ type: 'timestamptz', nullable: true })
  last_used_at: Date;

  @Column({ type: 'jsonb', default: '{}' })
  metadata: Record<string, any>; // Social profile data, loyalty card details, etc.

  // Relations
  @ManyToOne(() => Customer, customer => customer.identities, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
```

### 2.5 CustomerConsent Entity (src/database/entities/customer-consent.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Customer } from './customer.entity';
import { ConsentType } from '../enums/consent-type.enum';
import { ConsentStatus } from '../enums/consent-status.enum';

@Entity('customer_consents')
export class CustomerConsent extends BaseEntity {
  @Column({ type: 'uuid' })
  customer_id: string;

  @Column({ 
    type: 'enum', 
    enum: ConsentType 
  })
  consent_type: ConsentType; // MARKETING, ANALYTICS, PREFERENCES, ESSENTIAL

  @Column({ 
    type: 'enum', 
    enum: ConsentStatus,
    default: ConsentStatus.PENDING
  })
  status: ConsentStatus; // GRANTED, DENIED, WITHDRAWN, PENDING

  @Column({ type: 'varchar', length: 100 })
  purpose: string; // Specific purpose for data processing

  @Column({ type: 'varchar', length: 100 })
  legal_basis: string; // GDPR legal basis

  @Column({ type: 'timestamptz' })
  granted_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  withdrawn_at: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expires_at: Date;

  @Column({ type: 'varchar', length: 100 })
  collection_method: string; // website_form, in_person, phone, etc.

  @Column({ type: 'varchar', length: 255, nullable: true })
  collection_source: string; // URL, staff member, etc.

  @Column({ type: 'varchar', length: 50 })
  consent_version: string; // Version of consent text

  @Column({ type: 'jsonb', default: '{}' })
  consent_metadata: Record<string, any>; // IP address, user agent, etc.

  // Relations
  @ManyToOne(() => Customer, customer => customer.consents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
```

### 2.6 Provider Entity (src/database/entities/provider.entity.ts)
```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Venue } from './venue.entity';
import { ProviderType } from '../enums/provider-type.enum';
import { ProviderStatus } from '../enums/provider-status.enum';

@Entity('providers')
export class Provider extends BaseEntity {
  @Column({ type: 'uuid', nullable: true })
  venue_id: string; // null for global providers

  @Column({ 
    type: 'enum', 
    enum: ProviderType 
  })
  provider_type: ProviderType; // SMS, EMAIL, PAYMENT, OCR

  @Column({ type: 'varchar', length: 100 })
  provider_name: string; // twilio, sendgrid, stripe, google_vision, etc.

  @Column({ type: 'varchar', length: 255 })
  display_name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'jsonb' })
  config_schema: Record<string, any>; // JSON schema for configuration

  @Column({ type: 'jsonb' })
  config_encrypted: Record<string, any>; // Encrypted configuration

  @Column({ 
    type: 'enum', 
    enum: ProviderStatus,
    default: ProviderStatus.INACTIVE
  })
  status: ProviderStatus;

  @Column({ type: 'integer', default: 0 })
  priority: number; // Higher number = higher priority

  @Column({ type: 'decimal', precision: 10, scale: 6, default: 0 })
  cost_per_unit: number; // Cost per SMS, email, OCR operation, etc.

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  cost_currency: string;

  @Column({ type: 'jsonb', default: '{}' })
  cost_limits: {
    daily_limit?: number;
    monthly_limit?: number;
    transaction_limit?: number;
  };

  @Column({ type: 'jsonb', default: '{}' })
  rate_limits: {
    requests_per_second?: number;
    requests_per_minute?: number;
    requests_per_hour?: number;
  };

  @Column({ type: 'varchar', length: 50, default: 'healthy' })
  health_status: 'healthy' | 'degraded' | 'failed';

  @Column({ type: 'timestamptz', nullable: true })
  last_health_check: Date;

  @Column({ type: 'jsonb', default: '{}' })
  health_metrics: Record<string, any>; // Response times, success rates, etc.

  @Column({ type: 'boolean', default: true })
  active: boolean;

  // Relations
  @ManyToOne(() => Venue)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;
}
```

---

## 3. Enums Definition

### 3.1 Document Enums (src/database/enums/)

```typescript
// document-type.enum.ts
export enum DocumentType {
  UNKNOWN = 'unknown',
  INVOICE = 'invoice',
  DDT = 'ddt',
  RECEIPT = 'receipt',
  PURCHASE_ORDER = 'purchase_order',
  QUOTE = 'quote',
  DELIVERY_NOTE = 'delivery_note',
  CREDIT_NOTE = 'credit_note',
  CONTRACT = 'contract',
  CERTIFICATE = 'certificate',
  OTHER = 'other'
}

// document-status.enum.ts
export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  REVIEW_REQUIRED = 'review_required',
  REVIEWED = 'reviewed',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPLIED = 'applied',
  ARCHIVED = 'archived'
}

// processing-status.enum.ts
export enum ProcessingStatus {
  PENDING = 'pending',
  OCR_IN_PROGRESS = 'ocr_in_progress',
  OCR_COMPLETED = 'ocr_completed',
  OCR_FAILED = 'ocr_failed',
  PARSING_IN_PROGRESS = 'parsing_in_progress',
  PARSING_COMPLETED = 'parsing_completed',
  PARSING_FAILED = 'parsing_failed',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### 3.2 Customer & Provider Enums

```typescript
// customer-status.enum.ts
export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BLACKLISTED = 'blacklisted'
}

// customer-tier.enum.ts
export enum CustomerTier {
  REGULAR = 'regular',
  VIP = 'vip',
  PREMIUM = 'premium',
  GOLD = 'gold',
  PLATINUM = 'platinum'
}

// identity-type.enum.ts
export enum IdentityType {
  EMAIL = 'email',
  PHONE = 'phone',
  SOCIAL_FACEBOOK = 'social_facebook',
  SOCIAL_GOOGLE = 'social_google',
  SOCIAL_INSTAGRAM = 'social_instagram',
  LOYALTY_CARD = 'loyalty_card',
  MEMBERSHIP_ID = 'membership_id'
}

// consent-type.enum.ts
export enum ConsentType {
  ESSENTIAL = 'essential',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PREFERENCES = 'preferences',
  COMMUNICATION = 'communication'
}

// consent-status.enum.ts
export enum ConsentStatus {
  PENDING = 'pending',
  GRANTED = 'granted',
  DENIED = 'denied',
  WITHDRAWN = 'withdrawn',
  EXPIRED = 'expired'
}

// provider-type.enum.ts
export enum ProviderType {
  SMS = 'sms',
  EMAIL = 'email',
  PAYMENT = 'payment',
  OCR = 'ocr',
  STORAGE = 'storage',
  ANALYTICS = 'analytics'
}

// provider-status.enum.ts
export enum ProviderStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  TESTING = 'testing',
  MAINTENANCE = 'maintenance',
  DEPRECATED = 'deprecated'
}
```

---

## 4. Services Implementation Core

### 4.1 OCR Service (src/documents/ocr.service.ts)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Provider } from '../database/entities/provider.entity';
import { Document } from '../database/entities/document.entity';
import { ProviderType, ProviderStatus } from '../database/enums';
import { ProcessingStatus } from '../database/enums/processing-status.enum';

export interface OCRResult {
  text: string;
  confidence: number;
  metadata: Record<string, any>;
  provider: string;
  processingTime: number;
}

@Injectable()
export class OCRService {
  private readonly logger = new Logger(OCRService.name);

  constructor(
    @InjectRepository(Provider)
    private providerRepository: Repository<Provider>,
    @InjectRepository(Document)
    private documentRepository: Repository<Document>
  ) {}

  async processDocument(documentId: string): Promise<OCRResult> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId },
      relations: ['venue']
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Update processing status
    await this.documentRepository.update(documentId, {
      processing_status: ProcessingStatus.OCR_IN_PROGRESS
    });

    try {
      // Get available OCR providers in priority order
      const providers = await this.getAvailableOCRProviders(document.venue_id);
      
      let result: OCRResult | null = null;
      let lastError: Error | null = null;

      // Try providers in order until one succeeds
      for (const provider of providers) {
        try {
          this.logger.log(`Attempting OCR with provider: ${provider.provider_name}`);
          result = await this.processWithProvider(document, provider);
          
          if (result.confidence >= 60) { // Minimum acceptable confidence
            break;
          } else {
            this.logger.warn(`Low confidence (${result.confidence}%) from ${provider.provider_name}, trying next provider`);
          }
        } catch (error) {
          lastError = error;
          this.logger.error(`OCR failed with provider ${provider.provider_name}: ${error.message}`);
          await this.updateProviderHealth(provider.id, false);
          continue;
        }
      }

      if (!result) {
        throw lastError || new Error('All OCR providers failed');
      }

      // Update document with OCR results
      await this.documentRepository.update(documentId, {
        ocr_text: result.text,
        confidence_score: result.confidence,
        ocr_metadata: result.metadata,
        processing_status: ProcessingStatus.OCR_COMPLETED
      });

      return result;
    } catch (error) {
      await this.documentRepository.update(documentId, {
        processing_status: ProcessingStatus.OCR_FAILED,
        processing_errors: { ocr_error: error.message }
      });
      throw error;
    }
  }

  private async getAvailableOCRProviders(venueId: string): Promise<Provider[]> {
    return await this.providerRepository.find({
      where: [
        { venue_id: venueId, provider_type: ProviderType.OCR, status: ProviderStatus.ACTIVE },
        { venue_id: null, provider_type: ProviderType.OCR, status: ProviderStatus.ACTIVE } // Global providers
      ],
      order: { priority: 'DESC' }
    });
  }

  private async processWithProvider(document: Document, provider: Provider): Promise<OCRResult> {
    const startTime = Date.now();

    switch (provider.provider_name) {
      case 'tesseract':
        return await this.processTesseract(document, provider);
      case 'google_vision':
        return await this.processGoogleVision(document, provider);
      case 'aws_textract':
        return await this.processAWSTextract(document, provider);
      default:
        throw new Error(`Unknown OCR provider: ${provider.provider_name}`);
    }
  }

  private async processTesseract(document: Document, provider: Provider): Promise<OCRResult> {
    // Implementation for Tesseract OCR
    // This would integrate with the Python worker or use tesseract.js
    const startTime = Date.now();
    
    try {
      // Call Python OCR worker or tesseract.js
      const ocrResult = await this.callPythonOCRWorker(document.file_path, 'tesseract');
      
      return {
        text: ocrResult.text,
        confidence: ocrResult.confidence || 75,
        metadata: {
          provider: 'tesseract',
          version: ocrResult.version,
          language: ocrResult.language || 'ita',
          processingTime: Date.now() - startTime
        },
        provider: 'tesseract',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Tesseract OCR failed: ${error.message}`);
    }
  }

  private async processGoogleVision(document: Document, provider: Provider): Promise<OCRResult> {
    // Implementation for Google Cloud Vision API
    const startTime = Date.now();
    
    try {
      const vision = require('@google-cloud/vision');
      const client = new vision.ImageAnnotatorClient({
        keyFilename: provider.config_encrypted.keyFilename,
        projectId: provider.config_encrypted.projectId
      });

      const [result] = await client.textDetection(document.file_path);
      const detections = result.textAnnotations;
      
      if (!detections || detections.length === 0) {
        throw new Error('No text detected');
      }

      const fullText = detections[0].description;
      const confidence = this.calculateGoogleVisionConfidence(detections);

      return {
        text: fullText,
        confidence,
        metadata: {
          provider: 'google_vision',
          detectionCount: detections.length,
          boundingBoxes: detections.slice(1).map(d => d.boundingPoly),
          processingTime: Date.now() - startTime
        },
        provider: 'google_vision',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`Google Vision OCR failed: ${error.message}`);
    }
  }

  private async processAWSTextract(document: Document, provider: Provider): Promise<OCRResult> {
    // Implementation for AWS Textract
    const startTime = Date.now();
    
    try {
      const AWS = require('aws-sdk');
      const textract = new AWS.Textract({
        accessKeyId: provider.config_encrypted.accessKeyId,
        secretAccessKey: provider.config_encrypted.secretAccessKey,
        region: provider.config_encrypted.region || 'us-east-1'
      });

      const params = {
        Document: {
          S3Object: {
            Bucket: provider.config_encrypted.bucket,
            Name: document.file_path
          }
        }
      };

      const result = await textract.detectDocumentText(params).promise();
      const extractedText = result.Blocks
        .filter(block => block.BlockType === 'LINE')
        .map(block => block.Text)
        .join('\n');

      const confidence = this.calculateAWSTextractConfidence(result.Blocks);

      return {
        text: extractedText,
        confidence,
        metadata: {
          provider: 'aws_textract',
          blockCount: result.Blocks.length,
          pages: result.Blocks.filter(b => b.BlockType === 'PAGE').length,
          processingTime: Date.now() - startTime
        },
        provider: 'aws_textract',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      throw new Error(`AWS Textract failed: ${error.message}`);
    }
  }

  private async callPythonOCRWorker(filePath: string, provider: string): Promise<any> {
    // This would make an HTTP request to the Python OCR worker
    // or use a message queue like Redis/Bull
    const response = await fetch('http://localhost:5000/ocr', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        file_path: filePath,
        provider: provider,
        language: 'ita'
      })
    });

    if (!response.ok) {
      throw new Error(`OCR worker error: ${response.statusText}`);
    }

    return await response.json();
  }

  private calculateGoogleVisionConfidence(detections: any[]): number {
    // Calculate average confidence from Google Vision results
    if (detections.length <= 1) return 50;
    
    // Google Vision doesn't provide explicit confidence scores
    // We estimate based on detection quality
    const avgBoundingBoxArea = detections.slice(1).reduce((sum, detection) => {
      const box = detection.boundingPoly.vertices;
      const area = Math.abs((box[2].x - box[0].x) * (box[2].y - box[0].y));
      return sum + area;
    }, 0) / (detections.length - 1);

    // Higher area generally means better detection
    return Math.min(95, Math.max(50, avgBoundingBoxArea / 100));
  }

  private calculateAWSTextractConfidence(blocks: any[]): number {
    const confidenceScores = blocks
      .filter(block => block.Confidence)
      .map(block => block.Confidence);
    
    if (confidenceScores.length === 0) return 50;
    
    return confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
  }

  private async updateProviderHealth(providerId: string, isHealthy: boolean): Promise<void> {
    await this.providerRepository.update(providerId, {
      health_status: isHealthy ? 'healthy' : 'degraded',
      last_health_check: new Date()
    });
  }
}
```

### 4.2 Document Parser Service (src/documents/document-parser.service.ts)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document } from '../database/entities/document.entity';
import { DocumentLine } from '../database/entities/document-line.entity';
import { DocumentType } from '../database/enums/document-type.enum';
import { ProcessingStatus } from '../database/enums/processing-status.enum';
import * as natural from 'natural';

export interface ParsedDocument {
  documentType: DocumentType;
  supplier: {
    name: string;
    vatNumber?: string;
    address?: string;
  };
  documentNumber: string;
  documentDate: Date;
  totalAmount: number;
  currency: string;
  lines: ParsedDocumentLine[];
}

export interface ParsedDocumentLine {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  productCode?: string;
}

@Injectable()
export class DocumentParserService {
  private readonly logger = new Logger(DocumentParserService.name);

  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(DocumentLine)
    private documentLineRepository: Repository<DocumentLine>
  ) {}

  async parseDocument(documentId: string): Promise<ParsedDocument> {
    const document = await this.documentRepository.findOne({
      where: { id: documentId }
    });

    if (!document || !document.ocr_text) {
      throw new Error('Document not found or OCR text not available');
    }

    await this.documentRepository.update(documentId, {
      processing_status: ProcessingStatus.PARSING_IN_PROGRESS
    });

    try {
      const text = document.ocr_text;
      
      // Detect document type
      const documentType = this.detectDocumentType(text);
      
      // Parse based on document type
      let parsedData: ParsedDocument;
      
      switch (documentType) {
        case DocumentType.INVOICE:
          parsedData = this.parseInvoice(text);
          break;
        case DocumentType.DDT:
          parsedData = this.parseDDT(text);
          break;
        case DocumentType.RECEIPT:
          parsedData = this.parseReceipt(text);
          break;
        default:
          parsedData = this.parseGenericDocument(text);
      }

      // Update document with parsed data
      await this.documentRepository.update(documentId, {
        document_type: parsedData.documentType,
        supplier_name: parsedData.supplier.name,
        document_number: parsedData.documentNumber,
        document_date: parsedData.documentDate,
        total_amount: parsedData.totalAmount,
        currency: parsedData.currency,
        extracted_data: {
          supplier: parsedData.supplier,
          lineItems: parsedData.lines,
          parsing_metadata: {
            confidence: this.calculateParsingConfidence(text, parsedData),
            timestamp: new Date()
          }
        },
        processing_status: ProcessingStatus.PARSING_COMPLETED
      });

      // Create document lines
      await this.createDocumentLines(documentId, parsedData.lines);

      return parsedData;
    } catch (error) {
      await this.documentRepository.update(documentId, {
        processing_status: ProcessingStatus.PARSING_FAILED,
        processing_errors: { parsing_error: error.message }
      });
      throw error;
    }
  }

  private detectDocumentType(text: string): DocumentType {
    const lowerText = text.toLowerCase();
    
    // Italian document type detection
    if (lowerText.includes('fattura') || lowerText.includes('invoice')) {
      return DocumentType.INVOICE;
    }
    if (lowerText.includes('ddt') || lowerText.includes('documento di trasporto')) {
      return DocumentType.DDT;
    }
    if (lowerText.includes('scontrino') || lowerText.includes('ricevuta')) {
      return DocumentType.RECEIPT;
    }
    if (lowerText.includes('preventivo') || lowerText.includes('quotazione')) {
      return DocumentType.QUOTE;
    }
    if (lowerText.includes('ordine') || lowerText.includes('order')) {
      return DocumentType.PURCHASE_ORDER;
    }
    
    return DocumentType.UNKNOWN;
  }

  private parseInvoice(text: string): ParsedDocument {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Extract supplier information
    const supplier = this.extractSupplierInfo(lines);
    
    // Extract document number and date
    const documentNumber = this.extractDocumentNumber(lines, ['fattura', 'invoice', 'n.', 'nr.']);
    const documentDate = this.extractDate(lines);
    
    // Extract total amount
    const totalAmount = this.extractTotalAmount(lines, ['totale', 'total', 'euro', '€']);
    
    // Extract line items
    const lineItems = this.extractLineItems(lines);
    
    return {
      documentType: DocumentType.INVOICE,
      supplier,
      documentNumber,
      documentDate,
      totalAmount,
      currency: 'EUR',
      lines: lineItems
    };
  }

  private parseDDT(text: string): ParsedDocument {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const supplier = this.extractSupplierInfo(lines);
    const documentNumber = this.extractDocumentNumber(lines, ['ddt', 'documento', 'n.', 'nr.']);
    const documentDate = this.extractDate(lines);
    const lineItems = this.extractLineItems(lines);
    
    // DDT might not have total amount
    const totalAmount = this.calculateTotalFromLines(lineItems);
    
    return {
      documentType: DocumentType.DDT,
      supplier,
      documentNumber,
      documentDate,
      totalAmount,
      currency: 'EUR',
      lines: lineItems
    };
  }

  private parseReceipt(text: string): ParsedDocument {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    const supplier = this.extractSupplierInfo(lines);
    const documentNumber = this.extractDocumentNumber(lines, ['scontrino', 'ricevuta', 'n.', 'nr.']);
    const documentDate = this.extractDate(lines);
    const totalAmount = this.extractTotalAmount(lines, ['totale', 'total', 'euro', '€']);
    const lineItems = this.extractLineItems(lines);
    
    return {
      documentType: DocumentType.RECEIPT,
      supplier,
      documentNumber,
      documentDate,
      totalAmount,
      currency: 'EUR',
      lines: lineItems
    };
  }

  private parseGenericDocument(text: string): ParsedDocument {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return {
      documentType: DocumentType.UNKNOWN,
      supplier: { name: 'Unknown Supplier' },
      documentNumber: 'UNKNOWN',
      documentDate: new Date(),
      totalAmount: 0,
      currency: 'EUR',
      lines: []
    };
  }

  private extractSupplierInfo(lines: string[]): { name: string; vatNumber?: string; address?: string } {
    // Look for supplier information in first few lines
    const supplierLines = lines.slice(0, 10);
    
    let supplierName = '';
    let vatNumber = '';
    let address = '';
    
    for (const line of supplierLines) {
      // Look for company name (usually first non-empty line or line with specific patterns)
      if (!supplierName && this.looksLikeCompanyName(line)) {
        supplierName = line;
      }
      
      // Look for VAT number
      const vatMatch = line.match(/(?:p\.?iva|vat|partita iva)[\s:]*(\w+)/i);
      if (vatMatch) {
        vatNumber = vatMatch[1];
      }
      
      // Look for address
      if (this.looksLikeAddress(line)) {
        address = line;
      }
    }
    
    return {
      name: supplierName || 'Unknown Supplier',
      vatNumber: vatNumber || undefined,
      address: address || undefined
    };
  }

  private extractDocumentNumber(lines: string[], keywords: string[]): string {
    for (const line of lines) {
      for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[\\s:]*([\\w/-]+)`, 'i');
        const match = line.match(regex);
        if (match) {
          return match[1];
        }
      }
    }
    return 'UNKNOWN';
  }

  private extractDate(lines: string[]): Date {
    const dateRegexes = [
      /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,  // DD/MM/YYYY or DD-MM-YYYY
      /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,  // YYYY/MM/DD or YYYY-MM-DD
      /(\d{1,2})\s+(gennaio|febbraio|marzo|aprile|maggio|giugno|luglio|agosto|settembre|ottobre|novembre|dicembre)\s+(\d{4})/i
    ];
    
    for (const line of lines) {
      for (const regex of dateRegexes) {
        const match = line.match(regex);
        if (match) {
          if (match[2] && !isNaN(parseInt(match[2]))) {
            // Numeric date format
            const day = parseInt(match[1]);
            const month = parseInt(match[2]) - 1; // JavaScript months are 0-indexed
            const year = parseInt(match[3]);
            
            if (year > 1900 && month >= 0 && month < 12 && day >= 1 && day <= 31) {
              return new Date(year, month, day);
            }
          } else {
            // Italian month name format
            const monthNames = {
              'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
              'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
              'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
            };
            
            const day = parseInt(match[1]);
            const month = monthNames[match[2].toLowerCase()];
            const year = parseInt(match[3]);
            
            if (month !== undefined) {
              return new Date(year, month, day);
            }
          }
        }
      }
    }
    
    return new Date(); // Default to today if no date found
  }

  private extractTotalAmount(lines: string[], keywords: string[]): number {
    for (const line of lines) {
      for (const keyword of keywords) {
        const regex = new RegExp(`${keyword}[\\s:]*€?\\s*([\\d,\\.]+)`, 'i');
        const match = line.match(regex);
        if (match) {
          // Handle Italian number format (comma as decimal separator)
          const amountStr = match[1].replace(',', '.');
          const amount = parseFloat(amountStr);
          if (!isNaN(amount)) {
            return amount;
          }
        }
      }
    }
    return 0;
  }

  private extractLineItems(lines: string[]): ParsedDocumentLine[] {
    const lineItems: ParsedDocumentLine[] = [];
    
    // Look for table-like structures with quantities, descriptions, and prices
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Pattern for line items: quantity, description, unit price, total
      const lineItemRegex = /(\d+(?:[,\.]\d+)?)\s+(.+?)\s+€?\s*(\d+(?:[,\.]\d+)?)\s+€?\s*(\d+(?:[,\.]\d+)?)/;
      const match = line.match(lineItemRegex);
      
      if (match) {
        const quantity = parseFloat(match[1].replace(',', '.'));
        const description = match[2].trim();
        const unitPrice = parseFloat(match[3].replace(',', '.'));
        const totalPrice = parseFloat(match[4].replace(',', '.'));
        
        if (!isNaN(quantity) && !isNaN(unitPrice) && !isNaN(totalPrice)) {
          lineItems.push({
            description,
            quantity,
            unit: 'pz', // Default unit
            unitPrice,
            totalPrice,
            productCode: this.extractProductCode(description)
          });
        }
      }
    }
    
    return lineItems;
  }

  private looksLikeCompanyName(line: string): boolean {
    // Heuristics for identifying company names
    const companyIndicators = ['srl', 'spa', 'snc', 'sas', 'ltd', 'llc', '&', 'e figli', 'brothers'];
    const lowerLine = line.toLowerCase();
    
    return companyIndicators.some(indicator => lowerLine.includes(indicator)) ||
           (line.length > 5 && line.length < 100 && !/\d/.test(line.slice(0, 20)));
  }

  private looksLikeAddress(line: string): boolean {
    // Heuristics for identifying addresses
    const addressIndicators = ['via', 'viale', 'piazza', 'corso', 'str.', 'street', 'avenue'];
    const lowerLine = line.toLowerCase();
    
    return addressIndicators.some(indicator => lowerLine.includes(indicator));
  }

  private extractProductCode(description: string): string | undefined {
    // Look for product codes in descriptions
    const codeRegex = /(?:cod\.?|code|art\.?|sku)[\s:]*([A-Z0-9\-]+)/i;
    const match = description.match(codeRegex);
    return match ? match[1] : undefined;
  }

  private calculateTotalFromLines(lines: ParsedDocumentLine[]): number {
    return lines.reduce((sum, line) => sum + line.totalPrice, 0);
  }

  private calculateParsingConfidence(text: string, parsedData: ParsedDocument): number {
    let confidence = 50; // Base confidence
    
    // Increase confidence based on what we successfully extracted
    if (parsedData.supplier.name !== 'Unknown Supplier') confidence += 15;
    if (parsedData.documentNumber !== 'UNKNOWN') confidence += 15;
    if (parsedData.totalAmount > 0) confidence += 10;
    if (parsedData.lines.length > 0) confidence += 10;
    
    return Math.min(95, confidence);
  }

  private async createDocumentLines(documentId: string, lines: ParsedDocumentLine[]): Promise<void> {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      const documentLine = this.documentLineRepository.create({
        document_id: documentId,
        line_number: i + 1,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unit_price: line.unitPrice,
        total_price: line.totalPrice,
        product_code: line.productCode,
        extraction_metadata: {
          confidence: 80, // Default confidence for parsed lines
          extraction_method: 'regex_parsing'
        }
      });
      
      await this.documentLineRepository.save(documentLine);
    }
  }
}
```

---

## 5. Criteri di Completamento Fase 5

### Verifiche Funzionali Obbligatorie:
1. **Document Upload & OCR**: Upload multipli formati, processamento OCR multi-provider
2. **Document Parsing**: Riconoscimento automatico tipo documento, estrazione dati strutturati
3. **Human Review Workflow**: Interface review per correzioni OCR e approvazione dati
4. **CRM Customer Management**: CRUD completo clienti con identità multiple
5. **GDPR Compliance**: Consent management, right to erasure, data portability
6. **Provider System**: Configurazione dinamica provider, fallback automatico, health monitoring
7. **Inventory Integration**: Caricamento automatico prodotti da documenti processati

### Business Logic Requirements:
1. **OCR Pipeline**: Multi-provider fallback, confidence scoring, error recovery
2. **Document Intelligence**: Template recognition, data extraction accurata, supplier matching
3. **Customer Segmentation**: Tier automatico, visit tracking, lifetime value calculation
4. **GDPR Automation**: Consent expiry monitoring, data retention policies, breach notification
5. **Provider Failover**: Health monitoring automatico, cost tracking, rate limiting
6. **Quality Control**: Confidence thresholds, human review triggers, data validation

### Integration Requirements:
- Phase 1-4 Integration: Document upload da orders, customer tracking integrato
- OCR to Inventory: Automatic product matching e stock loading
- CRM to Orders: Customer identification automatica, preference tracking
- Provider Health: Monitoring integrato con notification system esistente
- Performance: Document processing < 30s, OCR < 10s, customer operations < 200ms

### Endpoints da Testare:
- POST /api/v1/venues/{venueId}/documents/upload - Upload documento
- GET /api/v1/venues/{venueId}/documents/{id}/ocr-status - Status OCR
- PATCH /api/v1/venues/{venueId}/documents/{id}/review - Review umana
- POST /api/v1/venues/{venueId}/documents/{id}/apply-inventory - Carica inventario
- POST /api/v1/venues/{venueId}/customers - Crea cliente con consensi GDPR
- GET /api/v1/venues/{venueId}/customers/{id}/gdpr-data - Export dati GDPR
- POST /api/v1/venues/{venueId}/providers - Configura provider esterno
- GET /api/v1/venues/{venueId}/providers/health - Health check provider

### Compliance & Security:
- GDPR Compliance: Audit trail immutabile per data processing
- Document Security: Encryption at rest, access control granulare
- Provider Security: Encrypted configuration storage, secure API communication
- Data Privacy: Customer data anonymization, consent versioning, breach detection

La Fase 5 è completa quando l'intero ecosistema document intelligence, CRM e provider system funziona end-to-end con compliance GDPR verificata e automazione documentale operativa.
