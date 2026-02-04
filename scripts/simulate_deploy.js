const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");

console.log("==========================================");
console.log("🤖 SIMULATING GITHUB ACTIONS PAGES BUILD");
console.log("==========================================\n");

const rootDir = path.resolve(__dirname, "..");

try {
  // 1. Clean previous build folders (just like a fresh GA container)
  console.log("Step 1: Cleaning previous build output (.next, out)...");
  const foldersToClean = [".next", "out"];
  foldersToClean.forEach(folder => {
    const p = path.join(rootDir, folder);
    if (fs.existsSync(p)) {
      console.log(`  Removing ${folder}...`);
      fs.rmSync(p, { recursive: true, force: true });
    }
  });
  console.log("  Clean-up successful!\n");

  // 2. Install dependencies
  console.log("Step 2: Simulating 'npm install --legacy-peer-deps'...");
  execSync("npm install --legacy-peer-deps", { cwd: rootDir, stdio: "inherit" });
  console.log("  Dependencies verified successfully!\n");

  // 3. Build & Static Export
  console.log("Step 3: Simulating 'next build' (Static Export)...");
  execSync("npm run build", { cwd: rootDir, stdio: "inherit" });
  console.log("  Static build compiled and exported to the 'out/' directory successfully!\n");

  // 4. Verify Export Integrity
  const outDir = path.join(rootDir, "out");
  if (!fs.existsSync(outDir)) {
    throw new Error("Critical Error: 'out/' directory was not generated!");
  }
  
  const indexHtml = path.join(outDir, "index.html");
  if (!fs.existsSync(indexHtml)) {
    throw new Error("Critical Error: 'out/index.html' is missing!");
  }
  console.log("Step 4: Verification Passed! Local build matches production standards.\n");

  // 5. Fire up local static production server
  console.log("Step 5: Starting Local Static Production Server on port 4000...");
  const server = http.createServer((req, res) => {
    let filePath = path.join(outDir, req.url === "/" ? "index.html" : req.url);
    
    // Simple SPA / Next.js routing fallback: if file doesn't exist, check for [file].html
    if (!fs.existsSync(filePath)) {
      const htmlPath = filePath + ".html";
      if (fs.existsSync(htmlPath)) {
        filePath = htmlPath;
      } else {
        // Redirect empty routes / sub-routes to localized pages
        filePath = path.join(outDir, "index.html");
      }
    }

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end("<h1>404 Not Found</h1>", "utf-8");
      } else {
        // Simple MIME type resolver
        let contentType = "text/html";
        const ext = path.extname(filePath);
        if (ext === ".js") contentType = "text/javascript";
        else if (ext === ".css") contentType = "text/css";
        else if (ext === ".svg") contentType = "image/svg+xml";
        else if (ext === ".ico") contentType = "image/x-icon";
        
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content, "utf-8");
      }
    });
  });

  server.listen(4000, () => {
    console.log("\n==========================================");
    console.log("🎉 LOCAL GITHUB PAGES DEPLOY SIMULATION ACTIVE!");
    console.log("👉 Test your live site at: http://localhost:4000/en");
    console.log("👉 Test your live site at: http://localhost:4000/pt");
    console.log("Press Ctrl + C to stop the server.");
    console.log("==========================================\n");
  });

} catch (error) {
  console.error("\n❌ SIMULATION FAILED!");
  console.error(error.message);
  process.exit(1);
}
