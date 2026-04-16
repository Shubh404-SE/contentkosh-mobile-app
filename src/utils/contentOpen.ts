import { encode as encodeBase64 } from 'base-64';
import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import type { ContentRecord, ContentType } from '../api/contentsApi';

function arrayBufferToBinaryString(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    const sub = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(sub) as number[]);
  }
  return binary;
}

function guessExtension(content: ContentRecord): string {
  const fromPath = content.filePath?.split('.').pop();
  if (fromPath && fromPath.length <= 5 && /^[a-zA-Z0-9]+$/.test(fromPath)) {
    return `.${fromPath.toLowerCase()}`;
  }
  if (content.type === 'PDF') return '.pdf';
  if (content.type === 'IMAGE') return '.jpg';
  if (content.type === 'DOC') return '.docx';
  return '.bin';
}

function mimeForType(t: ContentType): string | undefined {
  if (t === 'PDF') return 'application/pdf';
  if (t === 'IMAGE') return 'image/jpeg';
  if (t === 'DOC') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return undefined;
}

export function sanitizeFileBaseName(name: string, fallback: string): string {
  const n = name.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/_+/g, '_').trim();
  return n.length > 0 ? n.slice(0, 80) : fallback;
}

/**
 * Writes bytes to the app cache and opens the system share sheet (open in another app).
 */
export async function shareContentFileFromBuffer(args: {
  content: ContentRecord;
  data: ArrayBuffer;
}): Promise<void> {
  const { content, data } = args;
  const ext = guessExtension(content);
  const baseName = sanitizeFileBaseName(content.title || '', `content-${content.id ?? 'file'}`);

  const dir = cacheDirectory;
  if (!dir) {
    throw new Error('Cache directory is unavailable on this device.');
  }

  const uri = `${dir}${baseName}${ext}`;
  const binary = arrayBufferToBinaryString(data);
  const base64 = encodeBase64(binary);
  await writeAsStringAsync(uri, base64, { encoding: EncodingType.Base64 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: mimeForType(content.type),
    dialogTitle: content.title,
  });
}
