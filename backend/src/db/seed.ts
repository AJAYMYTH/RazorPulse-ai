import { db } from './index.js';
import {
  Merchant,
  CatalogItem,
  Customer,
  Order,
} from '../types/index.js';

export const SEED_MERCHANT_ID = 'mch_apex_gear_001';

export async function seedDatabase() {
  console.log('🌱 Seeding database with synthetic merchant, catalog, and orders...');

  // 1. Merchant
  const merchant: Merchant = {
    id: SEED_MERCHANT_ID,
    name: 'Apex Electronics & Tech Gear',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
  };
  await db.saveMerchant(merchant);

  // 2. Catalog (18 SKUs)
  const catalog: CatalogItem[] = [
    {
      id: 'cat_kb_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-KB-PRO',
      name: 'Apex Pro Mechanical Keyboard (RGB, Hot-Swap)',
      price: 8499,
      category: 'Peripherals',
      co_purchase_tags: ['wrist-rest', 'keycaps', 'mousepad', 'desk-mat'],
    },
    {
      id: 'cat_wr_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-WR-WOOD',
      name: 'Walnut Wood Ergonomic Wrist Rest',
      price: 1499,
      category: 'Accessories',
      co_purchase_tags: ['keyboard', 'ergonomic'],
    },
    {
      id: 'cat_kc_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-KC-PBT',
      name: 'PBT Double-Shot Custom Keycap Set',
      price: 2299,
      category: 'Accessories',
      co_purchase_tags: ['keyboard'],
    },
    {
      id: 'cat_ms_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-MS-WIRELESS',
      name: 'Apex Ultralight Wireless Gaming Mouse',
      price: 4999,
      category: 'Peripherals',
      co_purchase_tags: ['mousepad', 'cable-bungee', 'grip-tape'],
    },
    {
      id: 'cat_mp_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-MP-XL',
      name: 'Cordura Extended Speed Mousepad (900x400mm)',
      price: 1299,
      category: 'Accessories',
      co_purchase_tags: ['mouse', 'keyboard', 'desk-setup'],
    },
    {
      id: 'cat_lp_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-LP-15',
      name: 'TitanBook 15 Pro Ultrabook (16GB, 1TB SSD)',
      price: 89999,
      category: 'Computers',
      co_purchase_tags: ['usbc-hub', 'laptop-sleeve', 'stand', 'gan-charger'],
    },
    {
      id: 'cat_hb_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-HUB-8IN1',
      name: 'Apex 8-in-1 Aluminum USB-C 100W Hub',
      price: 3499,
      category: 'Accessories',
      co_purchase_tags: ['laptop', 'macbook', 'ultrabook'],
    },
    {
      id: 'cat_sl_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-SLEEVE-15',
      name: 'Water-Resistant Shockproof 15" Laptop Sleeve',
      price: 1899,
      category: 'Accessories',
      co_purchase_tags: ['laptop'],
    },
    {
      id: 'cat_chg_65',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-GAN-65W',
      name: 'Apex Nano 65W GaN Fast Dual-Port Charger',
      price: 2499,
      category: 'Power',
      co_purchase_tags: ['charger', 'cable', 'phone'],
    },
    {
      id: 'cat_chg_100',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-GAN-100W',
      name: 'Apex Ultra 100W GaN Quad-Port Desktop Charger',
      price: 4299,
      category: 'Power',
      co_purchase_tags: ['charger', 'power', 'laptop'],
    },
    {
      id: 'cat_hp_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-ANC-HEADPHONE',
      name: 'Apex SoundWave Pro Active Noise Cancelling Headphones',
      price: 12999,
      category: 'Audio',
      co_purchase_tags: ['headphone-stand', 'audio-cable', 'case'],
    },
    {
      id: 'cat_hs_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-HP-STAND',
      name: 'Minimalist Matte Aluminum Headphone Stand',
      price: 1699,
      category: 'Accessories',
      co_purchase_tags: ['headphones', 'desk-setup'],
    },
    {
      id: 'cat_mon_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-MON-4K',
      name: 'Apex 27" 4K IPS HDR Color-Accurate Creator Monitor',
      price: 29999,
      category: 'Displays',
      co_purchase_tags: ['monitor-light', 'displayport-cable', 'arm'],
    },
    {
      id: 'cat_ml_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-MON-LIGHT',
      name: 'ScreenBar Eye-Care Smart Monitor Light Bar',
      price: 2999,
      category: 'Lighting',
      co_purchase_tags: ['monitor', 'desk-setup'],
    },
    {
      id: 'cat_chr_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-CHAIR-ERGO',
      name: 'Apex AirMesh Ergonomic Executive Chair',
      price: 18499,
      category: 'Furniture',
      co_purchase_tags: ['lumbar-pillow', 'footrest', 'floor-mat'],
    },
    {
      id: 'cat_lb_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-LUMBAR-PILLOW',
      name: 'Memory Foam Breathable Lumbar Support Cushion',
      price: 1599,
      category: 'Accessories',
      co_purchase_tags: ['chair', 'ergonomic'],
    },
    {
      id: 'cat_cb_01',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-CABLE-USBC',
      name: 'Braided 240W 2-Meter USB-C to USB-C Fast Cable',
      price: 899,
      category: 'Cables',
      co_purchase_tags: ['charger', 'cable'],
    },
    {
      id: 'cat_cb_bungee',
      merchant_id: SEED_MERCHANT_ID,
      sku: 'SKU-BUNGEE-PRO',
      name: 'Zero-Drag Magnetic Mouse Cable Bungee',
      price: 799,
      category: 'Accessories',
      co_purchase_tags: ['mouse'],
    },
  ];
  await db.saveCatalog(catalog);

  // 3. Customers (8 Synthetic Customers)
  const customers: Customer[] = [
    { id: 'cust_01', merchant_id: SEED_MERCHANT_ID, name: 'Aarav Mehta', order_count: 3 },
    { id: 'cust_02', merchant_id: SEED_MERCHANT_ID, name: 'Priya Sharma', order_count: 1 },
    { id: 'cust_03', merchant_id: SEED_MERCHANT_ID, name: 'Rohan Gupta', order_count: 5 },
    { id: 'cust_04', merchant_id: SEED_MERCHANT_ID, name: 'Ananya Iyer', order_count: 2 },
    { id: 'cust_05', merchant_id: SEED_MERCHANT_ID, name: 'Vikram Verma', order_count: 1 },
    { id: 'cust_06', merchant_id: SEED_MERCHANT_ID, name: 'Neha Reddy', order_count: 4 },
    { id: 'cust_07', merchant_id: SEED_MERCHANT_ID, name: 'Kabir Das', order_count: 1 },
    { id: 'cust_08', merchant_id: SEED_MERCHANT_ID, name: 'Sneha Patel', order_count: 2 },
  ];
  for (const c of customers) {
    await db.saveCustomer(c);
  }

  // 4. Orders (15 Test Cases with Specific Demonstration Intent)
  const orders: Order[] = [
    // 1. Accepted: Keyboard -> Wrist Rest (cross-sell)
    {
      id: 'ord_demo_01_kb_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_01',
      items: [{ sku: 'SKU-KB-PRO', name: 'Apex Pro Mechanical Keyboard', quantity: 1, price: 8499 }],
      total_amount: 8499,
      status: 'paid',
      created_at: new Date('2026-03-01T10:15:00Z').toISOString(),
    },
    // 2. Accepted: Laptop -> USB-C Hub (cross-sell)
    {
      id: 'ord_demo_02_lp_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_02',
      items: [{ sku: 'SKU-LP-15', name: 'TitanBook 15 Pro Ultrabook', quantity: 1, price: 89999 }],
      total_amount: 89999,
      status: 'paid',
      created_at: new Date('2026-03-01T11:00:00Z').toISOString(),
    },
    // 3. Accepted: 65W Charger -> 100W GaN (upsell)
    {
      id: 'ord_demo_03_chg_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_03',
      items: [{ sku: 'SKU-GAN-65W', name: 'Apex Nano 65W GaN Charger', quantity: 1, price: 2499 }],
      total_amount: 2499,
      status: 'paid',
      created_at: new Date('2026-03-01T11:45:00Z').toISOString(),
    },
    // 4. Accepted: Headphones -> Headphone Stand (cross-sell)
    {
      id: 'ord_demo_04_hp_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_04',
      items: [{ sku: 'SKU-ANC-HEADPHONE', name: 'Apex SoundWave Pro Headphones', quantity: 1, price: 12999 }],
      total_amount: 12999,
      status: 'paid',
      created_at: new Date('2026-03-01T12:30:00Z').toISOString(),
    },
    // 5. Accepted: Ergo Chair -> Lumbar Pillow (cross-sell)
    {
      id: 'ord_demo_05_chair_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_05',
      items: [{ sku: 'SKU-CHAIR-ERGO', name: 'Apex AirMesh Ergonomic Executive Chair', quantity: 1, price: 18499 }],
      total_amount: 18499,
      status: 'paid',
      created_at: new Date('2026-03-01T13:10:00Z').toISOString(),
    },
    // 6. Accepted: Gaming Mouse -> Speed Mousepad (cross-sell)
    {
      id: 'ord_demo_06_mouse_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_06',
      items: [{ sku: 'SKU-MS-WIRELESS', name: 'Apex Ultralight Wireless Gaming Mouse', quantity: 1, price: 4999 }],
      total_amount: 4999,
      status: 'paid',
      created_at: new Date('2026-03-01T13:55:00Z').toISOString(),
    },
    // 7. Rejected: Max Discount Violation (>15% cap)
    {
      id: 'ord_demo_07_reject_discount',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_07',
      items: [{ sku: 'SKU-KB-PRO', name: 'Apex Pro Mechanical Keyboard', quantity: 1, price: 8499 }],
      total_amount: 8499,
      status: 'paid',
      created_at: new Date('2026-03-01T14:20:00Z').toISOString(),
    },
    // 8. Rejected: Confidence Below Threshold (<0.60)
    {
      id: 'ord_demo_08_reject_conf',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_08',
      items: [{ sku: 'SKU-CABLE-USBC', name: 'Braided 240W 2-Meter USB-C Fast Cable', quantity: 1, price: 899 }],
      total_amount: 899,
      status: 'paid',
      created_at: new Date('2026-03-01T15:00:00Z').toISOString(),
    },
    // 9. Rejected: Order Ineligible (Status: refunded)
    {
      id: 'ord_demo_09_reject_refunded',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_01',
      items: [{ sku: 'SKU-LP-15', name: 'TitanBook 15 Pro Ultrabook', quantity: 1, price: 89999 }],
      total_amount: 89999,
      status: 'refunded',
      created_at: new Date('2026-03-01T15:30:00Z').toISOString(),
    },
    // 10. Rejected: Order Ineligible (Status: disputed)
    {
      id: 'ord_demo_10_reject_disputed',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_02',
      items: [{ sku: 'SKU-ANC-HEADPHONE', name: 'Apex SoundWave Pro Headphones', quantity: 1, price: 12999 }],
      total_amount: 12999,
      status: 'disputed',
      created_at: new Date('2026-03-01T16:00:00Z').toISOString(),
    },
    // 11. Rejected: Duplicate Offer (One offer per order rule)
    {
      id: 'ord_demo_11_reject_duplicate',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_03',
      items: [{ sku: 'SKU-MS-WIRELESS', name: 'Apex Ultralight Wireless Gaming Mouse', quantity: 1, price: 4999 }],
      total_amount: 4999,
      status: 'paid',
      created_at: new Date('2026-03-01T16:25:00Z').toISOString(),
    },
    // 12. Rejected: SKU Not Found in Catalog (Invalid SKU)
    {
      id: 'ord_demo_12_reject_invalid_sku',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_04',
      items: [{ sku: 'SKU-CHAIR-ERGO', name: 'Apex AirMesh Ergonomic Executive Chair', quantity: 1, price: 18499 }],
      total_amount: 18499,
      status: 'paid',
      created_at: new Date('2026-03-01T17:00:00Z').toISOString(),
    },
    // 13. Failure Handled: Payment Link Expired Unconverted (TRD Section 8)
    {
      id: 'ord_demo_13_fail_expired',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_05',
      items: [{ sku: 'SKU-LP-15', name: 'TitanBook 15 Pro Ultrabook', quantity: 1, price: 89999 }],
      total_amount: 89999,
      status: 'paid',
      created_at: new Date('2026-03-01T17:40:00Z').toISOString(),
    },
    // 14. Action None: Customer already owns full accessory set
    {
      id: 'ord_demo_14_action_none',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_06',
      items: [
        { sku: 'SKU-KB-PRO', name: 'Apex Pro Mechanical Keyboard', quantity: 1, price: 8499 },
        { sku: 'SKU-WR-WOOD', name: 'Walnut Wood Wrist Rest', quantity: 1, price: 1499 },
        { sku: 'SKU-KC-PBT', name: 'PBT Custom Keycap Set', quantity: 1, price: 2299 },
      ],
      total_amount: 12297,
      status: 'paid',
      created_at: new Date('2026-03-01T18:15:00Z').toISOString(),
    },
    // 15. Accepted: 4K Monitor -> ScreenBar Light (cross-sell)
    {
      id: 'ord_demo_15_mon_accept',
      merchant_id: SEED_MERCHANT_ID,
      customer_id: 'cust_07',
      items: [{ sku: 'SKU-MON-4K', name: 'Apex 27" 4K Creator Monitor', quantity: 1, price: 29999 }],
      total_amount: 29999,
      status: 'paid',
      created_at: new Date('2026-03-01T19:00:00Z').toISOString(),
    },
  ];

  for (const o of orders) {
    await db.saveOrder(o);
  }

  console.log(`✅ Seeded successfully:`);
  console.log(`   - 1 Merchant (${merchant.name})`);
  console.log(`   - ${catalog.length} Catalog SKUs`);
  console.log(`   - ${customers.length} Customers`);
  console.log(`   - ${orders.length} Orders tailored for the buildathon demonstration`);
}

// Execute if run directly via tsx
if (process.argv[1]?.includes('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
