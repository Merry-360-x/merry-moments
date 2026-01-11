import { useState } from "react";

const Logo = ({ className = "" }: { className?: string }) => {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="relative w-10 h-10">
        {!useFallback ? (
          <img
            src="/brand/logo.png"
            alt="Merry 360 X"
            className="w-full h-full object-contain"
            loading="eager"
            onError={() => setUseFallback(true)}
          />
        ) : (
          <svg viewBox="0 0 40 40" className="w-full h-full" aria-label="Merry 360 X">
            <circle cx="20" cy="20" r="3" fill="hsl(var(--primary))" />
            {[0, 60, 120, 180, 240, 300].map((angle, i) => {
              const x = 20 + 7 * Math.cos((angle * Math.PI) / 180);
              const y = 20 + 7 * Math.sin((angle * Math.PI) / 180);
              return <circle key={`inner-${i}`} cx={x} cy={y} r="2" fill="hsl(var(--foreground))" />;
            })}
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
              const x = 20 + 14 * Math.cos((angle * Math.PI) / 180);
              const y = 20 + 14 * Math.sin((angle * Math.PI) / 180);
              return <circle key={`outer-${i}`} cx={x} cy={y} r="2" fill="hsl(var(--foreground))" />;
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

export default Logo;
