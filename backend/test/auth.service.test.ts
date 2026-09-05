import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/db/index.js';
import { User } from '../src/types/index.js';

describe('Merchant Authentication & User Session Services', () => {
  it('Retrieves default demo merchant admin user', async () => {
    const user = await db.getUserByEmail('demo@razorpulse.ai');
    expect(user).not.toBeNull();
    expect(user?.email).toBe('demo@razorpulse.ai');
    expect(user?.role).toBe('owner');
    expect(user?.merchant_id).toBe('mch_apex_gear_001');
    expect(user?.company_name).toBe('Apex Electronics & Tech Gear');
  });

  it('Verifies correct password authentication', async () => {
    const user = await db.getUserByEmail('demo@razorpulse.ai');
    expect(user?.password_hash).toBe('buildathon2026');
  });

  it('Rejects authentication lookup for nonexistent email', async () => {
    const user = await db.getUserByEmail('nonexistent@randomdomain.xyz');
    expect(user).toBeNull();
  });

  it('Creates and persists a new registered merchant user', async () => {
    const testEmail = `test_${Date.now()}@urbanstore.in`;
    const newUser: User = {
      id: `usr_${Date.now()}`,
      name: 'Priya Sharma',
      email: testEmail,
      password_hash: 'securepass123',
      merchant_id: `mch_${Date.now()}`,
      company_name: 'Urban Luxe Store',
      role: 'owner',
      created_at: new Date().toISOString(),
    };

    const saved = await db.saveUser(newUser);
    expect(saved.email).toBe(testEmail);

    const fetched = await db.getUserByEmail(testEmail);
    expect(fetched).not.toBeNull();
    expect(fetched?.name).toBe('Priya Sharma');
    expect(fetched?.company_name).toBe('Urban Luxe Store');
    expect(fetched?.role).toBe('owner');
  });
});
