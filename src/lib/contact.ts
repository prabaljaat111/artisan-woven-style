export const WHATSAPP_NUMBER_DISPLAY = "+91 90444 66957";
export const WHATSAPP_NUMBER_E164 = "919044466957";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
export const CALL_NUMBER_DISPLAY = "+91 79713 24559";
export const CALL_NUMBER_E164 = "917971324559";
export const PHONE_TEL = `tel:+${CALL_NUMBER_E164}`;
export const waLink = (text: string) =>
  `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;