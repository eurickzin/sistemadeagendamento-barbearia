"use client";

import { useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  direction?: "left" | "right" | "up";
  delay?: number;
  className?: string;
}

export default function Reveal({
  children,
  direction = "left",
  delay = 0,
  className = "",
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    const elemento = ref.current;

    if (!elemento) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisivel(true);
          observer.unobserve(elemento);
        }
      },
      {
        threshold: 0.12,
      },
    );

    observer.observe(elemento);

    return () => observer.disconnect();
  }, []);

  const transformacoes = {
    left: "-translate-x-8",
    right: "translate-x-8",
    up: "translate-y-8",
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
      }}
      className={`
        transform transition-all duration-700 ease-out
        ${
          visivel
            ? "translate-x-0 translate-y-0 opacity-100"
            : `${transformacoes[direction]} opacity-0`
        }
        ${className}
      `}
    >
      {children}
    </div>
  );
}