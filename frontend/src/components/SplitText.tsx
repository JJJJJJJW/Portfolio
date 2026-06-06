import type { ReactNode } from "react";
import OriginalSplitText from "./SplitText.jsx";

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

export default function SplitText(props: SplitTextProps): ReactNode {
  return <OriginalSplitText {...(props as any)} />;
}
