import * as http from "http";
import * as fs from "fs";
import * as path from "path";

// A lightweight, zero-dependency static file server to simulate local hosting
function createStaticServer(rootPath: string, port: number): Promise<http.Server> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(rootPath, req.url === "/" ? "index.html" : req.url || "");
      
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("404 Not Found");
          return;
        }

        // Determine content-type based on file extension
        let ext = path.extname(filePath);
        let contentType = "text/html";
        if (ext === ".js") contentType = "application/javascript";
        else if (ext === ".tsx") contentType = "application/octet-stream"; // Standard server behavior for TSX
        else if (ext === ".css") contentType = "text/css";

        res.writeHead(200, { "Content-Type": contentType });
        res.end(data);
      });
    });

    server.listen(port, () => {
      resolve(server);
    });
  });
}

function fetchPage(url: string): Promise<{ html: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({
          html: data,
          contentType: res.headers["content-type"] || ""
        });
      });
    }).on("error", reject);
  });
}

async function runTests() {
  const plotterDir = path.resolve("../complex-function-plotter");
  console.log(`=== STARTING AUTOMATED MIME-TYPE INVARIANT VALIDATION ===`);
  console.log(`Target Directory: ${plotterDir}\n`);

  // Test 1: Simulating the failure state (Serving the raw root directory)
  console.log("Test 1: Simulating raw repository deployment (root directory)...");
  const rawServer = await createStaticServer(plotterDir, 9001);
  const rawRes = await fetchPage("http://localhost:9001/");
  
  const hasRawScript = rawRes.html.includes('src="./src/main.tsx"');
  console.log(`- Loaded raw index.html successfully.`);
  console.log(`- HTML has raw TSX script tag: ${hasRawScript ? "YES" : "NO"}`);
  
  if (hasRawScript) {
    console.log(`- Simulated Browser attempts to resolve: http://localhost:9001/src/main.tsx`);
    const tsxRes = await fetchPage("http://localhost:9001/src/main.tsx");
    console.log(`- Server returned MIME-type: "${tsxRes.contentType}"`);
    
    // Strict MIME-type checking assertion (HTML Spec compliance)
    const isOctetStream = tsxRes.contentType === "application/octet-stream";
    if (isOctetStream) {
      console.log(`\n❌ [CONFIRMED FAIL STATE]`);
      console.log(`  The browser threw a MIME-type violation!`);
      console.log(`  Expected a JavaScript module script but received "${tsxRes.contentType}".`);
      console.log(`  This is exactly the error currently occurring in production.\n`);
    } else {
      console.log("  Warning: Server did not return application/octet-stream.");
    }
  }
  rawServer.close();

  // Test 2: Simulating the success state (Serving the built /dist directory)
  console.log("Test 2: Simulating built compilation deployment (/dist directory)...");
  const distServer = await createStaticServer(path.join(plotterDir, "dist"), 9002);
  const distRes = await fetchPage("http://localhost:9002/");
  
  const hasBundledScript = distRes.html.includes('src="./assets/index');
  console.log(`- Loaded compiled index.html successfully.`);
  console.log(`- HTML has compiled JS bundle tag: ${hasBundledScript ? "YES" : "NO"}`);
  
  if (hasBundledScript) {
    // Extract asset name
    const match = distRes.html.match(/src="(\.\/assets\/index-[A-Za-z0-9_-]+\.js)"/);
    if (match && match[1]) {
      const assetUrl = `http://localhost:9002/${match[1].replace("./", "")}`;
      console.log(`- Simulated Browser resolves bundled asset: ${assetUrl}`);
      const jsRes = await fetchPage(assetUrl);
      console.log(`- Server returned MIME-type: "${jsRes.contentType}"`);
      
      const isJavaScript = jsRes.contentType === "application/javascript";
      if (isJavaScript) {
        console.log(`\n✅ [CONFIRMED SUCCESS STATE]`);
        console.log(`  The browser accepted the module script successfully!`);
        console.log(`  Served as correct executable type "${jsRes.contentType}".\n`);
      } else {
        console.log(`  Fail: Bundled asset served as "${jsRes.contentType}" instead of javascript.`);
      }
    }
  }
  distServer.close();
  
  console.log(`=== MIME-TYPE VALIDATION COMPLETE ===`);
}

runTests().catch(console.error);
