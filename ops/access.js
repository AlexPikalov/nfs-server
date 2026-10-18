const { parseU32 } = require("../rpc");

function execAccess(buffer, offset) {
  const accessCodeRes = parseU32(buffer, offset);
  const access = accessCodeRes[0];
  offset = accessCodeRes[1];

  // TODO: implent access granting

  return [{ isOk: true, res: { supported: access, access } }, offset];
}

exports.execAccess = execAccess;
