// Ambient type definitions for Next.js modules
// Ensures IDE TypeScript server resolves types in containerized dev environments

declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_ANDROID_APK_URL?: string;
  }
}

declare module "next/server" {
  type MiddlewareResponseInit = ResponseInit & {
    request?: {
      headers?: Headers;
    };
  };

  export interface NextURL extends URL {
    clone(): NextURL;
  }

  export class NextRequest extends Request {
    readonly nextUrl: NextURL;
    readonly cookies: any;
    readonly ip?: string;
    readonly geo?: any;
  }

  export class NextResponse<Body = any> extends Response {
    static json<JsonBody>(body: JsonBody, init?: ResponseInit): NextResponse<JsonBody>;
    static redirect(url: string | URL, init?: number | ResponseInit): NextResponse<never>;
    static rewrite(destination: string | URL, init?: MiddlewareResponseInit): NextResponse<never>;
    static next(init?: MiddlewareResponseInit): NextResponse<never>;
    readonly cookies: any;
  }
}

declare module "next/navigation" {
  export function useRouter(): {
    push(href: string, options?: any): void;
    replace(href: string, options?: any): void;
    refresh(): void;
    back(): void;
    forward(): void;
    prefetch(href: string): void;
  };
  export function usePathname(): string;
  export function useSearchParams(): URLSearchParams;
  export function useParams<T = Record<string, string | string[]>>(): T;
  export function redirect(url: string): never;
  export function notFound(): never;
}

declare module "next/link" {
  import React from "react";
  export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
    href: string | object;
    as?: string | object;
    replace?: boolean;
    scroll?: boolean;
    shallow?: boolean;
    passHref?: boolean;
    prefetch?: boolean;
  }
  const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
  export default Link;
}
