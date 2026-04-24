/**
 * YouTube OAuth Token Refresh Script
 *
 * Opens a browser-based OAuth flow to get a new refresh token.
 * Uses the existing YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET from .env.
 *
 * Usage: npx tsx src/scripts/youtube-auth.ts
 */

import "dotenv/config";
import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const PORT = 8888;
const REDIRECT_URI = `http://localhost:${PORT}/callback`;

async function main() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error(
      "Missing YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET in .env"
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent to get a new refresh token
  });

  console.log("\n🔑 YouTube OAuth Token Refresh\n");
  console.log("1. Open this URL in your browser:\n");
  console.log(`   ${authUrl}\n`);
  console.log("2. Sign in and authorize the app.");
  console.log(`3. Waiting for callback on http://localhost:${PORT}...\n`);

  // Try to open browser automatically
  const { exec } = await import("node:child_process");
  exec(`open "${authUrl}"`);

  return new Promise<void>((resolve) => {
    const server = http.createServer(async (req, res) => {
      if (!req.url?.startsWith("/callback")) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const url = new URL(req.url, `http://localhost:${PORT}`);
      const code = url.searchParams.get("code");
      const error = url.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(
          `<h1>Authorization Failed</h1><p>${error}</p><p>Close this tab.</p>`
        );
        server.close();
        console.error(`\n❌ Authorization failed: ${error}`);
        process.exit(1);
      }

      if (!code) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h1>No authorization code received</h1><p>Close this tab.</p>`);
        server.close();
        console.error("\n❌ No authorization code received");
        process.exit(1);
      }

      try {
        const { tokens } = await oauth2Client.getToken(code);
        const refreshToken = tokens.refresh_token;

        if (!refreshToken) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(
            `<h1>No refresh token received</h1><p>Try revoking app access at <a href="https://myaccount.google.com/permissions">Google Permissions</a> and retrying.</p>`
          );
          server.close();
          console.error(
            "\n❌ No refresh token in response. Revoke app access and retry."
          );
          process.exit(1);
        }

        // Update .env file
        const envPath = path.join(process.cwd(), ".env");
        let envContent = fs.readFileSync(envPath, "utf-8");
        envContent = envContent.replace(
          /YOUTUBE_REFRESH_TOKEN=.*/,
          `YOUTUBE_REFRESH_TOKEN=${refreshToken}`
        );
        fs.writeFileSync(envPath, envContent);

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(
          `<h1>✅ Authorization Successful!</h1><p>Refresh token saved to .env</p><p>You can close this tab.</p>`
        );

        console.log("✅ New refresh token obtained and saved to .env!");
        console.log(
          `   Token: ${refreshToken.substring(0, 20)}...${refreshToken.substring(refreshToken.length - 10)}`
        );
        console.log("\nYou can now run: npm run upload shrinkflation-decoded");

        server.close();
        resolve();
      } catch (err) {
        res.writeHead(500, { "Content-Type": "text/html" });
        res.end(
          `<h1>Token Exchange Failed</h1><pre>${err}</pre><p>Close this tab.</p>`
        );
        server.close();
        console.error("\n❌ Token exchange failed:", err);
        process.exit(1);
      }
    });

    server.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  });
}

main();
