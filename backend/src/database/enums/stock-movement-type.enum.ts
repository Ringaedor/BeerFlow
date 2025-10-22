export enum StockMovementType {
  PURCHASE = 'purchase', // Acquisto da fornitore
  SALE = 'sale', // Vendita
  ADJUSTMENT = 'adjustment', // Rettifica inventario
  WASTE = 'waste', // Scarto/spreco
  TRANSFER_IN = 'transfer_in', // Trasferimento in entrata
  TRANSFER_OUT = 'transfer_out', // Trasferimento in uscita
  RETURN = 'return', // Reso
  PRODUCTION = 'production', // Produzione interna
}
