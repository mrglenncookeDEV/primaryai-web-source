import { NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/user-session";

const MAX_CHARS = 12000;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB

function truncate(text: string) {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n{4,}/g, "\n\n").trim();
  const truncated = cleaned.length > MAX_CHARS;
  return { text: cleaned.slice(0, MAX_CHARS), truncated, chars: cleaned.length };
}

async function parsePdf(buffer: ArrayBuffer) {
  // Dynamic import avoids pdf-parse's test file read at module load time (Next.js incompatibility)
  const pdfParse = (await import("pdf-parse")).default;
  const result = await pdfParse(Buffer.from(buffer));
  return truncate(result.text);
}

async function parseDocx(buffer: ArrayBuffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return truncate(result.value);
}

async function parseExcel(buffer: ArrayBuffer) {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(buffer));

  const rows: string[] = [];
  workbook.eachSheet((sheet) => {
    rows.push(`[Sheet: ${sheet.name}]`);
    sheet.eachRow((row) => {
      const cells = (row.values as (string | number | boolean | null | undefined)[])
        .slice(1) // row.values is 1-indexed with undefined at [0]
        .map((v) => (v == null ? "" : String(v)))
        .join("\t");
      if (cells.trim()) rows.push(cells);
    });
  });

  return truncate(rows.join("\n"));
}

async function parseText(buffer: ArrayBuffer) {
  const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  return truncate(text);
}

export async function POST(req: Request) {
  const session = await getCurrentUserSession();
  if (!session?.userId) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: `File too large. Maximum size is 15 MB.` }, { status: 413 });
  }

  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() ?? "";
  const buffer = await file.arrayBuffer();

  try {
    let result: { text: string; truncated: boolean; chars: number };

    if (ext === "pdf") {
      result = await parsePdf(buffer);
    } else if (ext === "docx" || ext === "doc") {
      result = await parseDocx(buffer);
    } else if (ext === "xlsx" || ext === "xlsm") {
      result = await parseExcel(buffer);
    } else if (["xls", "ods"].includes(ext)) {
      return NextResponse.json({
        error: `Please save your file as .xlsx format and re-upload. Old .${ext} format is not supported.`,
      }, { status: 415 });
    } else {
      // Treat as plain text (txt, md, csv, json, tsv, rtf, etc.)
      result = await parseText(buffer);
    }

    if (!result.text.trim()) {
      return NextResponse.json({ error: "No readable text could be extracted from this file." }, { status: 422 });
    }

    return NextResponse.json({
      text: result.text,
      chars: result.chars,
      truncated: result.truncated,
      ext,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("parse-context error:", ext, message);
    return NextResponse.json(
      { error: `Could not read this file. Try exporting it as PDF or plain text first.` },
      { status: 422 },
    );
  }
}
