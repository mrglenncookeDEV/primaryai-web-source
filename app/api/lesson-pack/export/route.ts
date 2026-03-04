import { NextResponse } from "next/server";
import { LessonPackSchema } from "@/src/engine/schema";
import { lessonPackToSlides, lessonPackToWorksheet } from "@/src/engine/exporters";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import PptxGenJS from "pptxgenjs";

const FormatSchemaValues = ["lesson-pdf", "slides-pptx", "worksheet-doc"] as const;
type ExportFormat = (typeof FormatSchemaValues)[number];

function isExportFormat(value: string): value is ExportFormat {
  return (FormatSchemaValues as readonly string[]).includes(value);
}

function escapeHtml(value: string) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(req: Request) {
  const body = await req.json();
  const format = String(body?.format || "");

  if (!isExportFormat(format)) {
    return NextResponse.json(
      {
        error: "Invalid export format",
        allowed: FormatSchemaValues,
      },
      { status: 400 }
    );
  }

  const parsed = LessonPackSchema.safeParse(body?.pack);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid lesson pack payload",
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const pack = parsed.data;
  const baseFile = `${pack.subject}-${pack.topic}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 80) || "lesson-pack";

  if (format === "slides-pptx") {
    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "PrimaryAI";
    pptx.subject = pack.subject;
    pptx.title = `${pack.subject}: ${pack.topic}`;
    pptx.company = "PrimaryAI";

    const slides = lessonPackToSlides(pack);
    const cover = pptx.addSlide();
    cover.background = { color: "0F172A" };
    cover.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.45,
      w: 2.2,
      h: 0.46,
      fill: { color: "38BDF8" },
      line: { color: "38BDF8", pt: 0 },
    });
    cover.addText("PRIMARYAI LESSON PACK", {
      x: 0.55,
      y: 0.5,
      w: 4.5,
      h: 0.35,
      fontSize: 12,
      bold: true,
      color: "0F172A",
      fontFace: "Aptos",
    });
    cover.addText(`${pack.subject}: ${pack.topic}`, {
      x: 0.7,
      y: 1.6,
      w: 11.5,
      h: 1.1,
      fontSize: 42,
      bold: true,
      color: "F8FAFC",
      fontFace: "Aptos Display",
    });
    cover.addText(`Year Group ${pack.year_group}  |  ${new Date().toLocaleDateString("en-GB")}`, {
      x: 0.72,
      y: 2.85,
      w: 8,
      h: 0.35,
      fontSize: 14,
      color: "CBD5E1",
      fontFace: "Aptos",
    });

    for (const slideData of slides) {
      const slide = pptx.addSlide();
      slide.background = { color: "F8FAFC" };
      slide.addShape(pptx.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 0.24,
        fill: { color: "0EA5E9" },
        line: { color: "0EA5E9", pt: 0 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.5,
        y: 0.48,
        w: 12.3,
        h: 0.02,
        line: { color: "DCE4EF", pt: 1 },
      });
      slide.addText(slideData.title, {
        x: 0.5,
        y: 0.58,
        w: 12.3,
        h: 0.64,
        fontSize: 30,
        bold: true,
        color: "0F172A",
        fontFace: "Aptos Display",
      });
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.55,
        y: 1.45,
        w: 12.2,
        h: 5.5,
        fill: { color: "EEF6FF" },
        line: { color: "CFE3FA", pt: 1 },
      });
      slide.addText(slideData.bullets.map((item) => `• ${item}`).join("\n"), {
        x: 0.88,
        y: 1.74,
        w: 11.65,
        h: 4.95,
        fontSize: 22,
        color: "1E293B",
        breakLine: true,
        fontFace: "Aptos",
        margin: 0.03,
        paraSpaceAfter: 8,
        valign: "top",
      });
      slide.addText("PrimaryAI", {
        x: 0.58,
        y: 6.95,
        w: 2,
        h: 0.2,
        fontSize: 10,
        bold: true,
        color: "64748B",
        fontFace: "Aptos",
      });
      if (slideData.speaker_notes) {
        slide.addNotes(slideData.speaker_notes);
      }
    }

    const buffer = await pptx.write({ outputType: "arraybuffer" });
    return new NextResponse(buffer as ArrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${baseFile}-slides.pptx"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "worksheet-doc") {
    const worksheet = lessonPackToWorksheet(pack);
    const html = `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              font-family: "Aptos", "Calibri", "Segoe UI", Arial, sans-serif;
              color: #0f172a;
              background: #f8fafc;
              line-height: 1.5;
            }
            .sheet {
              max-width: 920px;
              margin: 0 auto;
              background: white;
              border: 1px solid #dce5f2;
              border-radius: 16px;
              overflow: hidden;
            }
            .hero {
              padding: 26px 30px 22px;
              background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
              color: #f8fafc;
            }
            .kicker {
              display: inline-block;
              padding: 4px 10px;
              border-radius: 999px;
              background: #38bdf8;
              color: #0f172a;
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.08em;
              text-transform: uppercase;
            }
            h1 {
              margin: 12px 0 4px;
              font-size: 30px;
              line-height: 1.1;
              letter-spacing: -0.02em;
            }
            .meta {
              margin: 0;
              color: #cbd5e1;
              font-size: 13px;
            }
            .content {
              padding: 22px 28px 26px;
              display: grid;
              gap: 14px;
            }
            .card {
              border: 1px solid #dbe6f3;
              border-radius: 12px;
              padding: 14px 16px;
              background: #f8fbff;
            }
            h2 {
              margin: 0 0 8px;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #0ea5e9;
            }
            p, li {
              font-size: 14px;
            }
            p { margin: 0; }
            ol {
              margin: 0;
              padding-left: 20px;
              display: grid;
              gap: 8px;
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="hero">
              <span class="kicker">PrimaryAI Worksheet</span>
              <h1>${escapeHtml(worksheet.title)}</h1>
              <p class="meta">${escapeHtml(pack.year_group)} | ${escapeHtml(pack.subject)} | ${escapeHtml(pack.topic)}</p>
            </div>
            <div class="content">
              <section class="card">
                <h2>Instructions</h2>
                <p>${escapeHtml(worksheet.instructions)}</p>
              </section>
              <section class="card">
                <h2>Tasks</h2>
                <ol>${worksheet.tasks.map((task) => `<li>${escapeHtml(task)}</li>`).join("")}</ol>
              </section>
              <section class="card">
                <h2>Review and Reflect</h2>
                <p>${escapeHtml(worksheet.plenary)}</p>
              </section>
            </div>
          </div>
        </body>
      </html>
    `.trim();

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "application/msword; charset=utf-8",
        "Content-Disposition": `attachment; filename="${baseFile}-worksheet.doc"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const pageSize: [number, number] = [595.28, 841.89];
  const margin = 44;
  const bottomGuard = 64;
  const lineHeight = 15;
  const colours = {
    primary: rgb(0.06, 0.25, 0.58),
    accent: rgb(0.02, 0.58, 0.86),
    text: rgb(0.09, 0.14, 0.2),
    muted: rgb(0.35, 0.42, 0.51),
    cardFill: rgb(0.95, 0.98, 1),
    cardBorder: rgb(0.83, 0.89, 0.95),
  };
  let page = pdfDoc.addPage(pageSize);
  let y = 0;
  const textWidth = page.getWidth() - margin * 2;
  let pageCount = 0;

  function createPage() {
    page = pageCount === 0 ? page : pdfDoc.addPage(pageSize);
    pageCount += 1;
    page.drawRectangle({
      x: 0,
      y: page.getHeight() - 106,
      width: page.getWidth(),
      height: 106,
      color: colours.primary,
    });
    page.drawRectangle({
      x: margin,
      y: page.getHeight() - 56,
      width: 160,
      height: 22,
      color: colours.accent,
    });
    page.drawText("PRIMARYAI LESSON PACK", {
      x: margin + 10,
      y: page.getHeight() - 49,
      size: 10,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`${pack.subject}: ${pack.topic}`, {
      x: margin,
      y: page.getHeight() - 80,
      size: 21,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(`Year Group ${pack.year_group}`, {
      x: margin,
      y: page.getHeight() - 97,
      size: 11,
      font,
      color: rgb(0.85, 0.91, 0.97),
    });
    page.drawText("PrimaryAI", {
      x: margin,
      y: 34,
      size: 10,
      font: fontBold,
      color: colours.muted,
    });
    page.drawText(new Date().toLocaleDateString("en-GB"), {
      x: page.getWidth() - margin - 76,
      y: 34,
      size: 10,
      font,
      color: colours.muted,
    });
    y = page.getHeight() - 136;
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < bottomGuard) {
      createPage();
    }
  }

  function wrapText(text: string, size = 11, usedFont = font, width = textWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      const w = usedFont.widthOfTextAtSize(candidate, size);
      if (w > width && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  function drawSectionHeader(text: string) {
    ensureSpace(34);
    page.drawText(text.toUpperCase(), {
      x: margin,
      y,
      size: 11,
      font: fontBold,
      color: colours.accent,
    });
    y -= 8;
    page.drawLine({
      start: { x: margin, y },
      end: { x: page.getWidth() - margin, y },
      color: colours.cardBorder,
      thickness: 1,
    });
    y -= 16;
  }

  function drawParagraph(text: string, options?: { indent?: number; size?: number; muted?: boolean }) {
    const indent = options?.indent || 0;
    const size = options?.size || 11;
    const color = options?.muted ? colours.muted : colours.text;
    const lines = wrapText(text || "—", size, font, textWidth - indent);
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.drawText(line, { x: margin + indent, y, size, font, color });
      y -= lineHeight;
    }
    y -= 6;
  }

  function drawCardParagraph(text: string) {
    const lines = wrapText(text || "—", 10.8);
    const height = Math.max(32, lines.length * 13 + 16);
    ensureSpace(height + 10);
    page.drawRectangle({
      x: margin,
      y: y - height + 4,
      width: textWidth,
      height,
      color: colours.cardFill,
      borderColor: colours.cardBorder,
      borderWidth: 1,
    });
    let ly = y - 12;
    for (const line of lines) {
      page.drawText(line, { x: margin + 10, y: ly, size: 10.8, font, color: colours.text });
      ly -= 13;
    }
    y -= height + 8;
  }

  createPage();
  drawSectionHeader("Learning Objectives");
  for (const objective of pack.learning_objectives) {
    drawParagraph(`• ${objective}`, { indent: 8 });
  }
  drawSectionHeader("Teacher Explanation");
  drawCardParagraph(pack.teacher_explanation);
  drawSectionHeader("Pupil Explanation");
  drawCardParagraph(pack.pupil_explanation);
  drawSectionHeader("Worked Example");
  drawCardParagraph(pack.worked_example);
  drawSectionHeader("Review and Reflect");
  drawCardParagraph(pack.plenary);
  drawSectionHeader("Mini Assessment");
  pack.mini_assessment.questions.forEach((question, index) => {
    drawParagraph(`${index + 1}. ${question}`, { size: 10.8 });
    if (pack.mini_assessment.answers[index]) {
      drawParagraph(`Answer: ${pack.mini_assessment.answers[index]}`, { indent: 16, size: 10, muted: true });
    }
  });

  const pdfBytes = await pdfDoc.save();
  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${baseFile}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
