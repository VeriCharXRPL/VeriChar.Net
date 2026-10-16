'use strict';

/**
 * Dual-layer oracle.
 * Releases fulfillment only if BOTH pass:
 *   (1) itemized invoice verification (OCR vs listed need)
 *   (2) proof of delivery (EXIF/GPS/timestamp or carrier confirmation)
 *
 * The oracle guards the fulfillment. Whoever holds it can finish the escrow.
 * Never log or print the fulfillment.
 *
 * This module is a structured stub: verification functions are placeholders
 * that must be replaced with real OCR / EXIF / carrier checks before production.
 * Do not claim full verification works until those are implemented and tested.
 */

const { finishEscrow } = require('./escrow');
const { validateFulfillment } = require('./condition');

/**
 * @typedef {object} InvoiceCheckInput
 * @property {string} listedNeedId
 * @property {string} listedItemDescription
 * @property {string} listedAmountDrops - expected amount
 * @property {string|Buffer} invoiceDocument - raw invoice (PDF/image/text)
 * @property {object} [ocrResult] - pre-parsed OCR if available
 */

/**
 * @typedef {object} DeliveryProofInput
 * @property {string} expectedFacilityLat
 * @property {string} expectedFacilityLon
 * @property {number} [maxDistanceMeters]
 * @property {string|Buffer} [photo] - delivery photo with EXIF
 * @property {object} [exif] - pre-extracted EXIF
 * @property {object} [carrierConfirmation]
 * @property {string} [timestampIso]
 */

/**
 * Verify itemized invoice against the listed need.
 * STUB: returns structured result; real OCR/price matching not implemented.
 *
 * @param {InvoiceCheckInput} input
 * @returns {Promise<{ passed: boolean, reason: string, details?: object }>}
 */
async function verifyInvoice(input) {
  if (!input || !input.listedNeedId || !input.listedAmountDrops) {
    return { passed: false, reason: 'missing listed need or amount' };
  }

  // Placeholder: reject empty documents. Real implementation needs OCR + match.
  if (!input.invoiceDocument && !input.ocrResult) {
    return { passed: false, reason: 'no invoice document or OCR result provided' };
  }

  // UNIMPLEMENTED: OCR parse, line-item match, price check, vendor registry, duplicates.
  return {
    passed: false,
    reason: 'invoice verification not implemented — stub only',
    details: { listedNeedId: input.listedNeedId },
  };
}

/**
 * Verify proof of delivery.
 * STUB: returns structured result; real EXIF/GPS/carrier checks not implemented.
 *
 * @param {DeliveryProofInput} input
 * @returns {Promise<{ passed: boolean, reason: string, details?: object }>}
 */
async function verifyDeliveryProof(input) {
  if (!input) {
    return { passed: false, reason: 'missing delivery proof input' };
  }

  const hasPhoto = !!(input.photo || input.exif);
  const hasCarrier = !!input.carrierConfirmation;

  if (!hasPhoto && !hasCarrier) {
    return { passed: false, reason: 'no photo/EXIF or carrier confirmation provided' };
  }

  // UNIMPLEMENTED: EXIF GPS vs facility fence, timestamp freshness, carrier API, anti-spoof.
  return {
    passed: false,
    reason: 'delivery proof verification not implemented — stub only',
  };
}

/**
 * Run both checks. Release is allowed only if both pass.
 *
 * @param {InvoiceCheckInput} invoiceInput
 * @param {DeliveryProofInput} deliveryInput
 * @returns {Promise<{
 *   bothPassed: boolean,
 *   invoice: object,
 *   delivery: object
 * }>}
 */
async function verifyBoth(invoiceInput, deliveryInput) {
  const [invoice, delivery] = await Promise.all([
    verifyInvoice(invoiceInput),
    verifyDeliveryProof(deliveryInput),
  ]);

  return {
    bothPassed: invoice.passed === true && delivery.passed === true,
    invoice,
    delivery,
  };
}

/**
 * If both proofs pass, finish the escrow with the guarded fulfillment.
 * Fulfillment must never be logged.
 *
 * @param {import('xrpl').Client} client
 * @param {import('xrpl').Wallet} finisherWallet
 * @param {object} escrowRef
 * @param {string} escrowRef.owner
 * @param {number} escrowRef.offerSequence
 * @param {string} escrowRef.condition
 * @param {string} escrowRef.fulfillment - secret
 * @param {InvoiceCheckInput} invoiceInput
 * @param {DeliveryProofInput} deliveryInput
 * @returns {Promise<{ released: boolean, verification: object, txResult?: object }>}
 */
async function releaseIfVerified(
  client,
  finisherWallet,
  escrowRef,
  invoiceInput,
  deliveryInput
) {
  const { owner, offerSequence, condition, fulfillment } = escrowRef;

  if (!owner || offerSequence == null || !condition || !fulfillment) {
    throw new Error('escrowRef incomplete');
  }
  if (!validateFulfillment(fulfillment, condition)) {
    throw new Error('fulfillment does not match condition');
  }

  const verification = await verifyBoth(invoiceInput, deliveryInput);

  if (!verification.bothPassed) {
    return { released: false, verification };
  }

  const txResult = await finishEscrow(client, finisherWallet, {
    owner,
    offerSequence,
    condition,
    fulfillment,
  });

  return { released: true, verification, txResult };
}

module.exports = {
  verifyInvoice,
  verifyDeliveryProof,
  verifyBoth,
  releaseIfVerified,
};
