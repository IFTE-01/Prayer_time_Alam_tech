interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  // Handle CORS Preflight request
  if (context.request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "POST, OPTIONS",
        "access-control-allow-headers": "content-type",
      },
    });
  }

  // Only allow POST
  if (context.request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { 
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*"
      },
    });
  }

  let body: any;
  try {
    body = await context.request.json();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { 
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*"
      },
    });
  }

  const { query, prayerName } = body;
  const apiKey = context.env.GEMINI_API_KEY;

  if (!apiKey) {
    // Elegant fallback if GEMINI_API_KEY is not configured
    const text = `### Guidance on ${prayerName || 'Salah times'}\n\n*Note: To enable live AI scholarship, please add your \`GEMINI_API_KEY\` in your Cloudflare environment variables.*\n\nHere is the authentic guidance based on Sahih Hadith and the Quran:\n\n1. **Specified Times**: The Quran states, *"Indeed, prayer has been decreed upon the believers a decree of specified times."* [Surah An-Nisa 4:103].\n2. **The Timing Bounds**: In Sahih Muslim 612, the Prophet (PBUH) detailed the boundaries:\n   * **Fajr**: From the rise of true dawn (Fajr Sadiq) until before sunrise.\n   * **Dhuhr**: Once the sun passes its zenith (declines from the meridian) until the shadow of an object equals its height.\n   * **Asr**: Starts when the shadow of an object equals its height (or twice its height in Hanafi jurisprudence) and continues until the sun begins to yellow.\n   * **Maghrib**: Starts immediately at sunset (when the sun disappears below the horizon) and lasts until the red twilight disappears.\n   * **Isha**: Starts after the disappearance of the twilight and lasts until the middle of the night.`;
    return new Response(
      JSON.stringify({ text, isFallback: true }),
      { 
        headers: { 
          "content-type": "application/json;charset=UTF-8",
          "access-control-allow-origin": "*"
        } 
      }
    );
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

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: {
          parts: [{ text: "You are an expert Islamic scholar specialized in Hadith and Quranic jurisprudence regarding prayer times (Salah/Namaz). Your objective is to explain prayer timings exactly according to Sahih Hadiths (Bukhari, Muslim, Abu Dawud, Tirmidhi, etc.) and the Holy Quran. Be academically precise, highly respectful, and provide clear citations." }]
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      throw new Error(`Gemini API responded with status ${geminiResponse.status}: ${errorText}`);
    }

    const geminiData = await geminiResponse.json() as any;
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(
      JSON.stringify({ text: responseText, isFallback: false }),
      { 
        headers: { 
          "content-type": "application/json;charset=UTF-8",
          "access-control-allow-origin": "*"
        } 
      }
    );
  } catch (error: any) {
    console.error("Gemini API Error in Cloudflare Function:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate explanation from Gemini API.",
        details: error.message,
      }),
      {
        status: 500,
        headers: { 
          "content-type": "application/json;charset=UTF-8",
          "access-control-allow-origin": "*"
        },
      }
    );
  }
};
