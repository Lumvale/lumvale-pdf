import { LumvalePDFEngine } from '@lumvale/pdf-core';

self.addEventListener('message', async (e) => {
  const { id, action, payload } = e.data;

  try {
    const engine = new LumvalePDFEngine();
    let resultBytes: Uint8Array;

    if (action === 'bates') {
      self.postMessage({ id, progress: 'Loading document...' });
      await engine.loadDocument(payload.documentBytes);
      self.postMessage({ id, progress: 'Applying Bates numbers...' });
      await engine.addBatesNumbering(payload.options);
      self.postMessage({ id, progress: 'Saving document...' });
      resultBytes = await engine.exportBytes();
    } else if (action === 'watermark') {
      self.postMessage({ id, progress: 'Loading document...' });
      await engine.loadDocument(payload.documentBytes);
      self.postMessage({ id, progress: 'Applying watermark...' });
      await engine.addWatermark(payload.options);
      self.postMessage({ id, progress: 'Saving document...' });
      resultBytes = await engine.exportBytes();
    } else if (action === 'headersFooters') {
      self.postMessage({ id, progress: 'Loading document...' });
      await engine.loadDocument(payload.documentBytes);
      self.postMessage({ id, progress: 'Applying headers and footers...' });
      await engine.addHeadersFooters(payload.options);
      self.postMessage({ id, progress: 'Saving document...' });
      resultBytes = await engine.exportBytes();
    } else if (action === 'compress') {
      self.postMessage({ id, progress: 'Loading document...' });
      await engine.loadDocument(payload.documentBytes);
      self.postMessage({ id, progress: 'Compressing document...' });
      await engine.compressDocument();
      self.postMessage({ id, progress: 'Saving document...' });
      resultBytes = await engine.exportBytes();
    } else if (action === 'encrypt') {
      self.postMessage({ id, progress: 'Loading document...' });
      await engine.loadDocument(payload.documentBytes);
      self.postMessage({ id, progress: 'Encrypting and saving document...' });
      resultBytes = await engine.exportEncryptedBytes(payload.userPassword, payload.ownerPassword, payload.permissions);
    } else {
      throw new Error(`Unknown action: ${action}`);
    }

    self.postMessage({ id, progress: 'Finalizing...' });
    // Transfer the result buffer back to main thread
    self.postMessage({ id, success: true, resultBytes }, { transfer: [resultBytes.buffer] });
  } catch (error: any) {
    self.postMessage({ id, success: false, error: error.message || String(error) });
  }
});
