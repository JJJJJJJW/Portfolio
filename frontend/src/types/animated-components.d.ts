declare module "../components/ColorBends" {
  import type { CSSProperties, ReactNode } from "react";

  export interface ColorBendsProps {
    className?: string;
    style?: CSSProperties;
    colors?: string[];
    rotation?: number;
    speed?: number;
    scale?: number;
    frequency?: number;
    warpStrength?: number;
    mouseInfluence?: number;
    parallax?: number;
    noise?: number;
    iterations?: number;
    intensity?: number;
    bandWidth?: number;
    transparent?: boolean;
    autoRotate?: number;
  }

  const ColorBends: (props: ColorBendsProps) => ReactNode;
  export default ColorBends;
}

declare module "../components/SplitText" {
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

  const SplitText: (props: SplitTextProps) => ReactNode;
  export default SplitText;
}

declare module "../components/LogoLoop" {
  import type { CSSProperties, ReactNode } from "react";

  export interface LogoLoopItem {
    node?: ReactNode;
    src?: string;
    srcSet?: string;
    sizes?: string;
    width?: number;
    height?: number;
    alt?: string;
    title?: string;
    href?: string;
    ariaLabel?: string;
  }

  export interface LogoLoopProps {
    logos: LogoLoopItem[];
    speed?: number;
    direction?: "left" | "right" | "up" | "down";
    width?: number | string;
    logoHeight?: number;
    gap?: number;
    pauseOnHover?: boolean;
    hoverSpeed?: number;
    fadeOut?: boolean;
    fadeOutColor?: string;
    scaleOnHover?: boolean;
    renderItem?: (item: LogoLoopItem, key: number | string) => ReactNode;
    ariaLabel?: string;
    className?: string;
    style?: CSSProperties;
  }

  const LogoLoop: (props: LogoLoopProps) => ReactNode;
  export default LogoLoop;
}

declare module "../LiveBackground" {
  import type { ReactNode } from "react";

  const LiveBackground: () => ReactNode;
  export default LiveBackground;
}
