import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Accept both: { prompt: "..." } OR { messages: [...] }
    const messages =
      body?.messages ??
      (body?.prompt
        ? [{ role: "user", content: String(body.prompt) }]
        : [{ role: "user", content: JSON.stringify(body) }]);

    // If your UI sends "openai/gpt-4o-mini", convert to real OpenAI model name.
    const rawModel = String(body?.model ?? "gpt-4o-mini");
    const model = rawModel.includes("/")
      ? rawModel.split("/").pop()!
      : rawModel;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in Vercel environment variables" },
        { status: 500 }
      );
    }

    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: body?.temperature ?? 0.7,
      }),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json(
        { error: data?.error ?? data, status: r.status },
        { status: r.status }
      );
    }

    const content = data?.choices?.[0]?.message?.content ?? "";

    // Return a simple response format that the UI can read
    return NextResponse.json({
      content,
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}