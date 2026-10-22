

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = 8080;
const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = "claude-sonnet-4-5";

const MIME = {
  ".html": "text/html", ".js": "application/javascript",
  ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".mp4": "video/mp4", ".webm": "video/webm", ".ogg": "video/ogg"
};

function buildPrompt(task, p) {
  if (task === "ask") {
    return `You are ScreenSidekick, an AI companion overlaying a video the user is currently watching on their TV. Answer the user's question using ONLY the video context provided below. Keep answers to 2-3 sentences, written for a curious general audience, spoken aloud on a TV (no markdown, no bullet points). If the question isn't answerable from the context, say so briefly and pivot to what IS covered.

Video title: ${p.title}
Video synopsis: ${p.synopsis}
Known facts from this video:
${p.facts.map(f => "- " + f).join("\n")}

User question: ${p.question}`;
  }
  if (task === "explore") {
    return `You are generating a set of related-topic cards for a TV UI. Based on the current video's topic and the user's follow-up interest, return EXACTLY 3 cards as JSON. Each card is a short, visually distinct fact suitable for a card in a horizontal row on a TV screen — short title (3-5 words) and one sentence of detail. Return ONLY valid JSON, no prose, no markdown fences.

Format: {"cards":[{"title":"...","detail":"..."},{"title":"...","detail":"..."},{"title":"...","detail":"..."}]}

Video title: ${p.title}
Video topics: ${p.topics.join(", ")}
User's interest: ${p.followup}`;
  }
  if (task === "quiz") {
    return `Generate a 3-question multiple-choice quiz based ONLY on the facts provided below, testing whether someone understood the video. Each question has exactly 4 options, one correct. Keep questions and options short — this will be read aloud and shown on a TV screen. Return ONLY valid JSON, no prose, no markdown fences.

Format: {"questions":[{"question":"...","options":["...","...","...","..."],"correctIndex":0}, ...]}

Video title: ${p.title}
Facts:
${p.facts.map(f => "- " + f).join("\n")}`;
  }
  throw new Error("Unknown task: " + task);
}

function stripFences(text) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${errText}`);
  }
  const data = await res.json();
  return data.content[0].text;
}

async function handleAI(req, res) {
  let body = "";
  req.on("data", chunk => (body += chunk));
  req.on("end", async () => {
    try {
      if (!API_KEY) {
        throw new Error("ANTHROPIC_API_KEY is not set. See setup notes at the top of server.js.");
      }
      const payload = JSON.parse(body);
      const prompt = buildPrompt(payload.task, payload);
      const raw = await callClaude(prompt);

      let result;
      if (payload.task === "ask") {
        result = { answer: raw.trim() };
      } else {
        result = JSON.parse(stripFences(raw));
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("AI error:", err.message);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

function serveStatic(req, res) {
  let filePath = req.url === "/" ? "/index.html" : req.url;
  filePath = path.join(__dirname, decodeURIComponent(filePath.split("?")[0]));

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/api/ai") {
    return handleAI(req, res);
  }
  return serveStatic(req, res);
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`ScreenSidekick server running:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  console.log(`  Network: use your laptop's LAN IP on port ${PORT} for the Fire TV`);
  console.log(`  AI key:  ${API_KEY ? "detected ✔" : "MISSING — set ANTHROPIC_API_KEY (see top of server.js)"}`);
});
