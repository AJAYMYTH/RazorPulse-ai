import Razorpay from 'razorpay';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const key_id = process.env.RAZORPAY_KEY_ID?.trim();
  const key_secret = process.env.RAZORPAY_KEY_SECRET?.trim();

  if (!key_id || !key_secret || !key_id.startsWith('rzp_')) {
    return res.status(400).json({ error: 'RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not set or invalid' });
  }

  const { amount = 1169, description = 'Offer: Product Demo', customer } = req.body || {};

  try {
    const rzp = new Razorpay({ key_id, key_secret });
    const link = await rzp.paymentLink.create({
      amount: Math.round(Number(amount) * 100),
      currency: 'INR',
      accept_partial: false,
      reference_id: `upsellx_${Date.now().toString(36)}`,
      description: description.slice(0, 30),
      customer: {
        name: customer?.name || 'Demo Customer',
        email: customer?.email || 'customer@example.com',
        contact: customer?.contact || '+919876543210',
      },
      notify: { sms: false, email: false },
    });

    return res.status(200).json({
      success: true,
      link: {
        id: link.id,
        short_url: link.short_url,
        amount: link.amount,
        status: link.status,
      },
    });
  } catch (err) {
    // If quota limit (30 reached in test mode), fallback to retrieving active created link
    try {
      const rzp = new Razorpay({ key_id, key_secret });
      const all = await rzp.paymentLink.all({ count: 20 });
      const created = (all.payment_links || []).find((l) => l.status === 'created');
      if (created) {
        return res.status(200).json({
          success: true,
          notice: err.message,
          link: {
            id: created.id,
            short_url: created.short_url,
            amount: created.amount,
            status: created.status,
          },
        });
      }
    } catch (_) {}

    return res.status(500).json({ error: err.message });
  }
}
