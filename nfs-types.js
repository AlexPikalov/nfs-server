const { parseI64, parseU32 } = require("./rpc");
const { randomBytes } = require("node:crypto");

function parseNfsTime(buffer, offset) {
  const secondsRes = parseI64(buffer, offset);
  const seconds = secondsRes[0];
  offset = secondsRes[1];

  const nsecondsRes = parseU32(buffer, offset);
  const nseconds = secondsRes[0];
  offset = nsecondsRes[1];

  return [{ seconds, nseconds }, offset];
}

function generateClientId() {
  return randomBytes(64).readBigInt64BE();
}

exports.parseNfsTime = parseNfsTime;
exports.generateClientId = generateClientId;
