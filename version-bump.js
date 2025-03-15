#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

// Les package.json
const packagePath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

// Parse nåværende versjon
const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split(".").map(Number);

// Øk patch-versjon
const newVersion = `${major}.${minor}.${patch + 1}`;
packageJson.version = newVersion;

// Skriv endringene til package.json
fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + "\n");

console.log(`Versjon økt fra ${currentVersion} til ${newVersion}`);
