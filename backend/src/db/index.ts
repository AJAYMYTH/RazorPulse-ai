import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  Merchant,
  CatalogItem,
  Customer,
  Order,
  DecisionRecord,
  User,
} from '../types/index.js';

// Ensure environment variables are loaded
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

interface InMemoryStore {
  merchants: Merchant[];
  catalog: CatalogItem[];
  customers: Customer[];
  orders: Order[];
  decisions: DecisionRecord[];
  users: User[];
}

class DatabaseService {
  private supabase: SupabaseClient | null = null;
  private localStore: InMemoryStore = {
    merchants: [],
    catalog: [],
    customers: [],
    orders: [],
    decisions: [],
    users: [],
  };
  public isSupabaseActive: boolean = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

    if (supabaseUrl && supabaseKey) {
      try {
        this.supabase = createClient(supabaseUrl, supabaseKey);
        this.isSupabaseActive = true;
        console.log('✅ Connected to Supabase PostgreSQL database');
      } catch (err) {
        console.warn('⚠️ Failed to initialize Supabase client, using local store:', err);
      }
    }

    if (!this.isSupabaseActive) {
      console.log('📦 Using local file-backed JSON store (data/store.json)');
      this.loadLocalStore();
    }
  }

  private loadLocalStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(STORE_FILE)) {
        const raw = fs.readFileSync(STORE_FILE, 'utf-8');
        this.localStore = JSON.parse(raw);
        if (!this.localStore.users) {
          this.localStore.users = [];
        }
        if (this.localStore.users.length === 0) {
          this.localStore.users.push({
            id: 'usr_demo_apex_01',
            name: 'Ajay Kumar',
            email: 'demo@razorpulse.ai',
            password_hash: 'buildathon2026',
            merchant_id: 'mch_apex_gear_001',
            company_name: 'Apex Electronics & Tech Gear',
            role: 'owner',
            created_at: '2026-01-01T00:00:00Z',
          });
          this.persistLocalStore();
        }
      } else {
        this.localStore.users = [
          {
            id: 'usr_demo_apex_01',
            name: 'Ajay Kumar',
            email: 'demo@razorpulse.ai',
            password_hash: 'buildathon2026',
            merchant_id: 'mch_apex_gear_001',
            company_name: 'Apex Electronics & Tech Gear',
            role: 'owner',
            created_at: '2026-01-01T00:00:00Z',
          },
        ];
        this.persistLocalStore();
      }
    } catch (err) {
      console.error('Error loading local store:', err);
    }
  }

  private persistLocalStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_FILE, JSON.stringify(this.localStore, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting local store:', err);
    }
  }

  // --- USERS & AUTH ---
  async getUsers(): Promise<User[]> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('users').select('*');
      return data || [];
    }
    return this.localStore.users || [];
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.trim().toLowerCase();
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('users').select('*').ilike('email', normalizedEmail).single();
      return data || null;
    }
    return (this.localStore.users || []).find((u) => u.email.toLowerCase() === normalizedEmail) || null;
  }

  async saveUser(user: User): Promise<User> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('users').upsert(user);
      return user;
    }
    if (!this.localStore.users) {
      this.localStore.users = [];
    }
    const idx = this.localStore.users.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
    if (idx >= 0) {
      this.localStore.users[idx] = user;
    } else {
      this.localStore.users.push(user);
    }
    this.persistLocalStore();
    return user;
  }

  // --- MERCHANTS ---
  async getMerchant(id: string): Promise<Merchant | null> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('merchants').select('*').eq('id', id).single();
      return data || null;
    }
    return this.localStore.merchants.find((m) => m.id === id) || null;
  }

  async saveMerchant(merchant: Merchant): Promise<void> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('merchants').upsert(merchant);
      return;
    }
    const idx = this.localStore.merchants.findIndex((m) => m.id === merchant.id);
    if (idx >= 0) this.localStore.merchants[idx] = merchant;
    else this.localStore.merchants.push(merchant);
    this.persistLocalStore();
  }

  // --- CATALOG ---
  async getCatalog(merchantId: string): Promise<CatalogItem[]> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('catalog').select('*').eq('merchant_id', merchantId);
      return (data as CatalogItem[]) || [];
    }
    return this.localStore.catalog.filter((c) => c.merchant_id === merchantId);
  }

  async getCatalogItemBySku(merchantId: string, sku: string): Promise<CatalogItem | null> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase
        .from('catalog')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('sku', sku)
        .single();
      return (data as CatalogItem) || null;
    }
    return (
      this.localStore.catalog.find(
        (c) => c.merchant_id === merchantId && c.sku.toLowerCase() === sku.toLowerCase()
      ) || null
    );
  }

  async saveCatalog(items: CatalogItem[]): Promise<void> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('catalog').upsert(items);
      return;
    }
    for (const item of items) {
      const idx = this.localStore.catalog.findIndex((c) => c.id === item.id);
      if (idx >= 0) this.localStore.catalog[idx] = item;
      else this.localStore.catalog.push(item);
    }
    this.persistLocalStore();
  }

  // --- CUSTOMERS ---
  async getCustomer(id: string): Promise<Customer | null> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('customers').select('*').eq('id', id).single();
      return (data as Customer) || null;
    }
    return this.localStore.customers.find((c) => c.id === id) || null;
  }

  async saveCustomer(customer: Customer): Promise<void> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('customers').upsert(customer);
      return;
    }
    const idx = this.localStore.customers.findIndex((c) => c.id === customer.id);
    if (idx >= 0) this.localStore.customers[idx] = customer;
    else this.localStore.customers.push(customer);
    this.persistLocalStore();
  }

  // --- ORDERS ---
  async getOrder(id: string): Promise<Order | null> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase.from('orders').select('*').eq('id', id).single();
      return (data as Order) || null;
    }
    return this.localStore.orders.find((o) => o.id === id) || null;
  }

  async getOrders(merchantId?: string): Promise<Order[]> {
    if (this.isSupabaseActive && this.supabase) {
      let query = this.supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (merchantId) query = query.eq('merchant_id', merchantId);
      const { data } = await query;
      return (data as Order[]) || [];
    }
    let list = [...this.localStore.orders];
    if (merchantId) list = list.filter((o) => o.merchant_id === merchantId);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async saveOrder(order: Order): Promise<void> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('orders').upsert(order);
      return;
    }
    const idx = this.localStore.orders.findIndex((o) => o.id === order.id);
    if (idx >= 0) this.localStore.orders[idx] = order;
    else this.localStore.orders.push(order);
    this.persistLocalStore();
  }

  // --- DECISIONS (APPEND-ONLY AUDIT LOG) ---
  async appendDecision(record: Omit<DecisionRecord, 'id' | 'created_at'>): Promise<DecisionRecord> {
    const fullRecord: DecisionRecord = {
      ...record,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };

    if (this.isSupabaseActive && this.supabase) {
      const { data, error } = await this.supabase
        .from('decisions')
        .insert(fullRecord)
        .select()
        .single();
      if (error) {
        console.error('Failed to append decision in Supabase:', error);
      }
      return (data as DecisionRecord) || fullRecord;
    }

    // Append-only invariant
    this.localStore.decisions.push(fullRecord);
    this.persistLocalStore();
    return fullRecord;
  }

  async getDecisionsForOrder(orderId: string): Promise<DecisionRecord[]> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase
        .from('decisions')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });
      return (data as DecisionRecord[]) || [];
    }
    return this.localStore.decisions
      .filter((d) => d.order_id === orderId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  async getAllDecisions(): Promise<DecisionRecord[]> {
    if (this.isSupabaseActive && this.supabase) {
      const { data } = await this.supabase
        .from('decisions')
        .select('*')
        .order('created_at', { ascending: true });
      return (data as DecisionRecord[]) || [];
    }
    return [...this.localStore.decisions].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

  async clearAll(): Promise<void> {
    if (this.isSupabaseActive && this.supabase) {
      await this.supabase.from('decisions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await this.supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await this.supabase.from('customers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await this.supabase.from('catalog').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await this.supabase.from('merchants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      return;
    }
    this.localStore = {
      merchants: [],
      catalog: [],
      customers: [],
      orders: [],
      decisions: [],
      users: [],
    };
    this.persistLocalStore();
  }
}

export const db = new DatabaseService();
