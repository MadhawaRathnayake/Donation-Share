import { useContext } from 'react';
import { ToastContext } from '../context/toast-context';

export const useToast = () => {
  const value = useContext(ToastContext);
  if (!value) throw new Error('useToast must be used inside ToastProvider');
  return value;
};
