// Fixed: Replaced '/// <reference types="vite/client" />' with manual declarations
// because the environment reported it could not find the type definition file for 'vite/client'.

declare module '*.css' {
  const css: Record<string, string>;
  export default css;
}

declare module '*.svg' {
  const svg: string;
  export default svg;
}

declare module '*.png' {
  const png: string;
  export default png;
}

declare module '*.jpg' {
  const jpg: string;
  export default jpg;
}

declare module '*.jpeg' {
  const jpeg: string;
  export default jpeg;
}

declare module '*.gif' {
  const gif: string;
  export default gif;
}

declare module '*.webp' {
  const webp: string;
  export default webp;
}