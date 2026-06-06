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

declare const LogoLoop: (props: LogoLoopProps) => ReactNode;
export default LogoLoop;
