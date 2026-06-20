import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export function HeartbeatAnimation({ className = "w-32 h-32 text-primary" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full drop-shadow-lg">
        <path
          d="M 10 50 L 30 50 L 40 20 L 50 80 L 60 40 L 65 50 L 90 50"
          strokeDasharray="250"
          strokeDashoffset="250"
        >
          <animate attributeName="stroke-dashoffset" values="250;0;0" keyTimes="0;0.6;1" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.8;1" dur="1.5s" repeatCount="indefinite" />
        </path>
      </svg>
    </div>
  );
}

export function FullScreenOverlay({ 
  show, 
  type, 
  message, 
  onClose 
}: { 
  show: boolean; 
  type: 'loading' | 'success' | 'error'; 
  message?: string;
  onClose?: () => void;
}) {
  const [render, setRender] = useState(show);

  useEffect(() => {
    if (show) setRender(true);
    else {
      const t = setTimeout(() => setRender(false), 300);
      return () => clearTimeout(t);
    }
  }, [show]);

  if (!render) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/95 backdrop-blur-md transition-opacity duration-300 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className={`text-center p-10 bg-card rounded-3xl shadow-2xl border transform transition-all duration-500 ${show ? 'scale-100 translate-y-0' : 'scale-90 translate-y-8'} ${
        type === 'error' ? 'border-destructive/30' : type === 'success' ? 'border-success/30' : 'border-primary/20'
      }`}>
        
        {type === 'loading' && (
          <div className="flex flex-col items-center">
            <HeartbeatAnimation className="w-32 h-32 text-primary mb-4" />
            <h2 className="text-2xl font-bold text-foreground animate-pulse">{message || 'Loading...'}</h2>
            <p className="text-sm text-muted-foreground mt-2">Connecting to SmartRx</p>
          </div>
        )}

        {type === 'success' && (
          <div className="flex flex-col items-center animate-bounce">
            <div className="w-24 h-24 bg-success/10 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-12 w-12 text-success" />
            </div>
            <h2 className="text-3xl font-bold text-foreground">{message || 'Success!'}</h2>
          </div>
        )}

        {type === 'error' && (
          <div className="flex flex-col items-center animate-shake">
            <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-6">
              <XCircle className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Error</h2>
            <p className="text-lg text-muted-foreground max-w-sm">{message || 'Something went wrong'}</p>
            {onClose && (
              <button onClick={onClose} className="mt-8 px-6 py-2.5 bg-destructive text-destructive-foreground rounded-full font-medium hover:bg-destructive/90 transition-colors">
                Try Again
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
