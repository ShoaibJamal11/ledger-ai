import Groq from "groq-sdk";
import { NextRequest } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Vision-capable models to try in order (most preferred first).
// Groq periodically deprecates preview models — we try each until one works.
const VISION_MODELS = [
  "llama-3.2-90b-vision-preview",
  "llama-3.2-11b-vision-preview",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "llama-4-scout-17b-16e-instruct",
];

const SYSTEM_PROMPT = `You are an expert accountant and OCR engine. \
Extract structured financial data from the provided invoice or receipt image. \
Return STRICTLY valid JSON with the following shape and nothing else:
{
  "vendorName": "string",
  "date": "YYYY-MM-DD",
  "tax": "string (e.g. $4.50)",
  "totalAmount": "string (e.g. $124.50)",
  "lineItems": [
    { "description": "string", "amount": "string" }
  ]
}
If a field cannot be determined, use null for its value. Do NOT include markdown fences.`;

async function tryVisionModels(imageUrl: string) {
  for (const model of VISION_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: imageUrl } },
              {
                type: "text",
                text: "Extract the invoice data from this image and return valid JSON.",
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      });
      return { model, completion };
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : String(err);
      // If it's a model-not-found / decommissioned error, try the next model.
      const isModelError =
        msg.includes("model_not_found") ||
        msg.includes("decommissioned") ||
        msg.includes("does not exist") ||
        msg.includes("model_decommissioned");
      if (!isModelError) throw err; // re-throw real errors immediately
      console.warn(`[/api/extract] Model ${model} unavailable, trying next…`);
    }
  }
  throw new Error(
    "No vision-capable model is available on your Groq API plan. " +
      "Please check https://console.groq.com/docs/deprecations or upgrade your plan."
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { image } = body as { image?: string };

    if (!image || !image.startsWith("data:")) {
      return Response.json(
        {
          error:
            "Missing or invalid image field. Expected a base64 data URL.",
        },
        { status: 400 }
      );
    }

    const { completion } = await tryVisionModels(image);

    const raw = completion.choices[0]?.message?.content ?? "{}";

    // Strip any accidental markdown fences
    const clean = raw
      .replace(/^```(?:json)?/m, "")
      .replace(/```$/m, "")
      .trim();

    const data = JSON.parse(clean);
    return Response.json(data);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown server error";
    console.error("[/api/extract]", err);
    return Response.json({ error: message }, { status: 500 });
  }
}
