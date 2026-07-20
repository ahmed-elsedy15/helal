
"use client"

export interface Product {
  id: string;
  name: string;
  purchasePrice: number;
  sellingPrice: number;
  price: number;
  quantity: number;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalDebt: number;
  type: 'regular' | 'special';
  createdAt: number;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantitySold: number;
  purchasePriceAtSale: number;
  sellingPriceAtSale: number;
  totalPrice: number;
  profit: number;
  date: string;
  timestamp: number;
  customerId?: string;
  customerName?: string;
  paymentType: 'cash' | 'credit';
  discount: number;
  debtAmount: number;
  paidAmount?: number;
}

export interface Purchase {
  id: string;
  productId: string;
  productName: string;
  quantityAdded: number;
  purchasePrice: number;
  sellingPrice: number;
  date: string;
  timestamp: number;
  supplierName?: string;
  items?: PurchaseItem[];
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantityAdded: number;
  purchasePrice: number;
  sellingPrice: number;
}

export interface Payment {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  date: string;
  timestamp: number;
}

export interface DebtPayment {
  id: string;
  saleId: string;
  customerId: string;
  amount: number;
  date: string;
  timestamp: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  PRODUCTS: 'salesphere_products',
  SALES: 'salesphere_sales',
  PURCHASES: 'salesphere_purchases',
  CUSTOMERS: 'salesphere_customers',
  PAYMENTS: 'salesphere_payments',
  EXPENSES: 'salesphere_expenses',
  DEBT_PAYMENTS: 'salesphere_debt_payments',
  SYNC_SETTINGS: 'salesphere_sync_settings',
  BACKUP_STATE: 'salesphere_backup_state',
};

const DEFAULT_SYNC_SETTINGS = {
  localAutoBackup: false,
  backupIntervalMinutes: 30,
  backupOnExit: false,
};

const DEFAULT_BACKUP_STATE = {
  lastBackupAt: null as number | null,
  lastChangeAt: null as number | null,
};

export const DB_UPDATE_EVENT = 'salesphere-db-updated';

export const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type BackupDirectoryHandle = {
  name: string;
  queryPermission: (options: { mode: 'readwrite' }) => Promise<PermissionState>;
  getFileHandle: (name: string, options: { create: boolean }) => Promise<{
    createWritable: () => Promise<{
      write: (data: Blob) => Promise<void>;
      close: () => Promise<void>;
    }>;
  }>;
};

const BACKUP_DIRECTORY_DB = 'bedaya-backup-directory';
const BACKUP_DIRECTORY_STORE = 'settings';
const BACKUP_DIRECTORY_KEY = 'auto-backup-directory';

