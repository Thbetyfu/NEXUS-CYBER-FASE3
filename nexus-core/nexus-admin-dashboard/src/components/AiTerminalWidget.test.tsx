import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AiTerminalWidget from './AiTerminalWidget';

// Mock EventSource
class MockEventSource {
  onmessage: ((e: any) => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  close = vi.fn();
}
global.EventSource = MockEventSource as any;

describe('AiTerminalWidget CLI and Output Renderer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Mock standard fetch
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes('/api/ai/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "ONLINE", latency_ms: 12, model: "QWEN3-CORE" }),
        });
      }
      if (url.includes('/api/csrf-token')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ csrf_token: "test-token" }),
        });
      }
      if (url.includes('/api/cli/execute')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ output: "[SUCCESS] Command executed.\n - Target: local\n-----------------" }),
        });
      }
      return Promise.reject(new Error("Unknown endpoint"));
    }) as any;
  });

  it('renders terminal correctly with loading status', async () => {
    render(<AiTerminalWidget />);
    expect(screen.getByText('Nexus Core Terminal')).toBeInTheDocument();
    expect(screen.getByText((content) => content.includes('N EX US'))).toBeInTheDocument();
  });

  it('filters commands and supports Tab key cycling', async () => {
    render(<AiTerminalWidget />);
    const input = screen.getByPlaceholderText('Type /help or @nexus [query]...') as HTMLInputElement;

    // Type "/s" to filter commands
    fireEvent.change(input, { target: { value: '/s' } });
    
    // Check suggestions list is rendered (e.g. /status, /stats, /shuffle, /sub )
    await waitFor(() => {
      expect(screen.getByText('Command Suggestions:')).toBeInTheDocument();
    });
    expect(screen.getByText('/status')).toBeInTheDocument();
    expect(screen.getByText('/stats')).toBeInTheDocument();

    // Press Tab to cycle to first suggestion (/status)
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('/status');

    // Press Tab again to cycle to second suggestion (/stats)
    fireEvent.keyDown(input, { key: 'Tab' });
    expect(input.value).toBe('/stats');

    // Press Shift+Tab to cycle back to first suggestion (/status)
    fireEvent.keyDown(input, { key: 'Tab', shiftKey: true });
    expect(input.value).toBe('/status');
  });

  it('clears suggestions on Escape key', async () => {
    render(<AiTerminalWidget />);
    const input = screen.getByPlaceholderText('Type /help or @nexus [query]...') as HTMLInputElement;

    // Type "/s"
    fireEvent.change(input, { target: { value: '/s' } });
    await waitFor(() => {
      expect(screen.getByText('Command Suggestions:')).toBeInTheDocument();
    });

    // Press Escape
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByText('Command Suggestions:')).not.toBeInTheDocument();
  });

  it('persists command history in localStorage', async () => {
    render(<AiTerminalWidget />);
    const input = screen.getByPlaceholderText('Type /help or @nexus [query]...') as HTMLInputElement;

    // Enter a command
    fireEvent.change(input, { target: { value: '/status' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    // Verify history was saved to localStorage
    await waitFor(() => {
      const stored = localStorage.getItem('nexus_cli_history');
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toContain('/status');
    });
  });
});
