import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'READY',
    scenarios: [
      { id: 'ddos', name: 'SYN Flood DDoS Attack (64k rps)', layer: 'Kernel NIC Driver', latency: '0.004ms', rate: '100%' },
      { id: 'sqli', name: 'SQL Injection & Vault Brute Force', layer: 'NEX-AI Reflex Layer', latency: '0.045ms', rate: '100%' },
      { id: 'ransomware', name: 'Ransomware Web-Shell Defacement', layer: 'Autonomous Self-Repair', latency: '2.100ms', rate: '100%' },
      { id: 'credential_stuffing', name: 'Credential Stuffing & Botnet', layer: 'Honeypot Sandbox', latency: '0.012ms', rate: '100%' }
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario } = body;

    const mockSim = [
      {
        id: scenario || 'all',
        name: scenario === 'ddos' ? 'SYN Flood DDoS Attack (64k rps)' : scenario === 'sqli' ? 'SQL Injection & Vault Brute Force' : 'Full Spectrum Cyber War Game',
        totalAttacks: scenario === 'ddos' ? 64000 : 65762,
        mitigated: scenario === 'ddos' ? 64000 : 65762,
        successRate: 100.0,
        avgLatencyMs: 0.004,
        recoveryStatus: 'AUTOMATED ROLLBACK & XDP_DROP ENFORCED',
        defenseLayer: 'Dual-Brain AI + eBPF Kernel Grid'
      }
    ];

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: mockSim
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to execute war game simulation' }, { status: 500 });
  }
}
