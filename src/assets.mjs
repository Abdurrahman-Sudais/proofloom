// The offline review file supplies an embedded asset map; hosted builds use normal URLs.
export const asset = path => globalThis.__proofloomAssets?.[path] || path;
