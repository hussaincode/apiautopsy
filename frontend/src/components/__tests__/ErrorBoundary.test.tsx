import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';

function BrokenChild(): JSX.Element {
  throw new Error('Storage is blocked');
}

describe('ErrorBoundary', () => {
  it('renders a recovery screen instead of a blank app when rendering fails', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>
    );

    expect(screen.getByRole('heading', { name: /could not load this workspace/i })).toBeInTheDocument();
    expect(screen.getByText('Storage is blocked')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reload apiautopsy/i })).toBeInTheDocument();
  });
});
