/// <reference types="vite/client" />

declare module "*.jsx" {
  const Component: any;
  export default Component;
}

declare module "*.js" {
  const Module: any;
  export default Module;
}

declare module "../components/ColorBends" {
  const ColorBends: any;
  export default ColorBends;
}

declare module "../components/SplitText" {
  const SplitText: any;
  export default SplitText;
}

declare module "../components/LogoLoop" {
  const LogoLoop: any;
  export default LogoLoop;
}

declare module "../LiveBackground" {
  const LiveBackground: any;
  export default LiveBackground;
}
