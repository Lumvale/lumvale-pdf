/**
 * Types for the vendored, permission-aware encrypt routine.
 * See pdf-encrypt.js for provenance (vendored from @pdfsmaller/pdf-encrypt-lite, MIT).
 */

/**
 * Encrypt a PDF with RC4 128-bit (Standard Security Handler, revision 3).
 *
 * @param pdfBytes      The PDF to encrypt.
 * @param userPassword  Password required to open the document ("" for no open password).
 * @param ownerPassword Owner password; permissions are only enforced when this is set
 *                      and differs from the user password.
 * @param permissions   Signed 32-bit `/P` value. Defaults to 0xFFFFFFFC (all allowed).
 */
export function encryptPDF(
  pdfBytes: Uint8Array,
  userPassword: string,
  ownerPassword?: string | null,
  permissions?: number,
): Promise<Uint8Array>;