const openBackupDirectoryDb = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(BACKUP_DIRECTORY_DB, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(BACKUP_DIRECTORY_STORE);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const getAutoBackupDirectory = async (): Promise<BackupDirectoryHandle | null> => {
  try {
    const database = await openBackupDirectoryDb();
    return await new Promise((resolve, reject) => {
      const request = database.transaction(BACKUP_DIRECTORY_STORE, 'readonly')
        .objectStore(BACKUP_DIRECTORY_STORE).get(BACKUP_DIRECTORY_KEY);
      request.onsuccess = () => resolve((request.result as BackupDirectoryHandle | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
};

const saveAutoBackupDirectory = async (directory: BackupDirectoryHandle) => {
  const database = await openBackupDirectoryDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(BACKUP_DIRECTORY_STORE, 'readwrite');
    transaction.objectStore(BACKUP_DIRECTORY_STORE).put(directory, BACKUP_DIRECTORY_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

const triggerBackupDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const saveBackupToDirectory = async (blob: Blob, filename: string) => {
  const directory = await getAutoBackupDirectory();
  if (!directory || await directory.queryPermission({ mode: 'readwrite' }) !== 'granted') return false;

  const file = await directory.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
};

/**
 * دالة لحساب الربح المحقق من مبلغ معين تم دفعه لفاتورة.
 * الربح المحقق = المبلغ المدفوع * (إجمالي ربح الفاتورة / إجمالي سعر الفاتورة)
 */
export const calculateRealizedProfitFromAmount = (sale: Sale, paidAmount: number) => {
  const totalPrice = Number(sale.totalPrice) || 0;
  const totalProfit = Number(sale.profit) || 0;
  if (totalPrice <= 0) return 0;

  const profitRatio = totalProfit / totalPrice;
  return paidAmount * profitRatio;
};

export const db = {
  chooseAutoBackupDirectory: async () => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) return null;

    const pickerWindow = window as Window & {
      showDirectoryPicker: () => Promise<BackupDirectoryHandle>;
    };
    try {
      const directory = await pickerWindow.showDirectoryPicker();
      await saveAutoBackupDirectory(directory);
      return directory.name;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return null;
      throw error;
    }
  },

  getAutoBackupDirectoryName: async () => (await getAutoBackupDirectory())?.name ?? null,

  getBackupState: () => {
    if (typeof window === 'undefined') return DEFAULT_BACKUP_STATE;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BACKUP_STATE);
      return stored ? { ...DEFAULT_BACKUP_STATE, ...JSON.parse(stored) } : DEFAULT_BACKUP_STATE;
    } catch (e) {
      return DEFAULT_BACKUP_STATE;
    }
  },

  setBackupState: (updates: Partial<typeof DEFAULT_BACKUP_STATE>) => {
    if (typeof window === 'undefined') return DEFAULT_BACKUP_STATE;
    const current = db.getBackupState();
    const next = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.BACKUP_STATE, JSON.stringify(next));
    return next;
  },

  markDataChanged: () => {
    if (typeof window === 'undefined') return;
    try {
      const state = db.getBackupState();
      const shouldUpdate = !state.lastBackupAt || !state.lastChangeAt || state.lastChangeAt < state.lastBackupAt || state.lastChangeAt < Date.now() - 1000;
      if (shouldUpdate) {
        db.setBackupState({ lastChangeAt: Date.now() });
      }
    } catch (e) { }
  },

  notify: () => {
    db.markDataChanged();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
      window.dispatchEvent(new Event('storage'));
    }
  },

  getProducts: (): Product[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getSales: (): Sale[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SALES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },
  getPurchases: (): Purchase[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PURCHASES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },


  getCustomers: (): Customer[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getPayments: (): Payment[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getExpenses: (): Expense[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getDebtPayments: (): DebtPayment[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DEBT_PAYMENTS);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  },

  getAllData: () => ({
    products: db.getProducts(),
    sales: db.getSales(),
    purchases: db.getPurchases(),
    customers: db.getCustomers(),
    payments: db.getPayments(),
    expenses: db.getExpenses(),
    debtPayments: db.getDebtPayments(),
  }),

  getSyncSettings: () => {
    if (typeof window === 'undefined') return DEFAULT_SYNC_SETTINGS;
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SYNC_SETTINGS);
      return stored ? { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SYNC_SETTINGS;
    } catch (e) {
      return DEFAULT_SYNC_SETTINGS;
    }
  },

  setSyncSettings: (updates: Partial<typeof DEFAULT_SYNC_SETTINGS>) => {
    if (typeof window === 'undefined') return DEFAULT_SYNC_SETTINGS;
    const current = db.getSyncSettings();
    const next = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEYS.SYNC_SETTINGS, JSON.stringify(next));
    db.notify();
    return next;
  },

  getUnpaidDebts: (customerId: string) => {
    const sales = db.getSales();
    const debtPayments = db.getDebtPayments();

    return sales.filter(sale =>
      sale.customerId === customerId &&
      sale.paymentType === 'credit' &&
      Number(sale.debtAmount) > 0
    ).map(sale => {
      const paidAmount = debtPayments
        .filter(dp => dp.saleId === sale.id)
        .reduce((sum, dp) => sum + Number(dp.amount), 0);

      const remainingDebt = Math.max(0, Number(sale.debtAmount) - paidAmount);
      return {
        ...sale,
        paidAmount,
        remainingDebt,
        isPaid: remainingDebt === 0
      };
    }).filter(sale => sale.remainingDebt > 0);
  },

  getDebtPaymentsByDate: (date: string) => {
    const debtPayments = db.getDebtPayments();
    return debtPayments.filter(dp => dp.date === date);
  },

  getDayDebtsSummary: (date: string) => {
    const sales = db.getSales();
    const debtPayments = db.getDebtPayments();

    const debtIssuedToday = sales
      .filter(s => s.date === date && s.paymentType === 'credit')
      .reduce((sum, s) => sum + Number(s.debtAmount || 0), 0);

    const debtCollectedToday = debtPayments
      .filter(dp => dp.date === date)
      .reduce((sum, dp) => sum + Number(dp.amount), 0);

    return {
      issuedToday: debtIssuedToday,
      collectedToday: debtCollectedToday
    };
  },

  getMonthlyDebts: (customerId: string, year?: number, month?: number) => {
    const now = new Date();
    const currentYear = year || now.getFullYear();
    const currentMonth = month !== undefined ? month : now.getMonth() + 1;

    const sales = db.getSales();

    return sales
      .filter(s => {
        if (s.customerId !== customerId || s.paymentType !== 'credit') return false;
        const saleDate = new Date(s.date + 'T00:00:00');
        const saleYear = saleDate.getFullYear();
        const saleMonth = saleDate.getMonth() + 1;
        return saleYear === currentYear && saleMonth === currentMonth;
      })
      .reduce((sum, s) => sum + Number(s.debtAmount || 0), 0);
  },

  getCustomerPaymentHistory: (customerId: string) => {
    const debtPayments = db.getDebtPayments();
    const sales = db.getSales();

    return debtPayments
      .filter(dp => dp.customerId === customerId)
      .map(dp => {
        const sale = sales.find(s => s.id === dp.saleId);
        return {
          ...dp,
          productName: sale?.productName || 'منتج محذوف',
          saleDate: sale?.date || dp.date,
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  getCustomerDebtHistory: (customerId: string) => {
    const sales = db.getSales();
    const debtPayments = db.getDebtPayments();

    // جميع الديون (المسددة والمتبقية)
    return sales
      .filter(s =>
        s.customerId === customerId &&
        s.paymentType === 'credit' &&
        Number(s.debtAmount) > 0
      )
      .map(sale => {
        const paidAmount = debtPayments
          .filter(dp => dp.saleId === sale.id)
          .reduce((sum, dp) => sum + Number(dp.amount), 0);

        const remainingDebt = Math.max(0, Number(sale.debtAmount) - paidAmount);
        return {
          ...sale,
          paidAmount,
          remainingDebt,
          isPaid: remainingDebt === 0
        };
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  },

  downloadBackup: async ({ selectLocation = false, saveToAutoDirectory = false }: { selectLocation?: boolean; saveToAutoDirectory?: boolean } = {}) => {
    if (typeof window === 'undefined') return false;
    const data = {
      ...db.getAllData(),
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const filename = `bedaya_backup_${getLocalDateString()}_${Date.now()}.json`;
    let savedToDirectory = false;
    if (saveToAutoDirectory) {
      try {
        savedToDirectory = await saveBackupToDirectory(blob, filename);
      } catch {
        savedToDirectory = false;
      }
    }

    if (!savedToDirectory && selectLocation && 'showSaveFilePicker' in window) {
      try {
        const pickerWindow = window as Window & {
          showSaveFilePicker: (options: unknown) => Promise<{
            createWritable: () => Promise<{
              write: (data: Blob) => Promise<void>;
              close: () => Promise<void>;
            }>;
          }>;
        };
        const handle = await pickerWindow.showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Backup file', accept: { 'application/json': ['.json'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return false;
        triggerBackupDownload(blob, filename);
      }
    } else if (!savedToDirectory) {
      triggerBackupDownload(blob, filename);
    }
    db.setBackupState({ lastBackupAt: Date.now(), lastChangeAt: null });
    window.dispatchEvent(new CustomEvent(DB_UPDATE_EVENT));
    window.dispatchEvent(new Event('storage'));
    return true;
  },

  addProduct: (product: Omit<Product, 'id' | 'createdAt' | 'price'>) => {
    const products = db.getProducts();
    const newProduct: Product = {
      ...product,
      purchasePrice: Number(product.purchasePrice),
      sellingPrice: Number(product.sellingPrice),
      quantity: Number(product.quantity),
      price: Number(product.sellingPrice),
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify([newProduct, ...products]));
    db.notify();
    return newProduct;
  },

  updateProduct: (id: string, updates: Partial<Product>) => {
    const products = db.getProducts();
    const updated = products.map((p) => (p.id === id ? { ...p, ...updates, price: updates.sellingPrice ?? p.sellingPrice } : p));
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updated));
    db.notify();
  },

  deleteProduct: (id: string) => {
    const products = db.getProducts();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products.filter((p) => p.id !== id)));
    db.notify();
  },

  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalDebt'>) => {
    const customers = db.getCustomers();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      totalDebt: 0,
      createdAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify([newCustomer, ...customers]));
    db.notify();
    return newCustomer;
  },

  updateCustomer: (id: string, updates: Partial<Customer>) => {
    const customers = db.getCustomers();
    const updated = customers.map((c) => (c.id === id ? { ...c, ...updates } : c));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    db.notify();
  },

  deleteCustomer: (id: string) => {
    const customers = db.getCustomers();
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers.filter((c) => c.id !== id)));
    db.notify();
  },

  updateCustomerDebt: (id: string, amount: number) => {
    const customers = db.getCustomers();
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    if (amount < 0) {
      const payments = db.getPayments();
      const newPayment: Payment = {
        id: crypto.randomUUID(),
        customerId: id,
        customerName: customer.name,
        amount: Math.abs(amount),
        date: getLocalDateString(),
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify([newPayment, ...payments]));
    }

    const updated = customers.map(c => (c.id === id ? { ...c, totalDebt: Math.max(0, Number(c.totalDebt) + Number(amount)) } : c));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    db.notify();
  },

  payDebtForSale: (saleId: string, customerId: string, amount: number) => {
    const debtPayments = db.getDebtPayments();
    const newDebtPayment: DebtPayment = {
      id: crypto.randomUUID(),
      saleId,
      customerId,
      amount: Number(amount),
      date: getLocalDateString(),
      timestamp: Date.now()
    };

    const customers = db.getCustomers();
    const updated = customers.map(c =>
      c.id === customerId
        ? { ...c, totalDebt: Math.max(0, Number(c.totalDebt) - Number(amount)) }
        : c
    );

    localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify([newDebtPayment, ...debtPayments]));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updated));
    db.notify();
  },

  recordSale: (productId: string, quantity: number, paymentType: 'cash' | 'credit' = 'cash', customerId?: string, discount: number = 0, debtAmount: number = 0) => {
    const products = db.getProducts();
    const product = products.find(p => p.id === productId);
    if (!product || Number(product.quantity) < Number(quantity)) throw new Error('Insufficient stock');

    const qty = Number(quantity);
    const dsc = Number(discount);
    const debt = Number(debtAmount);

    const updatedProducts = products.map(p => p.id === productId ? { ...p, quantity: Number(p.quantity) - qty } : p);

    let customerName = "";
    const customersList = db.getCustomers();

    if (customerId) {
      const customer = customersList.find(c => c.id === customerId);
      if (customer) {
        customerName = customer.name;
        if (paymentType === 'credit' && debt > 0) {
          const updatedCusts = customersList.map(c => (c.id === customerId ? { ...c, totalDebt: Number(c.totalDebt) + debt } : c));
          localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCusts));
        }
      }
    }

    const newSale: Sale = {
      id: crypto.randomUUID(),
      productId,
      productName: product.name,
      quantitySold: qty,
      purchasePriceAtSale: Number(product.purchasePrice),
      sellingPriceAtSale: Number(product.sellingPrice),
      totalPrice: (Number(product.sellingPrice) * qty) - dsc,
      profit: ((Number(product.sellingPrice) - Number(product.purchasePrice)) * qty) - dsc,
      date: getLocalDateString(),
      timestamp: Date.now(),
      customerId,
      customerName: customerName || undefined,
      paymentType,
      discount: dsc,
      debtAmount: paymentType === 'credit' ? debt : 0
    };

    const sales = db.getSales();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify([newSale, ...sales]));

    db.notify();
    return newSale;
  },

  recordPurchase: (productId: string, quantity: number, purchasePrice: number, sellingPrice: number, supplierName: string = "") => {
    const products = db.getProducts();
    const productIndex = products.findIndex(p => p.id === productId);
    if (productIndex === -1) throw new Error('Product not found');

    const qty = Number(quantity) || 0;
    const pPrice = Number(purchasePrice) || 0;
    const sPrice = Number(sellingPrice) || 0;

    // تحديث المنتج: زيادة الكمية وتحديث الأسعار
    const updatedProducts = [...products];
    updatedProducts[productIndex] = {
      ...updatedProducts[productIndex],
      quantity: Number(updatedProducts[productIndex].quantity) + qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      price: sPrice
    };

    const newPurchase: Purchase = {
      id: crypto.randomUUID(),
      productId,
      productName: products[productIndex].name,
      quantityAdded: qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      date: getLocalDateString(),
      timestamp: Date.now(),
      supplierName
    };

    const purchases = db.getPurchases();
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([newPurchase, ...purchases]));

    db.notify();
    return newPurchase;
  },

  updatePurchase: (purchaseId: string, productId: string, quantity: number, purchasePrice: number, sellingPrice: number, supplierName: string = "") => {
    const purchases = db.getPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    if (purchaseIndex === -1) throw new Error('Purchase invoice not found');

    const qty = Number(quantity);
    const pPrice = Number(purchasePrice);
    const sPrice = Number(sellingPrice);
    if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(pPrice) || pPrice < 0 || !Number.isFinite(sPrice) || sPrice < 0) {
      throw new Error('Please enter valid invoice values');
    }

    const products = db.getProducts();
    const oldPurchase = purchases[purchaseIndex];
    const oldProductIndex = products.findIndex(p => p.id === oldPurchase.productId);
    const newProductIndex = products.findIndex(p => p.id === productId);
    if (oldProductIndex === -1 || newProductIndex === -1) throw new Error('Product not found');

    const updatedProducts = [...products];
    const oldProduct = updatedProducts[oldProductIndex];
    if (Number(oldProduct.quantity) < Number(oldPurchase.quantityAdded)) {
      throw new Error('Cannot edit this invoice because part of its quantity has already been sold');
    }

    if (oldPurchase.productId === productId) {
      updatedProducts[oldProductIndex] = {
        ...oldProduct,
        quantity: Number(oldProduct.quantity) - Number(oldPurchase.quantityAdded) + qty,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        price: sPrice,
      };
    } else {
      updatedProducts[oldProductIndex] = {
        ...oldProduct,
        quantity: Number(oldProduct.quantity) - Number(oldPurchase.quantityAdded),
      };
      const newProduct = updatedProducts[newProductIndex];
      updatedProducts[newProductIndex] = {
        ...newProduct,
        quantity: Number(newProduct.quantity) + qty,
        purchasePrice: pPrice,
        sellingPrice: sPrice,
        price: sPrice,
      };
    }

    const updatedPurchase: Purchase = {
      ...oldPurchase,
      productId,
      productName: products[newProductIndex].name,
      quantityAdded: qty,
      purchasePrice: pPrice,
      sellingPrice: sPrice,
      supplierName,
    };
    const updatedPurchases = [...purchases];
    updatedPurchases[purchaseIndex] = updatedPurchase;

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(updatedPurchases));
    db.notify();
    return updatedPurchase;
  },

  deletePurchase: (purchaseId: string) => {
    const purchases = db.getPurchases();
    const purchase = purchases.find(p => p.id === purchaseId);
    if (!purchase) throw new Error('Purchase invoice not found');

    const products = db.getProducts();
    const items = purchase.items || [{ productId: purchase.productId, quantityAdded: purchase.quantityAdded }];
    const updatedProducts = [...products];
    for (const item of items) {
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex === -1) throw new Error('Product not found');
      if (Number(updatedProducts[productIndex].quantity) < Number(item.quantityAdded)) {
        throw new Error('Cannot delete this invoice because part of its quantity has already been sold');
      }
      updatedProducts[productIndex] = {
        ...updatedProducts[productIndex],
        quantity: Number(updatedProducts[productIndex].quantity) - Number(item.quantityAdded),
      };
    }
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(purchases.filter(p => p.id !== purchaseId)));
    db.notify();
    return true;
  },

  recordPurchaseInvoice: (items: PurchaseItem[], supplierName: string = "") => {
    if (!items.length) throw new Error('Add at least one product to the invoice');
    const products = db.getProducts();
    const updatedProducts = [...products];
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantityAdded);
      const pPrice = Number(item.purchasePrice);
      const sPrice = Number(item.sellingPrice);
      const productIndex = updatedProducts.findIndex(p => p.id === item.productId);
      if (productIndex === -1) throw new Error('Product not found');
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(pPrice) || pPrice < 0 || !Number.isFinite(sPrice) || sPrice < 0) {
        throw new Error('Please enter valid values for all products');
      }
      const product = updatedProducts[productIndex];
      updatedProducts[productIndex] = { ...product, quantity: Number(product.quantity) + qty, purchasePrice: pPrice, sellingPrice: sPrice, price: sPrice };
      return { productId: product.id, productName: product.name, quantityAdded: qty, purchasePrice: pPrice, sellingPrice: sPrice };
    });
    const timestamp = Date.now();
    const newPurchase: Purchase = {
      id: crypto.randomUUID(), productId: normalizedItems[0].productId, productName: normalizedItems[0].productName,
      quantityAdded: normalizedItems.reduce((sum, item) => sum + item.quantityAdded, 0),
      purchasePrice: normalizedItems.reduce((sum, item) => sum + item.quantityAdded * item.purchasePrice, 0),
      sellingPrice: 0, date: getLocalDateString(), timestamp, supplierName, items: normalizedItems,
    };
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify([newPurchase, ...db.getPurchases()]));
    db.notify();
    return newPurchase;
  },

  updatePurchaseInvoice: (purchaseId: string, items: PurchaseItem[], supplierName: string = "") => {
    const purchases = db.getPurchases();
    const purchaseIndex = purchases.findIndex(p => p.id === purchaseId);
    if (purchaseIndex === -1) throw new Error('Purchase invoice not found');
    if (!items.length) throw new Error('Add at least one product to the invoice');
    if (new Set(items.map(item => item.productId)).size !== items.length) throw new Error('Duplicate products are not allowed');

    const previous = purchases[purchaseIndex];
    const previousItems = previous.items || [{ productId: previous.productId, productName: previous.productName, quantityAdded: previous.quantityAdded, purchasePrice: previous.purchasePrice, sellingPrice: previous.sellingPrice }];
    const products = db.getProducts();
    const updatedProducts = [...products];
    for (const item of previousItems) {
      const index = updatedProducts.findIndex(p => p.id === item.productId);
      if (index === -1) throw new Error('Product not found');
      if (Number(updatedProducts[index].quantity) < Number(item.quantityAdded)) throw new Error('Cannot edit this invoice because part of its quantity has already been sold');
      updatedProducts[index] = { ...updatedProducts[index], quantity: Number(updatedProducts[index].quantity) - Number(item.quantityAdded) };
    }
    const normalizedItems = items.map(item => {
      const qty = Number(item.quantityAdded), pPrice = Number(item.purchasePrice), sPrice = Number(item.sellingPrice);
      const index = updatedProducts.findIndex(p => p.id === item.productId);
      if (index === -1) throw new Error('Product not found');
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(pPrice) || pPrice < 0 || !Number.isFinite(sPrice) || sPrice < 0) throw new Error('Please enter valid values for all products');
      const product = updatedProducts[index];
      updatedProducts[index] = { ...product, quantity: Number(product.quantity) + qty, purchasePrice: pPrice, sellingPrice: sPrice, price: sPrice };
      return { productId: product.id, productName: product.name, quantityAdded: qty, purchasePrice: pPrice, sellingPrice: sPrice };
    });
    const updatedPurchase: Purchase = { ...previous, productId: normalizedItems[0].productId, productName: normalizedItems[0].productName, quantityAdded: normalizedItems.reduce((sum, item) => sum + item.quantityAdded, 0), purchasePrice: normalizedItems.reduce((sum, item) => sum + item.quantityAdded * item.purchasePrice, 0), sellingPrice: 0, supplierName, items: normalizedItems };
    const updatedPurchases = [...purchases];
    updatedPurchases[purchaseIndex] = updatedPurchase;
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(updatedPurchases));
    db.notify();
    return updatedPurchase;
  },

  returnSale: (saleId: string) => {
    const sales = db.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return false;

    const products = db.getProducts();
    const customers = db.getCustomers();
    const debtPayments = db.getDebtPayments();

    const updatedProducts = products.map(p =>
      p.id === sale.productId ? { ...p, quantity: Number(p.quantity) + Number(sale.quantitySold) } : p
    );

    let updatedCustomers = [...customers];
    if (sale.customerId && Number(sale.debtAmount) > 0) {
      // حساب المبلغ المدفوع بالفعل على هذه الفاتورة
      const paidAmount = debtPayments
        .filter(dp => dp.saleId === sale.id)
        .reduce((sum, dp) => sum + Number(dp.amount), 0);

      // الدين المتبقي = الدين الأصلي - المبلغ المدفوع
      const remainingDebt = Math.max(0, Number(sale.debtAmount) - paidAmount);

      updatedCustomers = customers.map(c =>
        c.id === sale.customerId ? { ...c, totalDebt: Math.max(0, Number(c.totalDebt) - remainingDebt) } : c
      );
    }

    const updatedSales = sales.filter(s => s.id !== saleId);
    // حذف أي دفعات مرتبطة بهذه الفاتورة عند إرجاعها
    const updatedDebtPayments = debtPayments.filter(dp => dp.saleId !== saleId);

    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(updatedCustomers));
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(updatedSales));
    localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(updatedDebtPayments));

    db.notify();
    return true;
  },

  addExpense: (expense: Omit<Expense, 'id' | 'timestamp'>) => {
    const expenses = db.getExpenses();
    const newExpense: Expense = {
      ...expense,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify([newExpense, ...expenses]));
    db.notify();
    return newExpense;
  },

  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'timestamp'>>) => {
    const expenses = db.getExpenses();
    const updatedExpenses = expenses.map(e =>
      e.id === id ? { ...e, ...updates } : e
    );
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(updatedExpenses));
    db.notify();
  },

  deleteExpense: (id: string) => {
    const expenses = db.getExpenses();
    localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses.filter(e => e.id !== id)));
    db.notify();
  },

  importAll: (data: any) => {
    if (data.products) localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(data.products));
    if (data.sales) localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(data.sales));
    if (data.purchases) localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(data.purchases));
    if (data.customers) localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(data.customers));
    if (data.payments) localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(data.payments));
    if (data.expenses) localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(data.expenses));
    if (data.debtPayments) localStorage.setItem(STORAGE_KEYS.DEBT_PAYMENTS, JSON.stringify(data.debtPayments));
    db.notify();
  }
};
