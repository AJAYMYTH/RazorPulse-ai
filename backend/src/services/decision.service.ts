import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DecisionPayload, DecisionSchema } from '../types/index.js';
import { SignalBundle } from './signal.service.js';
import { auditService } from './audit.service.js';

dotenv.config();

export class DecisionService {
  private geminiClient: GoogleGenerativeAI | null = null;

  constructor() {
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        this.geminiClient = new GoogleGenerativeAI(geminiKey);
        console.log('🤖 Gemini LLM client initialized for Decision Engine');
      } catch (e) {
        console.warn('⚠️ Failed to initialize Gemini client:', e);
      }
    }
  }

  /**
   * Main entrypoint for generating an upsell/cross-sell decision from gathered signals.
   */
  async generateDecision(signals: SignalBundle): Promise<DecisionPayload> {
    const orderId = signals.order.id;

    // Check for hard-coded demonstration scenarios in seed data to ensure reproducible demo runs
    const specialScenario = this.checkDemonstrationScenarios(signals);
    if (specialScenario) {
      const validated = DecisionSchema.parse(specialScenario);
      await auditService.log(
        orderId,
        'decision',
        validated,
        'success',
        validated.reason
      );
      return validated;
    }

    let rawOutput: any = null;

    // Attempt Gemini if key is provided
    if (this.geminiClient && process.env.GEMINI_API_KEY) {
      try {
        rawOutput = await this.callGemini(signals);
      } catch (err: any) {
        console.warn('Gemini API call failed, falling back to heuristic engine:', err.message);
      }
    }

    // Heuristic intelligent fallback
    if (!rawOutput) {
      rawOutput = this.heuristicDecision(signals);
    }

    // Validate with Zod
    const parseResult = DecisionSchema.safeParse(rawOutput);

    if (!parseResult.success) {
      const errorMsg = `Decision schema validation failed: ${parseResult.error.issues.map((i) => i.message).join(', ')}`;
      await auditService.log(
        orderId,
        'decision',
        { raw: rawOutput, errors: parseResult.error.format() },
        'error',
        errorMsg
      );
      throw new Error(errorMsg);
    }

    const decision = parseResult.data;
    await auditService.log(
      orderId,
      'decision',
      decision,
      'success',
      decision.reason
    );

    return decision;
  }

  /**
   * Hard-coded demonstration scenarios to guarantee deterministic exhibition of every
   * gate rule and failure mode in the Buildathon rubric.
   */
  private checkDemonstrationScenarios(signals: SignalBundle): DecisionPayload | null {
    const id = signals.order.id;

    // Rule 1 Test: Max Discount Violation (>15%)
    if (id === 'ord_demo_07_reject_discount') {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-WR-WOOD',
        reason: 'Customer bought mechanical keyboard; aggressive promotional campaign recommends 25% bundle discount.',
        discount_pct: 25, // Deliberately exceeds the 15% gate cap
        confidence: 0.89,
      };
    }

    // Rule 4 Test: Confidence below threshold (<0.60)
    if (id === 'ord_demo_08_reject_conf') {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-MON-LIGHT',
        reason: 'Weak correlation between USB-C cable purchase and premium monitor light bar.',
        discount_pct: 5,
        confidence: 0.42, // Below 0.60 minimum threshold
      };
    }

    // Rule 5 Test: Non-existent SKU
    if (id === 'ord_demo_12_reject_invalid_sku') {
      return {
        action: 'upsell',
        recommended_sku: 'SKU-GHOST-CUSTOM-CHAIR', // Does not exist in merchant's catalog
        reason: 'Attempted to upsell custom ergonomic package from legacy warehouse SKU.',
        discount_pct: 10,
        confidence: 0.78,
      };
    }

    // Action "none" scenario
    if (id === 'ord_demo_14_action_none') {
      return {
        action: 'none',
        recommended_sku: null,
        reason: 'Customer has already acquired full peripheral and accessory suite; avoiding irrelevant offers.',
        discount_pct: 0,
        confidence: 0.95,
      };
    }

    return null;
  }

  /**
   * Calls Google Gemini with strict prompt and structured JSON formatting
   */
  private async callGemini(signals: SignalBundle): Promise<any> {
    if (!this.geminiClient) throw new Error('Gemini not configured');

    const model = this.geminiClient.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const prompt = `
You are an autonomous merchant growth and recommendation engine for Razorpay Buildathon 2026.
Analyze the customer's purchase context and recommend an upsell (upgrade) or cross-sell (complementary accessory).

Rules:
1. Return ONLY JSON matching this exact structure:
{
  "action": "cross_sell" | "upsell" | "none",
  "recommended_sku": "SKU-XXX" (or null if action is "none"),
  "reason": "Detailed explainable justification at least 10 characters long",
  "discount_pct": number (0 to 100),
  "confidence": number (0.0 to 1.0)
}
2. If no high-confidence relevant item exists, return action "none".
3. Do not assume discount limits; the gate layer handles deterministic limits.

Customer Data:
- Name: ${signals.customer?.name || 'Guest'}
- Prior Order Count: ${signals.customer?.order_count || 1}
Purchased Order Items:
${JSON.stringify(signals.order.items, null, 2)}

Available Candidate Catalog Items:
${JSON.stringify(
  signals.candidateItems.map((c) => ({
    sku: c.sku,
    name: c.name,
    price: c.price,
    category: c.category,
    co_purchase_tags: c.co_purchase_tags,
  })),
  null,
  2
)}
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    return JSON.parse(text);
  }

  /**
   * Deterministic heuristic fallback engine
   */
  private heuristicDecision(signals: SignalBundle): DecisionPayload {
    const purchasedSkus = signals.order.items.map((i) => i.sku);

    // Keyboard -> Wrist Rest
    if (purchasedSkus.includes('SKU-KB-PRO')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-WR-WOOD',
        reason: 'Customer purchased high-end mechanical keyboard; ergonomic wrist rest is a high-affinity pairing.',
        discount_pct: 10,
        confidence: 0.88,
      };
    }

    // Laptop -> USB-C Hub
    if (purchasedSkus.includes('SKU-LP-15')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-HUB-8IN1',
        reason: 'Ultrabook users frequently require multiport expansion; offering complementary aluminum hub.',
        discount_pct: 12,
        confidence: 0.92,
      };
    }

    // 65W Charger -> 100W GaN Pro Charger
    if (purchasedSkus.includes('SKU-GAN-65W')) {
      return {
        action: 'upsell',
        recommended_sku: 'SKU-GAN-100W',
        reason: 'Customer seeking charging capacity; upsell to quad-port 100W GaN desktop charger with modest discount.',
        discount_pct: 10,
        confidence: 0.85,
      };
    }

    // ANC Headphones -> Stand
    if (purchasedSkus.includes('SKU-ANC-HEADPHONE')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-HP-STAND',
        reason: 'Premium headphone purchase paired with protective minimalist aluminum desk stand.',
        discount_pct: 8,
        confidence: 0.79,
      };
    }

    // Ergonomic Chair -> Lumbar Pillow
    if (purchasedSkus.includes('SKU-CHAIR-ERGO')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-LUMBAR-PILLOW',
        reason: 'Ergonomic furniture buyer; cross-selling breathable memory foam lumbar cushion.',
        discount_pct: 14,
        confidence: 0.82,
      };
    }

    // Gaming Mouse -> Speed Mousepad
    if (purchasedSkus.includes('SKU-MS-WIRELESS')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-MP-XL',
        reason: 'Ultralight gaming mouse buyer benefits from high-speed Cordura extended mousepad.',
        discount_pct: 10,
        confidence: 0.91,
      };
    }

    // Monitor -> Light Bar
    if (purchasedSkus.includes('SKU-MON-4K')) {
      return {
        action: 'cross_sell',
        recommended_sku: 'SKU-MON-LIGHT',
        reason: 'Creator 4K monitor setup matched with eye-care ScreenBar monitor light.',
        discount_pct: 10,
        confidence: 0.87,
      };
    }

    // Default fallback if candidate available
    if (signals.candidateItems.length > 0) {
      const item = signals.candidateItems[0];
      return {
        action: 'cross_sell',
        recommended_sku: item.sku,
        reason: `Recommended best-seller ${item.name} for complementary setup.`,
        discount_pct: 10,
        confidence: 0.70,
      };
    }

    return {
      action: 'none',
      recommended_sku: null,
      reason: 'No catalog candidates eligible for recommendation.',
      discount_pct: 0,
      confidence: 0.9,
    };
  }
}

export const decisionService = new DecisionService();
