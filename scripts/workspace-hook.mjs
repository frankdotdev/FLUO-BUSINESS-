const MAP = {
  "@fluo/core": "../packages/core/src/index.ts",
  "@fluo/core/client": "../packages/core/src/client.ts",
  "@fluo/adapters": "../packages/adapters/src/index.ts",
  "@fluo/db": "../packages/db/src/index.ts",
};
export async function resolve(specifier, context, next) {
  if (MAP[specifier]) return { url: new URL(MAP[specifier], import.meta.url).href, shortCircuit: true };
  return next(specifier, context);
}
