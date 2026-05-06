import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RequestBuilder } from '../RequestBuilder';
import { emptyRequestDraft } from '../dashboardTypes';
import type { RequestDraft } from '../dashboardTypes';

function renderBuilder(draft: RequestDraft, onDraft = vi.fn()) {
  render(
    <RequestBuilder
      activeTab="params"
      certificates={[]}
      collections={[]}
      draft={draft}
      isSending={false}
      onDraft={onDraft}
      onSave={vi.fn()}
      onSend={vi.fn()}
      onTab={vi.fn()}
    />
  );
  return onDraft;
}

describe('RequestBuilder', () => {
  it('edits query params as key value rows', async () => {
    const onDraft = renderBuilder({ ...emptyRequestDraft(), params: '{"page":"1"}' });
    await userEvent.clear(screen.getByPlaceholderText('value'));
    await userEvent.type(screen.getByPlaceholderText('value'), '2');

    expect(onDraft).toHaveBeenLastCalledWith(expect.objectContaining({
      params: JSON.stringify({ page: '2' }, null, 2)
    }));
  });

  it('can add a new key value row', async () => {
    renderBuilder(emptyRequestDraft());
    await userEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getAllByPlaceholderText('key')).toHaveLength(1);
    expect(screen.getAllByPlaceholderText('value')).toHaveLength(1);
  });
});

