export const WHATSAPP_NUMBER_DISPLAY = "+91 90444 66957";
export const WHATSAPP_NUMBER_E164 = "919044466957";
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER_E164}`;
export const PHONE_TEL = `tel:+${WHATSAPP_NUMBER_E164}`;
export const waLink = (text: string) =>
  `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;