import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer, WebSocket } from "ws";
import https from "https";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import dotenv from "dotenv";

// Muat kredensial dari .env.local (utama) lalu .env sebagai fallback
dotenv.config({ path: [".env.local", ".env"] });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.post("/api/analyze", async (req, res) => {
    try {
      const geminiKey = process.env.GEMINI_API_KEY;
      if (!geminiKey || geminiKey === "MY_GEMINI_API_KEY") {
        return res.status(500).json({ 
          error: "Gemini API Key is missing or invalid.", 
          details: "Please configure GEMINI_API_KEY in the Settings menu." 
        });
      }

      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              trend: { type: SchemaType.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
              support: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
              resistance: { type: SchemaType.ARRAY, items: { type: SchemaType.NUMBER } },
              indicators: { type: SchemaType.STRING },
              recommendation: { type: SchemaType.STRING, enum: ['Buy', 'Sell', 'Wait'] },
              entry: { type: SchemaType.NUMBER },
              stopLoss: { type: SchemaType.NUMBER },
              takeProfit: { type: SchemaType.NUMBER },
              riskLevel: { type: SchemaType.STRING, enum: ['High', 'Medium', 'Low'] },
              rationale: { type: SchemaType.STRING },
              atr: { type: SchemaType.NUMBER },
              fibonacciLevels: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    level: { type: SchemaType.STRING },
                    price: { type: SchemaType.NUMBER }
                  }
                }
              },
              ictSessionAnalysis: { type: SchemaType.STRING },
              smcAnalysis: { type: SchemaType.STRING },
              candlePatterns: { type: SchemaType.STRING },
              srAreas: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    type: { type: SchemaType.STRING, enum: ['Support', 'Resistance'] },
                    price: { type: SchemaType.NUMBER },
                    strength: { type: SchemaType.STRING, enum: ['Strong', 'Moderate', 'Weak'] }
                  }
                }
              }
            },
            required: [
              'trend', 'support', 'resistance', 'indicators', 'recommendation', 
              'entry', 'stopLoss', 'takeProfit', 'riskLevel', 'rationale', 
              'atr', 'fibonacciLevels', 'ictSessionAnalysis', 'smcAnalysis', 
              'candlePatterns', 'srAreas'
            ]
          } as any
        }
      });

      const text = result.response.text();
      res.json(JSON.parse(text));
    } catch (error) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: "Failed to call Gemini API", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // WebSocket Server
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("Client connected to WebSocket");
    ws.on("close", () => console.log("Client disconnected"));
  });

  // OANDA Streaming Logic
  const OANDA_API_KEY = process.env.OANDA_API_KEY;
  const OANDA_ACCOUNT_ID = process.env.OANDA_ACCOUNT_ID;
  const OANDA_ENV = process.env.OANDA_ENV || "practice";
  const STREAM_URL = OANDA_ENV === "live" 
    ? `stream-fxtrade.oanda.com` 
    : `stream-fxpractice.oanda.com`;

  if (OANDA_API_KEY && OANDA_ACCOUNT_ID) {
    console.log(`Initializing OANDA stream for account ${OANDA_ACCOUNT_ID}...`);
    
    const options = {
      hostname: STREAM_URL,
      path: `/v3/accounts/${OANDA_ACCOUNT_ID}/pricing/stream?instruments=XAU_USD,EUR_USD,GBP_USD,USD_JPY`,
      method: "GET",
      headers: {
        "Authorization": `Bearer ${OANDA_API_KEY}`,
        "Content-Type": "application/json"
      }
    };

    const req = https.request(options, (res) => {
      res.on("data", (chunk) => {
        const lines = chunk.toString().split("\n");
        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "PRICE") {
              const priceData = {
                instrument: data.instrument.replace("_", ""),
                price: (parseFloat(data.bids[0].price) + parseFloat(data.asks[0].price)) / 2,
                time: data.time
              };
              // Broadcast to all clients
              wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(priceData));
                }
              });
            }
          } catch (e) {
            // Ignore heartbeat or malformed JSON
          }
        }
      });
    });

    req.on("error", (e) => {
      console.error("OANDA Stream Error:", e.message);
    });

    req.end();
  } else {
    console.warn("OANDA credentials missing. Real-time stream disabled.");
  }
}

startServer();
