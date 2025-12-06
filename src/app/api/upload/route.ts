import { NextRequest, NextResponse } from "next/server";
type ProcessedContent = {
  title: string;
  content: string;
  byline: string | null;
  siteName: string | null;
  url: string;
};
function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() || "";
}

function isImageFile(filename: string): boolean {
  const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "svg"];
  return imageExtensions.includes(getFileExtension(filename));
}

function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === "pdf";
}
async function processImageFile(buffer: Buffer, filename: string): Promise<ProcessedContent> {
  const base64Image = `data:image/${getFileExtension(filename)};base64,${buffer.toString("base64")}`;
  
  const content = `
    <div class="document-content">
      <div class="image-container">
        <img src="${base64Image}" alt="${filename}" style="max-width: 100%; height: auto;" />
      </div>
      <div class="image-info" style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
        <p><strong>File:</strong> ${filename}</p>
        <p><strong>Type:</strong> Image</p>
        <p><strong>Size:</strong> ${(buffer.length / 1024 / 1024).toFixed(2)} MB</p>
      </div>
    </div>
  `;

  return {
    title: filename.replace(/\.[^/.]+$/, ""),
    content,
    byline: null,
    siteName: "Image Upload",
    url: `file://${filename}`,
  };
}
async function processPdfFile(buffer: Buffer, filename: string): Promise<ProcessedContent> {
  const content = `
    <div class="document-content">
      <div class="pdf-placeholder">
        <h2>PDF Document</h2>
        <p>This PDF file has been uploaded and stored. PDF text extraction will be available in a future update.</p>
        <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
          <p><strong>File:</strong> ${filename}</p>
          <p><strong>Type:</strong> PDF Document</p>
          <p><strong>Size:</strong> ${(buffer.length / 1024 / 1024).toFixed(2)} MB</p>
        </div>
      </div>
    </div>
  `;

  return {
    title: filename.replace(".pdf", ""),
    content,
    byline: null,
    siteName: "PDF Upload",
    url: `file://${filename}`,
  };
}
