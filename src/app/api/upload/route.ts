import { NextRequest, NextResponse } from 'next/server';
type ProcessedContent = {
  title: string;
  content: string;
  byline: string | null;
  siteName: string | null;
  url: string;
};
function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

function isImageFile(filename: string): boolean {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
  return imageExtensions.includes(getFileExtension(filename));
}

function isPdfFile(filename: string): boolean {
  return getFileExtension(filename) === 'pdf';
}
async function processImageFile(buffer: Buffer, filename: string): Promise<ProcessedContent> {
  const base64Image = `data:image/${getFileExtension(filename)};base64,${buffer.toString('base64')}`;

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
    title: filename.replace(/\.[^/.]+$/, ''),
    content,
    byline: null,
    siteName: 'Image Upload',
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
    title: filename.replace('.pdf', ''),
    content,
    byline: null,
    siteName: 'PDF Upload',
    url: `file://${filename}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const filename = file.name;
    if (!isImageFile(filename) && !isPdfFile(filename)) {
      return NextResponse.json(
        {
          error: 'Unsupported file type. Please upload an image (JPG, PNG, etc.) or PDF file.',
        },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: 'File too large. Please upload files smaller than 10MB.',
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let processedContent: ProcessedContent;

    if (isPdfFile(filename)) {
      processedContent = await processPdfFile(buffer, filename);
    } else {
      processedContent = await processImageFile(buffer, filename);
    }

    return NextResponse.json({
      snapshot: processedContent,
    });
  } catch (error: unknown) {
    console.error('File upload error:', error);
    return NextResponse.json(
      {
        message: 'Failed to process uploaded file.',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
