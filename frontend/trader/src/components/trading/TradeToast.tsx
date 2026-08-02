'use client';
import { useEffect } from 'react';

export function TradeToast({
  message,
  kind = 'ok',
  onDone,
}: {
  message: string | null;
  kind?: 'ok' | 'err';
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div className={`tt ${kind}`} role="status">
      {message}
      <style jsx>{`
        .tt {
          position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%);
          z-index: 90; padding: 12px 18px; border-radius: 10px;
          font-size: 13px; font-weight: 500;
          background: var(--panel); border: 1px solid var(--line); color: var(--text);
          box-shadow: var(--shadow-lg);
          animation: ttIn 0.22s ease;
        }
        .tt.ok { border-left: 3px solid var(--gain); }
        .tt.err { border-left: 3px solid var(--loss); }
        @keyframes ttIn {
          from { opacity: 0; transform: translate(-50%, 8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
}
