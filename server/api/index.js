import express from "express";
import freshApp from "../freshApp.js";

const app = express();

// Vercel forwards /api/* requests to this function while preserving the /api
// prefix. Mount freshApp on both paths so local and deployed routing match.
app.use("/api", freshApp);
app.use(freshApp);

export default app;
