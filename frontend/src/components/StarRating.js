"use client";
import { useMemo, useState } from "react";

export default function StarRating({
  value = 0,
  onChange,
  readOnly = false,
  size = 20,
  className = ""
}) {
  const [hoverValue, setHoverValue] = useState(null);
  const displayValue = hoverValue ?? value ?? 0;

  const starStyle = useMemo(() => ({ width: size, height: size }), [size]);

  const commit = (idx) => {
    if (readOnly || !onChange) return;
    onChange(idx);
  };

  const enter = (idx) => {
    if (readOnly) return;
    setHoverValue(idx);
  };

  const leave = () => {
    if (readOnly) return;
    setHoverValue(null);
  };

  return (
    <div
      className={`inline-flex items-center ${className}`}
      style={{ lineHeight: 0 }}
      onMouseLeave={leave}
      aria-label={`Puan: ${displayValue} / 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(displayValue);
        return (
          <Star
            key={i}
            style={starStyle}
            className={`${filled ? "text-yellow-400" : "text-gray-300"} ${!readOnly && onChange ? "cursor-pointer" : ""}`}
            onMouseEnter={() => enter(i)}
            onClick={() => commit(i)}
            onTouchStart={() => enter(i)}
            onTouchEnd={() => commit(i)}
          />
        );
      })}
    </div>
  );
}

function Star({ className = "", style, onClick, onMouseEnter, onTouchStart, onTouchEnd }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (typeof onClick === "function") onClick(e);
        }
      }}
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}


