import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ToastProvider, useToast } from '../components/ToastProvider';

const TestComponent: React.FC = () => {
  const { toast } = useToast();
  return (
    <div>
      <button onClick={() => toast.success('First Toast Message')}>Add First</button>
      <button onClick={() => toast.error('Second Toast Message')}>Add Second</button>
    </div>
  );
};

describe('ToastProvider', () => {
  it('queues multiple toasts and renders them in order', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    const btn1 = screen.getByText('Add First');
    const btn2 = screen.getByText('Add Second');

    act(() => {
      btn1.click();
    });
    act(() => {
      btn2.click();
    });

    const firstToast = screen.getByText('First Toast Message');
    const secondToast = screen.getByText('Second Toast Message');

    expect(firstToast).toBeInTheDocument();
    expect(secondToast).toBeInTheDocument();

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('First Toast Message');
    expect(alerts[1]).toHaveTextContent('Second Toast Message');
  });
});
