import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PublicStatusPage } from '../PublicStatusPage';

vi.mock('../../api/hooks', () => ({
  usePublicStatus: () => ({
    data: {
      name: 'Production health',
      method: 'GET',
      url: 'https://api.example.com/health',
      status: 'OPERATIONAL',
      successRate: 99.9,
      avgLatencyMs: 120,
      p95LatencyMs: 220,
      uptimeTarget: 99,
      totalRuns: 10,
      recentExecutions: [
        { executedAt: new Date('2026-05-06T10:00:00Z').toISOString(), success: true, statusCode: 200, responseTimeMs: 110 },
        { executedAt: new Date('2026-05-06T10:05:00Z').toISOString(), success: false, statusCode: 500, responseTimeMs: 980 }
      ],
      incidents: [{
        id: 'incident-1',
        executionId: 'execution-123456',
        status: 'RESOLVED',
        stateLabel: 'Recovered',
        reason: 'Request failed with status 500',
        openedAt: '2026-05-06T10:05:00Z',
        resolvedAt: '2026-05-06T10:10:00Z',
        lastTriggeredAt: '2026-05-06T10:05:00Z',
        durationSeconds: 300
      }]
    },
    isLoading: false,
    isError: false
  })
}));

describe('PublicStatusPage', () => {
  it('renders public synthetic monitor status without auth context', () => {
    render(<PublicStatusPage slug="production-health" />);

    expect(screen.getAllByText('Production health').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Operational').length).toBeGreaterThan(0);
    expect(screen.getByText('Public API health page for clients and teams')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('220 ms')).toBeInTheDocument();
    expect(screen.getByText('Uptime over the past 90 days')).toBeInTheDocument();
    expect(screen.getAllByText('99.90% uptime').length).toBeGreaterThan(0);
    expect(screen.getByText('Partial outage')).toBeInTheDocument();
    expect(screen.getByText('1 failed checks and 1 successful checks were recorded.')).toBeInTheDocument();
    expect(screen.getByText('Incident history')).toBeInTheDocument();
    expect(screen.getByText('Recovered')).toBeInTheDocument();
    expect(screen.getByText('Request failed with status 500')).toBeInTheDocument();
  });
});
