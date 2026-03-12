import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";

function buildImagePrompt(name: string, description: string): string {
  const namePart = name ? `, ${name},` : "";
  if (description.trim()) {
    return `Portrait avatar of a primary school teacher${namePart} who is: ${description.trim()}. Friendly warm smile, facing forward, clean light background, soft natural lighting, professional illustrated portrait style, suitable as a circular profile picture, vibrant but tasteful colours, welcoming and approachable. Head and shoulders only.`;
  }
  return `Portrait avatar of a friendly primary school teacher${namePart}. Warm smile, facing forward, clean light background, soft natural lighting, professional illustrated portrait style, suitable as a circular profile picture, vibrant but tasteful colours, welcoming and approachable. Head and shoulders only.`;
}

export async function POST(request: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Image generation not configured" }, { status: 503 });
  }

  let name = "";
  let description = "";
  try {
    const body = await request.json();
    name = String(body.name || "").trim().slice(0, 80);
    description = String(body.description || "").trim().slice(0, 400);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!description && !name) {
    return NextResponse.json({ error: "Provide a name or description" }, { status: 400 });
  }

  const prompt = buildImagePrompt(name, description);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    // Gemini 2.5 Flash Image supports native image generation via generateContent
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
            temperature: 1,
          },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err?.error?.message as string | undefined) || `Image generation failed (${res.status})`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json();

    // Find the inline image part in the response
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
      data?.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);

    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image returned from generator" }, { status: 502 });
    }

    const { mimeType, data: b64 } = imagePart.inlineData;
    const dataUrl = `data:${mimeType};base64,${b64}`;
    return NextResponse.json({ dataUrl });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Image generation timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Image generation failed. Please try again." }, { status: 500 });
  } finally {
    clearTimeout(timeoutId);
  }
}
