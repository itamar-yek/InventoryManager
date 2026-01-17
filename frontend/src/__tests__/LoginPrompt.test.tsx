/**
 * Tests for LoginPrompt component
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPrompt from '../components/LoginPrompt';

// Wrap component with router for testing
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>{ui}</BrowserRouter>
  );
};

describe('LoginPrompt', () => {
  it('should not render when isOpen is false', () => {
    renderWithRouter(
      <LoginPrompt isOpen={false} onClose={() => {}} />
    );
    expect(screen.queryByText('Sign in required')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    renderWithRouter(
      <LoginPrompt isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText('Sign in required')).toBeInTheDocument();
  });

  it('should display default message', () => {
    renderWithRouter(
      <LoginPrompt isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText('You need to sign in to make changes to the inventory.')).toBeInTheDocument();
  });

  it('should display custom message when provided', () => {
    renderWithRouter(
      <LoginPrompt isOpen={true} onClose={() => {}} message="Custom message here" />
    );
    expect(screen.getByText('Custom message here')).toBeInTheDocument();
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithRouter(
      <LoginPrompt isOpen={true} onClose={onClose} />
    );
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('should have Sign in button', () => {
    renderWithRouter(
      <LoginPrompt isOpen={true} onClose={() => {}} />
    );
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });
});
