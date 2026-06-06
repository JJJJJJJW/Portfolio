import type { CSSProperties } from "react";
import OriginalColorBends from "./ColorBends.jsx";

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

export default function ColorBends(props: ColorBendsProps) {
  return <OriginalColorBends {...(props as any)} />;
}
