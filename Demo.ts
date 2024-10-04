function isImeiPacket(originalHex) {
  // Check if the packet length is 17 bytes and matches the pattern of an IMEI number
  const data = Buffer.from(originalHex, 'hex');
  console.log(data.length);
  const possibleImei = data.slice(2).toString(); // Skip the first 2 bytes, assuming it's length/header
  const imeiRegex = /^\d{15}$/; // Regular expression to check for 15-digit IMEI
  return imeiRegex.test(possibleImei);
}

const isImeiPackets = isImeiPacket('000F333536333037303432343431303133');

console.log(
  Buffer.from('000F333536333037303432343431303133', 'hex').toString('hex')
);

console.log(isImeiPackets);
