interface Env {
  GEMINI_API_KEY?: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const lat = url.searchParams.get("lat");
  const lon = url.searchParams.get("lon");

  if (!lat || !lon) {
    return new Response(
      JSON.stringify({ error: "Missing lat or lon parameters" }),
      {
        status: 400,
        headers: { 
          "content-type": "application/json;charset=UTF-8",
          "access-control-allow-origin": "*"
        },
      }
    );
  }

  // Attempt 1: Nominatim OpenStreetMap (Free reverse geocoding)
  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=en`;
    const response = await fetch(nominatimUrl, {
      headers: {
        "User-Agent": "AlamTechPrayerApp/1.0 (iftekharalam5623@gmail.com)"
      }
    });

    if (response.ok) {
      const data = await response.json() as any;
      const address = data.address || {};
      const city = address.city || address.town || address.village || address.suburb || address.city_district || address.state || "Chittagong";
      const country = address.country || "Bangladesh";
      return new Response(
        JSON.stringify({ city, country }),
        { 
          headers: { 
            "content-type": "application/json;charset=UTF-8",
            "access-control-allow-origin": "*"
          } 
        }
      );
    }
  } catch (e) {
    console.error("Nominatim geocoding error:", e);
  }

  // Attempt 2: Fallback to Gemini if API key is present
  const apiKey = context.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const prompt = `Based on the latitude ${lat} and longitude ${lon}, identify the closest major city and country name. Return ONLY a JSON object in this exact format, with no markdown formatting:
{"city": "CityName", "country": "CountryName"}`;

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
      const geminiResponse = await fetch(geminiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json"
          }
        })
      });

      if (geminiResponse.ok) {
        const geminiData = await geminiResponse.json() as any;
        const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
        const parsed = JSON.parse(resultText);
        if (parsed.city && parsed.country) {
          return new Response(
            JSON.stringify({ city: parsed.city, country: parsed.country }),
            { 
              headers: { 
                "content-type": "application/json;charset=UTF-8",
                "access-control-allow-origin": "*"
              } 
            }
          );
        }
      }
    } catch (geminiError) {
      console.error("Gemini geocoding fallback error:", geminiError);
    }
  }

  // Final fallback
  return new Response(
    JSON.stringify({ city: "Makkah", country: "Saudi Arabia" }),
    { 
      headers: { 
        "content-type": "application/json;charset=UTF-8",
        "access-control-allow-origin": "*"
      } 
    }
  );
};
