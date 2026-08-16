export const CAPABILITY_ROLES={
  invoiceRead:['owner','admin','manager','billing'],
  invoiceWrite:['owner','admin','manager','billing'],
  orderWrite:['owner','admin','manager','billing','warehouse','delivery'],
  clientRead:['owner','admin','manager','billing','delivery'],
  clientWrite:['owner','admin','manager','billing'],
  productRead:['owner','admin','manager','billing','warehouse','delivery'],
  productWrite:['owner','admin','manager','warehouse'],
  stockAdjust:['owner','admin','manager','billing','warehouse'],
  stockOps:['owner','admin','manager','warehouse'],
  stockReset:['owner'],
  weekReset:['owner'],
  purchaseWrite:['owner','admin','manager','warehouse'],
  supplierWrite:['owner','admin','manager','warehouse'],
  priceWrite:['owner','admin','manager','billing'],
  routeWrite:['owner','admin','manager','billing','warehouse','delivery'],
  quoteWrite:['owner','admin','manager','billing'],
  deliveryNoteWrite:['owner','admin','manager','billing','delivery'],
  expenseWrite:['owner','admin','manager','billing'],
  cashBankWrite:['owner','admin','manager','billing'],
  containerWrite:['owner','admin','manager','warehouse','delivery'],
  financeRead:['owner','admin','manager','billing'],
  closeMonth:['owner','admin','manager'],
  auditRead:['owner','admin','manager'],
  memberAdmin:['owner'],
  backupAdmin:['owner'],
  masterReload:['owner']
};

export function can(role,capability){return Boolean(CAPABILITY_ROLES[capability]?.includes(role));}

export const ACTION_CAPABILITY={
  'invoice-new':'invoiceWrite','order-new':'orderWrite','paste-order':'orderWrite','paste-multi-orders':'orderWrite',
  'invoice-all-delivered':'invoiceWrite','quick-delivery':'orderWrite','bulk-drafts':'invoiceWrite','bulk-issued':'invoiceWrite',
  'zip-day':'invoiceRead','payment-new':'invoiceWrite','payment-history-toggle':'invoiceRead','product-new':'productWrite',
  'client-new':'clientWrite','stock-adjust':'stockAdjust','stock-zero-all':'stockReset','week-reset':'weekReset',
  'invoice-history-toggle':'invoiceRead','order-history-toggle':'orderWrite','supplier-new':'supplierWrite',
  'purchase-new':'purchaseWrite','purchase-import':'purchaseWrite','purchase-prompt':'purchaseWrite','products-export':'productRead',
  'clients-export':'clientRead','stock-export':'stockAdjust','expense-new':'expenseWrite','price-mass':'priceWrite','route-new':'routeWrite',
  'report-sales':'invoiceRead','report-purchases':'invoiceRead','finance-export':'financeRead','master-reload':'masterReload',
  'transfer-new':'stockOps','waste-new':'stockOps','return-new':'stockOps','inventory-new':'stockOps',
  'doc-quote':'quoteWrite','doc-proforma':'quoteWrite','doc-delivery':'deliveryNoteWrite','close-month':'closeMonth',
  'backup-download':'backupAdmin','backup-restore':'backupAdmin','member-new':'memberAdmin','cash-new':'cashBankWrite',
  'bank-new':'cashBankWrite','container-new':'containerWrite'
};

export function canAction(role,action){const cap=ACTION_CAPABILITY[action];return cap?can(role,cap):true;}
