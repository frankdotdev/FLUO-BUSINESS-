// Test-runner helper: resolves @fluo/* to the workspace source so tests run without a linked node_modules.
import { register } from "node:module";
register("./workspace-hook.mjs", import.meta.url);
