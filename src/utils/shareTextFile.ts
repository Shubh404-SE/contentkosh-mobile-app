import * as Sharing from 'expo-sharing';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import { sanitizeFileBaseName } from './contentOpen';

export async function shareTextFile(args: {
  fileNameBase: string;
  extension: string;
  mimeType?: string;
  contents: string;
}): Promise<void> {
  const dir = cacheDirectory;
  if (!dir) throw new Error('Cache directory is unavailable on this device.');

  const base = sanitizeFileBaseName(args.fileNameBase, 'export');
  const ext = args.extension.startsWith('.') ? args.extension : `.${args.extension}`;
  const uri = `${dir}${base}${ext}`;

  await writeAsStringAsync(uri, args.contents, { encoding: EncodingType.UTF8 });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error('Sharing is not available on this device.');

  await Sharing.shareAsync(uri, {
    mimeType: args.mimeType,
    dialogTitle: args.fileNameBase,
  });
}

