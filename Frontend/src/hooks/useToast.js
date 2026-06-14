/**
 * Re-exports the shared toast hook from the global store.
 * Any component importing from hooks/useToast gets the
 * same shared context instance.
 */
export { useToast } from '../store/toastStore'
