/** Authenticated YouTube Data API client from .env (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN). */

import "dotenv/config";
import { google } from "googleapis";

export function youtubeClient() {
  const { YOUTUBE_CLIENT_ID: id, YOUTUBE_CLIENT_SECRET: secret, YOUTUBE_REFRESH_TOKEN: token } = process.env;
  if (!id || !secret || !token) throw new Error("Missing YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET or YOUTUBE_REFRESH_TOKEN in .env");
  const auth = new google.auth.OAuth2(id, secret);
  auth.setCredentials({ refresh_token: token });
  return google.youtube({ version: "v3", auth });
}
