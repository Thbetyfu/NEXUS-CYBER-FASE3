import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
    status: 'READY',
    engine: 'NEX-RED 5.0',
    scenarios: [
      { id: 'hybrid', name: 'SAST + live HTTP checks (lab target)', layer: 'NEX-RED' },
      { id: 'whitebox', name: 'White-box AST only', layer: 'NEX-RED' },
    ]
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario } = body;

    // Try calling NEX-RED Bridge Daemon (127.0.0.1:3004)
    try {
      const nexRedResp = await fetch('http://127.0.0.1:3004/api/v1/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target_url: process.env.NEX_RED_LIVE_TARGET || 'http://127.0.0.1:8080',
          mode: 'SCENARIO',
          scenario: scenario || 'all',
          async_run: false,
          enable_llm: false,
        }),
        signal: AbortSignal.timeout(8000)
      });

      if (nexRedResp.ok) {
        const data = await nexRedResp.json();
        const attempted = Number(data.summary?.attacks_attempted ?? 0);
        const mitigated = Number(data.summary?.mitigated_by_nexus ?? 0);
        return NextResponse.json({
          success: true,
          engine: 'NEX-RED',
          timestamp: new Date().toISOString(),
          results: [
            {
              id: scenario || 'all',
              name: `NEX-RED scenario ${scenario || 'all'}`,
              totalAttacks: attempted,
              mitigated,
              liveChecks: Number(data.summary?.live_checks_run ?? 0),
              successRate: attempted > 0 ? Math.round((mitigated / attempted) * 1000) / 10 : 0,
              defenseLayer: 'NEX-RED live posture (not eBPF XDP)',
            }
          ]
        });
      }
    } catch (e) {
      // Fallback if NEX-RED daemon is not currently active
    }

    // Default High-Fidelity Simulation Fallback
    const mockSim = [
      {
        id: scenario || 'all',
        name: 'NEX-RED bridge offline',
        totalAttacks: 0,
        mitigated: 0,
        successRate: 0,
        defenseLayer: 'Start NEX-RED bridge on 127.0.0.1:3004',
      }
    ];

    return NextResponse.json({
      success: true,
      engine: 'NEX-RED',
      timestamp: new Date().toISOString(),
      results: mockSim
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to execute war game simulation' }, { status: 500 });
  }
}
