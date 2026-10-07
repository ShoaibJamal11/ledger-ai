import Groq from "groq-sdk";
import { NextRequest } from "next/server";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const PROMPT_TEXT =
  "Act as an expert accountant. Extract vendorName, date, tax, totalAmount, and lineItems (description, amount) from this receipt. CRITICAL RULE: If the printed 'Total' is 0.00, look for the 'Subtotal' or sum the line items to find the actual totalAmount. Return strictly valid JSON with these exact keys.";

// Primary model requested + active Groq vision models in case of deprecation
const VISION_MODELS = [
  "llama-3.2-90b-vision-preview",
  "qwen/qwen3.8-27b",
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const base64ImageString = (body.image || body.base64Image) as string | undefined;

    if (!base64ImageString || !base64ImageString.startsWith("data:")) {
      return Response.json(
        { error: "Missing or invalid image. Expected a base64 data URL." },
        { status: 400 }
      );
    }

    let lastError: Error | null = null;
    let completion: Groq.Chat.ChatCompletion | null = null;

    for (const model of VISION_MODELS) {
      try {
        completion = await groq.chat.completions.create({
          model,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: PROMPT_TEXT,
                },
                {
                  type: "image_url",
                  image_url: { url: base64ImageString },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 800,
        });

        if (completion?.choices?.[0]?.message?.content) {
          break;
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const errMsg = lastError.message;
        const isDecommissioned =
          errMsg.includes("decommissioned") ||
          errMsg.includes("model_not_found") ||
          errMsg.includes("does not exist");

        if (isDecommissioned) {
          console.warn(`[Groq Vision] Model ${model} unavailable, trying fallback...`);
          continue;
        }

        // If JSON mode failed, try once without response_format constraint
        try {
          completion = await groq.chat.completions.create({
            model,
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `${PROMPT_TEXT}\nOutput must be raw JSON only without markdown formatting.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: base64ImageString },
                  },
                ],
              },
            ],
            temperature: 0.1,
            max_tokens: 800,
          });
          if (completion?.choices?.[0]?.message?.content) {
            break;
          }
        } catch {
          // Continue to next model if available
          continue;
        }
      }
    }

    if (!completion?.choices?.[0]?.message?.content) {
      throw lastError || new Error("Failed to extract data from image");
    }

    const raw = completion.choices[0].message.content;
    const clean = raw
      .replace(/^```(?:json)?/im, "")
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
