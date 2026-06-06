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

declare const ColorBends: (props: ColorBendsProps) => ReactNode;
export default ColorBends;
