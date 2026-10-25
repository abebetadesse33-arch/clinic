export const basePath = "/health";

export function withBasePath(path: string) {
  return `${basePath}${path.startsWith("/") ? path : `/${path}`}`;
}
