import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MobileNav } from '../components/MobileNav';

describe('MobileNav toggle component', () => {
  it('toggles mobile navigation, updates aria-expanded, and controls visibility', async () => {
    const user = userEvent.setup();
    const handleSelect = vi.fn();
    const items = [
      { id: 'home', label: 'Home' },
      { id: 'settings', label: 'Settings' }
    ];

    render(
      <MobileNav
        items={items}
        onSelect={handleSelect}
        activeId="home"
      />
    );

    const toggleBtn = screen.getByRole('button', { name: /toggle navigation menu/i });

    // Verify button starts with aria-expanded=false
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Verify the nav panel is not rendered/visible
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();

    // Click to open the nav panel
    await user.click(toggleBtn);

    // Verify button has aria-expanded=true
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');

    // Verify nav panel is visible and contains items
    const navMenu = screen.getByRole('navigation');
    expect(navMenu).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();

    // Click again to close the nav panel
    await user.click(toggleBtn);

    // Verify button reverts to aria-expanded=false and nav panel is removed
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
