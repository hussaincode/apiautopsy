import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ResponseViewer } from '../ResponseViewer';

describe('ResponseViewer', () => {
  it('shows empty state before a request is sent', () => {
    render(<ResponseViewer execution={undefined} isLoading={false} />);
    expect(screen.getByText(/No response yet/i)).toBeInTheDocument();
  });

  it('shows an active sending state while public execution is pending', () => {
    render(<ResponseViewer execution={undefined} isLoading />);
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('Sending')).toBeInTheDocument();
    expect(screen.getByText(/Waiting for response/i)).toBeInTheDocument();
  });

  it('renders execution metrics and payload', () => {
    render(
      <ResponseViewer
        isLoading={false}
        execution={{
          id: 'execution-1',
          apiRequestId: 'request-1',
          statusCode: 200,
          success: true,
          responseTimeMs: 123,
          responseHeaders: { 'content-type': 'application/json' },
          responseBody: '{"ok":true}',
          executedAt: new Date().toISOString(),
          responseSizeBytes: 11,
          assertionPassed: true
        }}
      />
    );

    expect(screen.getByText('200')).toBeInTheDocument();
    expect(screen.getByText('123 ms')).toBeInTheDocument();
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText(/"ok":true/)).toBeInTheDocument();
  });
});
