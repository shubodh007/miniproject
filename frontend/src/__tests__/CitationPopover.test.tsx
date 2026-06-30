import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationPopover } from '../components/CitationPopover';

describe('CitationPopover focus trap', () => {
  it('handles focus trap and escape key interactions', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <CitationPopover
        index={1}
        url="https://ap.gov.in"
        title="AP Government Portal"
        snippet="This is a snippet from AP Gov"
        isOpen={true}
        onClose={handleClose}
        x={100}
        y={100}
      />
    );

    // Wait for the programmatically triggered focus setTimeout of 50ms in component
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 60));
    });

    const closeBtn = screen.getByRole('button', { name: /close reference detail/i });
    const link = screen.getByRole('link', { name: /visit portal/i });

    // Verify first focusable element gets focus automatically on open
    expect(document.activeElement).toBe(closeBtn);

    // Verify Tab cycles focus to next element (visit portal link)
    await user.tab();
    expect(document.activeElement).toBe(link);

    // Verify Tab cycles back to the first element (close button)
    await user.tab();
    expect(document.activeElement).toBe(closeBtn);

    // Verify Shift + Tab cycles back to the last element (visit portal link)
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(link);

    // Verify Escape key keypress calls the onClose handler
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalled();
  });
});
