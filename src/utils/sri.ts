
/**
 * SRI Ecuador Utilities
 */

// Generar clave de acceso versión con Date (para servicios)
export const generateAccessKeyFromDate = (
  date: Date,
  docType: string,
  ruc: string,
  environment: string,
  series: string,
  sequential: string,
  randomCode: string,
  emissionType: string
): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const dateStr = `${day}${month}${year}`;
  
  const base = `${dateStr}${docType}${ruc}${environment}${series}${sequential}${randomCode}${emissionType}`;
  
  // Módulo 11 con multiplicador decreciente
  let sum = 0;
  let multiplier = 7;
  
  for (let i = 0; i < base.length; i++) {
    sum += parseInt(base[i]) * multiplier;
    multiplier--;
    if (multiplier < 2) multiplier = 7;
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : 11 - remainder;
  
  return base + checkDigit;
};

// Versión original con formato de fecha string (ddmmyyyy)
export const generateAccessKey = (
  date: string, // ddmmyyyy
  type: string, // 01 for Invoice
  ruc: string,
  environment: string, // 1 for Test, 2 for Prod
  establishment: string, // 001
  emissionPoint: string, // 001
  sequential: string, // 9 digits
  numericCode: string = '12345678', // 8 digits
  emissionType: string = '1' // 1 for Normal
): string => {
  // Format: ddmmyyyy + type + ruc + environment + establishment + point + sequential + numeric + emissionType
  let key = date.replace(/\//g, '') + type + ruc + environment + establishment + emissionPoint + sequential.padStart(9, '0') + numericCode + emissionType;
  
  const verifier = calculateModulo11(key);
  return key + verifier;
};

const calculateModulo11 = (key: string): number => {
  let factor = 2;
  let sum = 0;
  
  for (let i = key.length - 1; i >= 0; i--) {
    sum += parseInt(key[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  
  const checkDigit = 11 - (sum % 11);
  if (checkDigit === 11) return 0;
  if (checkDigit === 10) return 1;
  return checkDigit;
};
