/**
 * Login Prompt Component
 *
 * Modal that prompts users to login when they try to perform edit actions.
 */
import { useNavigate, useLocation } from 'react-router-dom';

interface LoginPromptProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

function LoginPrompt({ isOpen, onClose, message }: LoginPromptProps) {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOpen) return null;

  const handleLogin = () => {
    onClose();
    navigate('/login', { state: { from: location } });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-sm mx-4 shadow-xl">
        <h2 className="text-xl font-bold mb-2">Sign in required</h2>
        <p className="text-gray-600 mb-6">
          {message || 'You need to sign in to make changes to the inventory.'}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleLogin}
            className="btn-primary flex-1"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPrompt;
