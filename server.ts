import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON
app.use(express.json());

// Initialize Gemini client lazily to prevent crash if key is missing on start
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Route: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// API Route: Geocoding (Reverse Lat/Lon to City and Country)
app.get("/api/geocode", async (req, res) => {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: "Missing lat or lon parameters" });
  }

  try {
    // Attempt 1: Nominatim OpenStreetMap (Free reverse geocoding)
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AlamTechPrayerApp/1.0 (iftekharalam5623@gmail.com)"
      }
    });

    if (response.ok) {
      const data = await response.json() as any;
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.suburb || address.city_district || address.state || "Chittagong";
      const country = address.country || "Bangladesh";
      return res.json({ city, country });
    }
  } catch (e) {
    console.error("Nominatim geocoding error:", e);
  }

  // Attempt 2: Fallback to Gemini if API key is present
  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `Based on the latitude ${lat} and longitude ${lon}, identify the closest major city and country name. Return ONLY a JSON object in this exact format, with no markdown formatting:
{"city": "CityName", "country": "CountryName"}`;
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const resultText = response.text?.trim() || "";
      const parsed = JSON.parse(resultText);
      if (parsed.city && parsed.country) {
        return res.json({ city: parsed.city, country: parsed.country });
      }
    } catch (geminiError) {
      console.error("Gemini geocoding fallback error:", geminiError);
    }
  }

  // Final fallback
  res.json({ city: "Makkah", country: "Saudi Arabia" });
});

// API Route: Ask the Salah Scholar (Gemini API)
app.post("/api/gemini/explain", async (req, res) => {
  const { query, prayerName } = req.body;

  const ai = getGeminiClient();

  if (!ai) {
    // Elegant fallback if GEMINI_API_KEY is not configured
    return res.json({
      text: `### Guidance on ${prayerName || 'Salah times'}\n\n*Note: To enable live AI scholarship, please add your \`GEMINI_API_KEY\` in **Settings > Secrets** in the AI Studio UI.*\n\nHere is the authentic guidance based on Sahih Hadith and the Quran:\n\n1. **Specified Times**: The Quran states, *"Indeed, prayer has been decreed upon the believers a decree of specified times."* [Surah An-Nisa 4:103].\n2. **The Timing Bounds**: In Sahih Muslim 612, the Prophet (PBUH) detailed the boundaries:\n   * **Fajr**: From the rise of true dawn (Fajr Sadiq) until before sunrise.\n   * **Dhuhr**: Once the sun passes its zenith (declines from the meridian) until the shadow of an object equals its height.\n   * **Asr**: Starts when the shadow of an object equals its height (or twice its height in Hanafi jurisprudence) and continues until the sun begins to yellow.\n   * **Maghrib**: Starts immediately at sunset (when the sun disappears below the horizon) and lasts until the red twilight disappears.\n   * **Isha**: Starts after the disappearance of the twilight and lasts until the middle of the night.`,
      isFallback: true
    });
  }

  try {
    let prompt = "";
    if (prayerName) {
      prompt = `Provide a beautiful, informative, and scholarly explanation of the "${prayerName}" prayer time, highlighting the Quranic verses and Sahih Hadiths (with accurate reference numbers, e.g., Sahih al-Bukhari, Sahih Muslim) that establish its starting and ending times. Discuss any practical applications or wisdom, such as school differences (like Hanafi vs Shafi'i for Asr). Maintain a highly respectful, authentic, and educational tone. Format your response beautifully in Markdown. Do not include unnecessary introduction/outro, start directly with the title.`;
    } else {
      prompt = `A user has asked this question about prayer (Namaz/Salah) times according to the Quran and Sahih Hadith: "${query}". 
      Please provide a highly accurate, respectful, and detailed answer quoting relevant verses from the Quran and Sahih Hadiths with references. 
      Format your response beautifully in clean Markdown. Start directly with the answer without preamble.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Islamic scholar specialized in Hadith and Quranic jurisprudence regarding prayer times (Salah/Namaz). Your objective is to explain prayer timings exactly according to Sahih Hadiths (Bukhari, Muslim, Abu Dawud, Tirmidhi, etc.) and the Holy Quran. Be academically precise, highly respectful, and provide clear citations.",
      }
    });

    res.json({ text: response.text, isFallback: false });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({
      error: "Failed to generate explanation from Gemini API.",
      details: error.message
    });
  }
});

// Setup Vite development server or production static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving production static build from:", distPath);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
