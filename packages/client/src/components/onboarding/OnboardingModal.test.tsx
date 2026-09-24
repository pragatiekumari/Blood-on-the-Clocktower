import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingModal } from './OnboardingModal.js';

describe('OnboardingModal', () => {
  it('starts on the Theme step and sequences Theme -> Goal -> Rules', () => {
    render(<OnboardingModal onClose={() => {}} />);
    expect(screen.getByText(/On the Stroke of Midnight/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Your Goal')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('The Rules')).toBeInTheDocument();
  });

  it('shows alignment-specific goal text when alignment is known', () => {
    render(<OnboardingModal onClose={() => {}} alignment="evil" />);
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/destroy the town/i)).toBeInTheDocument();
  });

  it('calls onClose after completing the final step', () => {
    const onClose = vi.fn();
    render(<OnboardingModal onClose={onClose} />);
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText("Let's Play"));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
