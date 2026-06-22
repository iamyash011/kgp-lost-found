import React from 'react';
import { MessageCircle } from 'lucide-react';

export default function FeedbackButton() {
  return (
    <a
      href="https://forms.gle/XM2zBNtSuZ2vNEq17"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 md:bottom-8 right-4 md:right-8 z-50 btn-gold"
      style={{
        padding: '12px 24px',
        borderRadius: '999px',
        boxShadow: '0 8px 24px rgba(0, 208, 156, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        textDecoration: 'none',
      }}
    >
      <MessageCircle size={20} />
      Feedback
    </a>
  );
}
