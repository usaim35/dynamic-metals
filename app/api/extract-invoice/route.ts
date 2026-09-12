import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";
export const maxDuration = 60;

const EXTRACTION_PROMPT = `You are reading a photo of a purchase order, order note, WhatsApp message, or similar document. Extract invoice data in JSON format ONLY (no markdown, no prose):

{
  "buyerName": "company name or -",
  "buyerAddress": "full address or -",
  "buyerNtn": "NTN number or -",
  "buyerPo": "PO/order number or -",
  "invoiceDate": "YYYY-MM-DD or -",
  "hsCode": "HS code or -",
  "items": [
    {
      "description": "item description",
      "unit": "PCS/KG/GROSS as written",
      "quantity": number,
      "unitPrice": number,
      "weightKg": number,
      "priceKg": number
    }
  ]
}

Rules:
- Extract every line item
- Use 0 for missing numbers, - for missing text
- No invented data
- Return ONLY JSON, nothing else`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GOOGLE_API_KEY environment variable" },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No image uploaded" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mimeType = file.type || "image/png";

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

    const response = await model.generateContent([
      {
        inlineData: {
          data: base64,
          mimeType: mimeType
        }
      },
      { text: EXTRACTION_PROMPT }
    ]);

    const text = response.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse extraction result. Try a clearer photo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ data: parsed });
  } catch (err: any) {
    console.error("Extraction error:", err);
    return NextResponse.json(
      { error: err?.message || "Extraction failed" },
      { status: 500 }
    );
  }
}
