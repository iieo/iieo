export async function encodeIco(pngBlobs: Blob[]): Promise<Blob> {
  const buffers = await Promise.all(pngBlobs.map((b) => b.arrayBuffer()));
  const count = buffers.length;
  const headerSize = 6;
  const entrySize = 16;
  const totalHeader = headerSize + entrySize * count;

  const totalSize = totalHeader + buffers.reduce((acc, b) => acc + b.byteLength, 0);
  const out = new Uint8Array(totalSize);
  const view = new DataView(out.buffer);

  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, count, true);

  let offset = totalHeader;
  for (let i = 0; i < count; i += 1) {
    const buf = buffers[i];
    if (!buf) continue;
    const bytes = new Uint8Array(buf);
    const { width, height } = readPngSize(bytes);
    const entry = headerSize + entrySize * i;
    view.setUint8(entry + 0, width >= 256 ? 0 : width);
    view.setUint8(entry + 1, height >= 256 ? 0 : height);
    view.setUint8(entry + 2, 0);
    view.setUint8(entry + 3, 0);
    view.setUint16(entry + 4, 1, true);
    view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, buf.byteLength, true);
    view.setUint32(entry + 12, offset, true);

    out.set(bytes, offset);
    offset += buf.byteLength;
  }

  return new Blob([out], { type: 'image/x-icon' });
}

function readPngSize(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  return { width, height };
}
