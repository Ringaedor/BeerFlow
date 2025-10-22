"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Venue = void 0;
const typeorm_1 = require("typeorm");
const base_entity_1 = require("./base.entity");
const user_entity_1 = require("./user.entity");
const product_category_entity_1 = require("./product-category.entity");
const supplier_entity_1 = require("./supplier.entity");
const product_entity_1 = require("./product.entity");
let Venue = class Venue extends base_entity_1.BaseEntity {
    name;
    address;
    settings;
    subscription_plan;
    subscription_expires_at;
    active;
    users;
    product_categories;
    suppliers;
    products;
};
exports.Venue = Venue;
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 255 }),
    __metadata("design:type", String)
], Venue.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Venue.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'jsonb',
        default: {
            currency: 'EUR',
            timezone: 'Europe/Rome',
            tax_rate: 0.22,
            default_language: 'it-IT'
        }
    }),
    __metadata("design:type", Object)
], Venue.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, default: 'basic' }),
    __metadata("design:type", String)
], Venue.prototype, "subscription_plan", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'timestamptz', nullable: true }),
    __metadata("design:type", Date)
], Venue.prototype, "subscription_expires_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], Venue.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => user_entity_1.User, user => user.venue),
    __metadata("design:type", Array)
], Venue.prototype, "users", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_category_entity_1.ProductCategory, category => category.venue),
    __metadata("design:type", Array)
], Venue.prototype, "product_categories", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => supplier_entity_1.Supplier, supplier => supplier.venue),
    __metadata("design:type", Array)
], Venue.prototype, "suppliers", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => product_entity_1.Product, product => product.venue),
    __metadata("design:type", Array)
], Venue.prototype, "products", void 0);
exports.Venue = Venue = __decorate([
    (0, typeorm_1.Entity)('venues')
], Venue);
//# sourceMappingURL=venue.entity.js.map