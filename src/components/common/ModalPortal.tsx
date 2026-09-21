import React from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders fixed overlays directly under <body>.
 *
 * The dashboard content area lives inside a `relative z-10` stacking context,
 * so any `fixed inset-0 z-50` modal rendered there is painted BELOW the header
 * (z-40) and sidebar — the backdrop fails to dim the chrome and tall modals
 * slide under the header. Portaling escapes that context.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) =>
  createPortal(children, document.body);
