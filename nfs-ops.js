const {
  parseU32,
  parseUtf8String,
  parseOpaque,
  parseI32,
  parseI64,
} = require("./rpc");
const OP_ACCESS = 3;
const OP_EXCHANGE_ID = 42;

// it executes operation (op) by consuming expected arguments from buffer
// starting from (offset)
// returns [result, new offset]
function execOp(op, buffer, offset) {
  switch (op) {
    case OP_ACCESS:
      return execAccess(buffer, offset);
    case OP_EXCHANGE_ID:
      return execExchangeID(buffer, offset);
    default:
      throw new Error(`Operation (${op}) is not implemented yet`);
  }
}

function execAccess(buffer, offset) {
  const accessCodeRes = parseU32(buffer, offset);
  const access = accessCodeRes[0];
  offset = accessCodeRes[1];

  // TODO: implent access granting

  return [{ isOk: true, res: { supported: access, access } }, offset];
}

const EXCHGID4_FLAG_SUPP_MOVED_REFER = 0x00000001;
const EXCHGID4_FLAG_SUPP_MOVED_MIGR = 0x00000002;

const EXCHGID4_FLAG_BIND_PRINC_STATEID = 0x00000100;

const EXCHGID4_FLAG_USE_NON_PNFS = 0x00010000;
const EXCHGID4_FLAG_USE_PNFS_MDS = 0x00020000;
const EXCHGID4_FLAG_USE_PNFS_DS = 0x00040000;

const EXCHGID4_FLAG_MASK_PNFS = 0x00070000;

const EXCHGID4_FLAG_UPD_CONFIRMED_REC_A = 0x40000000;
const EXCHGID4_FLAG_CONFIRMED_R = 0x80000000;

function execExchangeID(buffer, offset) {
  const eiaClientOwnerRes = parseClientOwner4(buffer, offset);
  const eiaClientOwner = eiaClientOwnerRes[0];
  offset = eiaClientOwnerRes[1];

  const eiaFlagsRes = parseU32(buffer, offset);
  const eiaFlags = eiaFlagsRes[0];
  offset = eiaFlagsRes[1];

  const eiaStateProtectRes = parseStateProtect4A(buffer, offset);
  const eiaStateProtect = eiaStateProtectRes[0];
  offset = eiaStateProtectRes[1];

  const numOfNfsImpleIdRes = parseU32(buffer, offset);
  const hasNfsImplID = numOfNfsImpleIdRes[0] === 1;
  offset = numOfNfsImpleIdRes[1];

  let eiaClientImplId;
  if (hasNfsImplID) {
    const eiaClientImplIdRes = parseNfsImplId4(buffer, offset);
    eiaClientImplId = eiaClientImplIdRes[0];
    offset = eiaClientImplIdRes[1];
  }

  const args = { eiaClientOwner, eiaFlags, eiaStateProtect, eiaClientImplId };
  console.log("EXCHANGE ID ARGS:", args);

  throw new Error("EXCHANGE ID actions are not implemented yet");
}

function parseClientOwner4(buffer, offset) {
  const coVerifierRes = parseVerifier4(buffer, offset);
  const coVerifier = coVerifierRes[0];
  offset = coVerifierRes[1];

  const coOwnerIdRes = parseUtf8String(buffer, offset, true);
  const coOwnerId = coOwnerIdRes[0];
  offset = coOwnerIdRes[1];

  return [{ coVerifier, coOwnerId }, offset];
}

const NFS4_VERIFIER_SIZE = 8;
function parseVerifier4(buffer, offset) {
  return parseOpaque(buffer, offset, NFS4_VERIFIER_SIZE);
}

const SP4_NONE = 0;
const SP4_MACH_CRED = 1;
const SP4_SSV = 2;
function parseStateProtect4A(buffer, offset) {
  const stateProtectDiscrRes = parseI32(buffer, offset);
  const stateProtectHow4 = stateProtectDiscrRes[0];
  offset = stateProtectDiscrRes[1];

  switch (stateProtectHow4) {
    case SP4_NONE:
      return [{ stateProtectHow4 }, offset];
    case SP4_MACH_CRED:
      throw new Error("SP4_MACH_CRED not implemented yet");
    case SP4_SSV:
      throw new Error("SP4_SSV not implemented yet");
    default:
      throw new Error(
        `Parsing State Protect Error: Unexpected state_protect_how4 (${stateProtectHow4})`,
      );
  }
}

function parseNfsImplId4(buffer, offset) {
  const niiDomainRes = parseUtf8String(buffer, offset, true);
  const niiDomain = niiDomainRes[0];
  offset = niiDomainRes[1];

  const niiNameRes = parseUtf8String(buffer, offset, true);
  const niiName = niiNameRes[0];
  offset = niiNameRes[1];

  const niiTimeRes = parseNfsTime(buffer, offset);
  const niiTime = niiTimeRes[0];
  offset = niiTimeRes[1];

  return [{ niiDomain, niiName, niiTime }, offset];
}

function parseNfsTime(buffer, offset) {
  const secondsRes = parseI64(buffer, offset);
  const seconds = secondsRes[0];
  offset = secondsRes[1];

  const nsecondsRes = parseU32(buffer, offset);
  const nseconds = secondsRes[0];
  offset = nsecondsRes[1];

  return [{ seconds, nseconds }, offset];
}

exports.execOp = execOp;
