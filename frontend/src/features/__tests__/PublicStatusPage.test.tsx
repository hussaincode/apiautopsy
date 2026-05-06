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
      recentExecutions: [{ executedAt: new Date('2026-05-06T10:00:00Z').toISOString(), success: true, statusCode: 200, responseTimeMs: 110 }]
    },
    isLoading: false,
    isError: false
  })
}));

describe('PublicStatusPage', () => {
  it('renders public synthetic monitor status without auth context', () => {
    render(<PublicStatusPage slug="production-health" />);

    expect(screen.getByText('Production health')).toBeInTheDocument();
    expect(screen.getByText('OPERATIONAL')).toBeInTheDocument();
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('220 ms')).toBeInTheDocument();
  });
});
