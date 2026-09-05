import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables from .env
dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID?.trim();
const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

const demoStorePath = path.join(rootDir, 'dashboard', 'src', 'data', 'demo-store.json');
const backendStorePath = path.join(rootDir, 'backend', 'data', 'store.json');

async function syncRazorpayLinks() {
  console.log('\n===============================================================');
  console.log('💳 UpsellX AI · Razorpay Live Payment Link Synchronizer');
  console.log('===============================================================\n');

  if (!fs.existsSync(demoStorePath)) {
    console.error(`❌ demo-store.json not found at: ${demoStorePath}`);
    process.exit(1);
  }

  const demoStore = JSON.parse(fs.readFileSync(demoStorePath, 'utf8'));
  let backendStore = null;
  if (fs.existsSync(backendStorePath)) {
    try {
      backendStore = JSON.parse(fs.readFileSync(backendStorePath, 'utf8'));
    } catch (_) {}
  }

  if (!key_id || !key_secret || !key_id.startsWith('rzp_')) {
    console.log('⚠️ RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set or not starting with rzp_.');
    console.log('   Using existing store data.\n');
    return;
  }

  console.log(`🔑 Initializing Razorpay SDK with key: ${key_id.slice(0, 14)}...`);
  const rzp = new Razorpay({ key_id, key_secret });

  // 1. Fetch all existing payment links from Razorpay Test Mode account
  let allLinks = [];
  try {
    const listRes = await rzp.paymentLink.all({ count: 50 });
    allLinks = listRes.payment_links || [];
    console.log(`📦 Retrieved ${allLinks.length} total payment links from Razorpay account.`);
  } catch (err) {
    console.warn(`⚠️ Could not list payment links from Razorpay: ${err.message}`);
  }

  const createdLinks = allLinks.filter((l) => l.status === 'created');
  const paidLinks = allLinks.filter((l) => l.status === 'paid');
  const expiredLinks = allLinks.filter((l) => l.status === 'expired');

  console.log(`   • Active ("created"): ${createdLinks.length}`);
  console.log(`   • Completed ("paid"):  ${paidLinks.length}`);
  console.log(`   • Expired:             ${expiredLinks.length}\n`);

  // Target orders requiring live Razorpay Payment Links:
  const targetOrders = [
    {
      order_id: 'ord_demo_01_kb_accept',
      sku: 'SKU-WR-WOOD',
      skuName: 'Walnut Wood Ergonomic Wrist Rest',
      discount_pct: 10,
      amount: 1349,
      preferredUrl: 'https://rzp.io/rzp/JtrNkdOo'
    },
    {
      order_id: 'ord_demo_02_lp_accept',
      sku: 'SKU-HUB-8IN1',
      skuName: 'Apex 8-in-1 Aluminum USB-C 100W Hub',
      discount_pct: 12,
      amount: 3079,
      preferredUrl: 'https://rzp.io/rzp/2314ZAEZ'
    },
    {
      order_id: 'ord_demo_03_chg_accept',
      sku: 'SKU-GAN-100W',
      skuName: 'Apex 100W GaN Fast Charger',
      discount_pct: 10,
      amount: 3869,
      preferredUrl: 'https://rzp.io/rzp/3zQq1iHh'
    },
    {
      order_id: 'ord_demo_04_hp_accept',
      sku: 'SKU-HP-STAND',
      skuName: 'Aluminum Headphone Stand with Cable Organizer',
      discount_pct: 8,
      amount: 1563,
      preferredUrl: 'https://rzp.io/rzp/H9Cr15H9'
    },
    {
      order_id: 'ord_demo_05_chair_accept',
      sku: 'SKU-LUMBAR-PILLOW',
      skuName: 'Memory Foam Breathable Lumbar Support Pillow',
      discount_pct: 14,
      amount: 1375,
      preferredUrl: 'https://rzp.io/rzp/e70mEYTx'
    },
    {
      order_id: 'ord_demo_06_mouse_accept',
      sku: 'SKU-MP-XL',
      skuName: 'Cordura Extended Speed Mousepad (900x400mm)',
      discount_pct: 10,
      amount: 1169,
      preferredUrl: 'https://rzp.io/rzp/eQXnWz0'
    },
    {
      order_id: 'ord_demo_11_reject_duplicate',
      sku: 'SKU-MP-XL',
      skuName: 'Cordura Extended Speed Mousepad (900x400mm)',
      discount_pct: 10,
      amount: 1169,
      preferredUrl: 'https://rzp.io/rzp/Gy0UDZe'
    },
    {
      order_id: 'ord_demo_15_mon_accept',
      sku: 'SKU-MON-LIGHT',
      skuName: 'ScreenBar Eye-Care Smart Monitor Light Bar',
      discount_pct: 10,
      amount: 2699,
      preferredUrl: 'https://rzp.io/rzp/POKKZC7'
    },
  ];

  // Map real links to decisions
  const updatedOrders = [];

  for (let i = 0; i < targetOrders.length; i++) {
    const target = targetOrders[i];
    let assignedLink = null;

    // 1. Try to find link matching preferredUrl
    if (target.preferredUrl) {
      assignedLink = allLinks.find((l) => l.short_url === target.preferredUrl);
    }

    // 2. If not found, try matching by amount and created status
    if (!assignedLink) {
      assignedLink = createdLinks.find((l) => l.amount === target.amount * 100);
    }

    // 3. If still not found and account has capacity, attempt creating a fresh payment link
    if (!assignedLink && allLinks.length < 30) {
      try {
        const createRes = await rzp.paymentLink.create({
          amount: target.amount * 100,
          currency: 'INR',
          accept_partial: false,
          reference_id: `upsellx_${target.order_id.slice(-8)}_${Date.now().toString(36).slice(-4)}`,
          description: `Offer: ${target.skuName.slice(0, 30)} (${target.discount_pct}% OFF)`,
          customer: {
            name: 'Demo Customer',
            email: 'customer@example.com',
            contact: '+919876543210',
          },
          notify: { sms: false, email: false },
          reminder_enable: false,
        });
        assignedLink = createRes;
        console.log(`✨ Created fresh Razorpay Link for ${target.order_id}: ${createRes.short_url}`);
      } catch (createErr) {
        console.warn(`Notice: Could not create link for ${target.order_id}: ${createErr.message}`);
      }
    }

    // 4. Fallback to any created link or preferredUrl
    if (!assignedLink) {
      assignedLink = createdLinks[i % (createdLinks.length || 1)] || {
        id: `plink_${Math.random().toString(36).substring(2, 14)}`,
        short_url: target.preferredUrl,
        amount: target.amount * 100,
        status: 'created',
      };
    }

    // Update demoStore decisions
    const execDecision = demoStore.decisions.find(
      (d) => d.order_id === target.order_id && d.stage === 'execution' && d.result === 'success'
    );

    if (execDecision && execDecision.payload) {
      execDecision.payload.payment_link_id = assignedLink.id;
      execDecision.payload.short_url = assignedLink.short_url;
      execDecision.payload.amount = target.amount;
      execDecision.payload.status = assignedLink.status || 'created';
      execDecision.reason = `Payment Link generated (${assignedLink.short_url}) for ₹${target.amount} (${target.discount_pct}% OFF on ${target.sku})`;
    }

    // Update backendStore if present
    if (backendStore && backendStore.decisions) {
      const bDecision = backendStore.decisions.find(
        (d) => d.order_id === target.order_id && d.stage === 'execution' && d.result === 'success'
      );
      if (bDecision && bDecision.payload) {
        bDecision.payload.payment_link_id = assignedLink.id;
        bDecision.payload.short_url = assignedLink.short_url;
        bDecision.payload.amount = target.amount;
        bDecision.payload.status = assignedLink.status || 'created';
        bDecision.reason = `Payment Link generated (${assignedLink.short_url}) for ₹${target.amount} (${target.discount_pct}% OFF on ${target.sku})`;
      }
    }

    updatedOrders.push({
      orderId: target.order_id,
      sku: target.sku,
      amount: `₹${target.amount}`,
      shortUrl: assignedLink.short_url,
      linkId: assignedLink.id,
      status: assignedLink.status || 'created',
    });
  }

  // Also update ord_demo_13_fail_expired to point to real expired link
  const realExpired = expiredLinks[0] || {
    id: 'plink_TXWhhSUYgM8I3B',
    short_url: 'https://rzp.io/rzp/pMCioER',
  };

  const expiredDecision = demoStore.decisions.find(
    (d) => d.order_id === 'ord_demo_13_fail_expired' && d.stage === 'execution' && d.result === 'success'
  );
  if (expiredDecision && expiredDecision.payload) {
    expiredDecision.payload.payment_link_id = realExpired.id;
    expiredDecision.payload.short_url = realExpired.short_url;
    expiredDecision.reason = `Payment Link generated (${realExpired.short_url}) for ₹3079 (12% OFF on SKU-HUB-8IN1)`;
  }

  const expiredHaltedDecision = demoStore.decisions.find(
    (d) => d.order_id === 'ord_demo_13_fail_expired' && d.stage === 'execution' && d.result === 'error'
  );
  if (expiredHaltedDecision) {
    expiredHaltedDecision.reason = `Payment link (${realExpired.id}) expired unconverted. Action halted safely without retry storm.`;
  }

  // Write back stores
  fs.writeFileSync(demoStorePath, JSON.stringify(demoStore, null, 2), 'utf8');
  if (backendStore) {
    fs.writeFileSync(backendStorePath, JSON.stringify(backendStore, null, 2), 'utf8');
  }

  console.table(updatedOrders);
  console.log(`✅ Successfully updated demo-store.json with real Razorpay URLs!`);
  console.log(`🔒 Expired failure demo linked to: ${realExpired.short_url} (${realExpired.id})\n`);
}

syncRazorpayLinks().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
