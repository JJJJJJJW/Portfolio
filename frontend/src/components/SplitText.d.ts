import type { ReactNode } from "react";

export interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  duration?: number;
  ease?: string;
  splitType?: string;
  from?: { opacity?: number; y?: number; filter?: string; [key: string]: unknown };
  to?: { opacity?: number; y?: number; filter?: string; [key: string]: unknown };
  threshold?: number;
  rootMargin?: string;
  textAlign?: string;
  tag?: string;
  onLetterAnimationComplete?: () => void;
}

declare const SplitText: (props: SplitTextProps) => ReactNode;
export default SplitText;
