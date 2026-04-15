import { Buffer } from "https://esm.sh/buffer@6.0.3?bundle";
import processPolyfill from "https://esm.sh/process@0.11.10?bundle";

const g = globalThis;
g.global ??= g;
g.process ??= processPolyfill;
g.process.env ??= {};
g.process.nextTick ??= (fn, ...args) => Promise.resolve().then(() => fn(...args));
g.Buffer ??= Buffer;
