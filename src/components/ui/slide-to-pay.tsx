import { useCallback, useEffect, useRef, useState } from "react";

type SlideState = "idle" | "dragging" | "processing" | "success" | "failed";

interface SlideToPayProps {
  label?: string;
  amount?: string;
  onConfirm: () => Promise<void>;
  onRetry?: () => void;
  state?: SlideState;
  disabled?: boolean;
}

export const SlideToPay = ({
  label = "Slide to pay",
  amount,
  onConfirm,
  onRetry,
  state: externalState = "idle",
  disabled = false,
}: SlideToPayProps) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [checkProgress, setCheckProgress] = useState(0);
  const isDragging = useRef(false);
  const animFrame = useRef<number>(0);
  const progressRef = useRef(0);
  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const state = externalState;
  const isLocked = state === "processing" || state === "success" || disabled;

  progressRef.current = progress;

  useEffect(() => {
    if (state === "success") {
      const duration = 600;
      const start = performance.now();
      const animate = (now: number) => {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        setCheckProgress(t);
        if (t < 1) animFrame.current = requestAnimationFrame(animate);
      };
      animFrame.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animFrame.current);
    } else {
      setCheckProgress(0);
    }
  }, [state]);

  const snapBack = useCallback(() => {
    const start = performance.now();
    const initial = progressRef.current;
    const animate = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / 200, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setProgress(initial * (1 - eased));
      if (t < 1) animFrame.current = requestAnimationFrame(animate);
      else setProgress(0);
    };
    animFrame.current = requestAnimationFrame(animate);
  }, []);

  const updateProgress = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const raw = (clientX - rect.left) / rect.width;
    setProgress(Math.max(0, Math.min(1, raw)));
  };

  const handleEnd = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const currentProgress = progressRef.current;
    if (currentProgress >= 0.9) {
      onConfirmRef.current().then(
        () => {},
        () => {}
      );
    } else {
      snapBack();
    }
  }, [snapBack]);

  const handleStart = (clientX: number) => {
    if (isLocked) return;
    isDragging.current = true;
    updateProgress(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current) return;
    updateProgress(clientX);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => handleMove(e.clientX);
    const onUp = () => handleEnd();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [handleEnd]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  useEffect(() => {
    const onMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);
    const onEnd = () => handleEnd();
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [handleEnd]);

  const onTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const activeColor = "#FF385C";
  const trackColor = "#F0F0F0";
  const failedColor = "#FFE5E5";
  const thumbSize = 50;
  const maxThumbLeft = 4;
  const isThumbLocked = isLocked || state === "failed";
  const thumbLeft = isThumbLocked
    ? `calc(100% - ${thumbSize + maxThumbLeft}px)`
    : `calc(${Math.max(0, progress * 100)}% - ${thumbSize * Math.max(0, progress)}px)`;

  const checkPathLength = 66;

  const handleRetry = () => {
    setProgress(0);
    onRetry?.();
  };

  return (
    <div
      ref={trackRef}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      style={{
        position: "relative",
        width: "100%",
        minWidth: 300,
        maxWidth: 480,
        height: 56,
        borderRadius: 28,
        backgroundColor:
          state === "success" ? activeColor :
          state === "failed" ? failedColor :
          trackColor,
        cursor: isLocked ? "default" : "pointer",
        userSelect: "none",
        overflow: "hidden",
        touchAction: "none",
        margin: "0 auto",
      }}
    >
      {/* Active fill overlay */}
      {state === "idle" && progress > 0.01 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 28,
            width: `${Math.max(progress * 100 + 2, 0)}%`,
            background: `linear-gradient(135deg, ${activeColor}, ${activeColor}dd)`,
            transition: isDragging.current ? "none" : "width 0.3s ease",
          }}
        />
      )}

      {/* Label */}
      {state === "idle" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            opacity: progress > 0.7 ? 0 : 1,
            transition: "opacity 0.12s ease",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontWeight: 700,
              fontSize: 15,
              color: "#222222",
            }}
          >
            {amount ? `${label} · ${amount}` : label}
          </span>
        </div>
      )}

      {/* Failed label */}
      {state === "failed" && (
        <div
          onClick={handleRetry}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="#E53935" />
            <path d="M6 6l6 6M12 6l-6 6" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span style={{ fontWeight: 600, fontSize: 14, color: "#E53935" }}>
            Payment failed — Tap to retry
          </span>
        </div>
      )}

      {/* Processing spinner */}
      {state === "processing" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 28 28">
            <circle
              cx="14" cy="14" r="11"
              fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"
            />
            <circle
              cx="14" cy="14" r="11"
              fill="none" stroke="white" strokeWidth="3"
              strokeDasharray="69.12" strokeDashoffset="69.12" strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform" type="rotate"
                from="0 14 14" to="360 14 14"
                dur="0.8s" repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dashoffset"
                values="69.12;17.28;69.12"
                dur="1.2s" repeatCount="indefinite"
              />
            </circle>
          </svg>
        </div>
      )}

      {/* Success checkmark */}
      {state === "success" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg width="36" height="36" viewBox="0 0 36 36">
            <path
              d="M9 18l6 6 12-12"
              fill="none" stroke="white" strokeWidth="3.5"
              strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={checkPathLength}
              strokeDashoffset={checkPathLength * (1 - checkProgress)}
              style={{ transition: "stroke-dashoffset 0.05s linear" }}
            />
          </svg>
        </div>
      )}

      {/* Thumb */}
      <div
        style={{
          position: "absolute",
          left: thumbLeft,
          top: 3,
          width: thumbSize,
          height: thumbSize,
          borderRadius: "50%",
          backgroundColor:
            state === "success" ? activeColor :
            state === "processing" ? activeColor :
            state === "failed" ? failedColor :
            "white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        {state === "success" ? (
          <svg width="20" height="20" viewBox="0 0 20 20">
            <path
              d="M4 10l4 4 8-8"
              fill="none" stroke="white" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        ) : state === "processing" ? (
          <svg width="18" height="18" viewBox="0 0 18 18">
            <circle
              cx="9" cy="9" r="7"
              fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2"
            />
            <circle
              cx="9" cy="9" r="7"
              fill="none" stroke="white" strokeWidth="2"
              strokeDasharray="43.98" strokeDashoffset="43.98" strokeLinecap="round"
            >
              <animateTransform
                attributeName="transform" type="rotate"
                from="0 9 9" to="360 9 9"
                dur="0.8s" repeatCount="indefinite"
              />
              <animate
                attributeName="stroke-dashoffset"
                values="43.98;10.99;43.98"
                dur="1.2s" repeatCount="indefinite"
              />
            </circle>
          </svg>
        ) : state === "failed" ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6 6l6 6M12 6l-6 6" stroke="#E53935" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg
            width={progress > 0.5 ? 18 : 22}
            height={22}
            viewBox="0 0 22 22"
            fill="none"
          >
            <path
              d={progress > 0.5 ? "M8 4l6 7-6 7" : "M10 6l4 5-4 5"}
              stroke="#222222" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
};
