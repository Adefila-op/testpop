#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const migrationsDir = path.join(repoRoot, "supabase", "migrations");
const outputPath = path.join(repoRoot, "SUPABASE_SCHEMA.sql");

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort((a, b) => a.localeCompare(b));

if (migrationFiles.length === 0) {
  throw new Error(`No SQL migrations found in ${migrationsDir}`);
}

const header = [
  "-- Generated bootstrap schema",
  `-- Generated at ${new Date().toISOString()}`,
  "-- Source: supabase/migrations/*.sql in lexical order",
  "-- Apply this entire file to a fresh Supabase project to bootstrap the current app schema.",
  "",
];

const sections = migrationFiles.flatMap((fileName) => {
  const fullPath = path.join(migrationsDir, fileName);
  const sql = fs.readFileSync(fullPath, "utf8").trim();
  return [
    "-- ============================================================================",
    `-- Migration: ${fileName}`,
    "-- ============================================================================",
    sql,
    "",
  ];
});

fs.writeFileSync(outputPath, `${header.join("\n")}${sections.join("\n")}`, "utf8");

console.log(`Wrote ${outputPath}`);
