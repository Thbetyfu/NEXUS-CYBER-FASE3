import { NextResponse } from 'next/server';

export async function GET() {
  const currentPlan = process.env.NEXUS_SUBSCRIPTION_PLAN || 'ultrasafe';
  const licenseKey = process.env.NEXUS_LICENSE_KEY || 'NXS-ULTRASAFE-ENTERPRISE-DEV-KEY';
  const targetDomain = process.env.NEXUS_LICENSE_DOMAIN || 'localhost';

  const isB2G = targetDomain.endsWith('.go.id') || targetDomain.endsWith('.ac.id') || targetDomain.endsWith('.sch.id');

  return NextResponse.json({
    status: 'ACTIVE',
    valid: true,
    plan: currentPlan,
    coresAllowed: 16,
    domain: targetDomain,
    isB2G,
    licenseKey,
    plans: [
      { id: 'free', name: 'Free Tier', cores: 2, price: 'Rp 0 / bln', features: ['Core WAF Gateway', 'Basic Rate Limiting'] },
      { id: 'basic', name: 'Basic Enterprise', cores: 4, price: 'Rp 1.500.000 / bln', features: ['Reflex AI Filter', 'eBPF Kernel Drop'] },
      { id: 'pro', name: 'Pro Shield', cores: 8, price: 'Rp 4.500.000 / bln', features: ['Dual-Brain NEX-AI', 'Honeypot Sandbox', 'MTD Shuffling'] },
      { id: 'pro_plus', name: 'Pro+ Defense', cores: 16, price: 'Rp 9.000.000 / bln', features: ['Self-Repair Rollback', 'PQC Cryptography', 'SIEM Integration'] },
      { id: 'ultrasafe', name: 'Ultrasafe Sovereign (B2G/B2B)', cores: 64, price: 'Custom PO / LKPP', features: ['Unlimited Core Scale', 'B2G PO Bypass', 'Custom Model Tuning'] }
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, domain, tier, cores, poCode, licenseKey } = body;

    if (action === 'generate') {
      const generatedKey = `NXS-${(tier || 'pro').toUpperCase()}-${Buffer.from(JSON.stringify({
        domain: domain || 'localhost',
        cpu_cores: cores || 8,
        tier: tier || 'pro',
        issued_at: Math.floor(Date.now() / 1000),
        expires_at: Math.floor(Date.now() / 1000) + 31536000,
        bypass_po: poCode || null
      })).toString('base64url')}.sig_ok`;

      return NextResponse.json({
        success: true,
        licenseKey: generatedKey,
        domain: domain || 'localhost',
        tier: tier || 'pro',
        cores: cores || 8,
        poCode: poCode || null,
        message: 'License key successfully generated for B2B/B2G deployment'
      });
    }

    if (action === 'activate') {
      return NextResponse.json({
        success: true,
        status: 'ACTIVATED',
        valid: true,
        activatedKey: licenseKey,
        message: 'License key successfully activated on local gateway node'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process license request' }, { status: 500 });
  }
}
