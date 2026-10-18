const {Buffer} = require("node:buffer");
const {
  parseU32,
  parseUtf8String,
  parseOpaque,
  parseI32,
  U32_BITS,
} = require("../rpc");
const {parseNfsTime, generateClientId} = require("../nfs-types");
const {NFS4_ERROR} = require("../nfs-errors");
const {connections, connectionIds} = require('../connections');

const FLAGS = {
  EXCHGID4_FLAG_SUPP_MOVED_REFER: 0x00000001,
  EXCHGID4_FLAG_SUPP_MOVED_MIGR: 0x00000002,
  EXCHGID4_FLAG_BIND_PRINC_STATEID: 0x00000100,
  EXCHGID4_FLAG_USE_NON_PNFS: 0x00010000,
  EXCHGID4_FLAG_USE_PNFS_MDS: 0x00020000,
  EXCHGID4_FLAG_USE_PNFS_DS: 0x00040000,
  EXCHGID4_FLAG_MASK_PNFS: 0x00070000,
  EXCHGID4_FLAG_UPD_CONFIRMED_REC_A: 0x40000000,
  EXCHGID4_FLAG_CONFIRMED_R: 0x80000000,
};

function execExchangeID(buffer, offset, key) {
  const eiaClientOwnerRes = parseClientOwner4(buffer, offset);
  const eiaClientOwner = eiaClientOwnerRes[0];
  offset = eiaClientOwnerRes[1];

  const eiaFlagsRes = parseU32(buffer, offset);
  const eiaFlagBits = eiaFlagsRes[0];
  offset = eiaFlagsRes[1];
  const eiaFlags = mapFlags(eiaFlagBits);

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

  const args = {eiaClientOwner, eiaFlags, eiaStateProtect, eiaClientImplId};
  console.log("EXCHANGE ID ARGS:", args);

  const connection = connections.get(key);
  if (typeof connection === 'undefined') {
    throw new Error(`Cannot find connection id by key "${key}"`);
  }

  const clientId4 = generateUniqueClientId(connectionIds);
  const sequenceId = 0;

  connection.clientOwner = eiaClientOwner;
  connection.clientId4 = clientId4;
  connectionIds.set(clientId4, connection);
  connection.sequenceId = sequenceId;

  let flags = 0;
  flags |= FLAGS.EXCHGID4_FLAG_CONFIRMED_R;

  const otherIncarnations = findOtherIncarnations(connections, eiaClientOwner);

  console.log("TODO: check if it is a new incarnation of the same co_ownerid and remove locks for the previos incarnation, generate new client id", otherIncarnations);

  return [[{isOk: true, res: {clientId4, sequenceId, flags}}], offset];
}

function findOtherIncarnations(connections, eiaClientOwner) {
  return connections
    .values()
    .filter(conn => conn.clientOwner.coOwnerId === eiaClientOwner.coOwnerId);
}

function mapFlags(eiaFlagBits) {
  return Object.entries(FLAGS).reduce(
    (acc, [flag, mask]) => ({...acc, [flag]: (eiaFlagBits & mask) !== 0}),
    {},
  );
}

function generateUniqueClientId(connectionIds) {
  let clientId;

  do {
    clientId = generateClientId();
  } while (connectionIds.has(clientId));

  return clientId;
}

function parseClientOwner4(buffer, offset) {
  const coVerifierRes = parseVerifier4(buffer, offset);
  const coVerifier = coVerifierRes[0];
  offset = coVerifierRes[1];

  const coOwnerIdRes = parseUtf8String(buffer, offset, true);
  const coOwnerId = coOwnerIdRes[0];
  offset = coOwnerIdRes[1];

  return [{coVerifier, coOwnerId}, offset];
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
      return [{stateProtectHow4}, offset];
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

  return [{niiDomain, niiName, niiTime}, offset];
}

function serializeExchangeIdRes({
  eirStatus,
  eirClientId,
  eirSequenceId,
  eirFlags,
  eirStateProtect,
  eirServerOwner,
  eirServerScope,
  eirServerImpl1,
}) {
  const bufferCap = U32_BITS;
  let offset = 0;

  const buffer = Buffer.alloc(bufferCap);

  buffer.writeInt32BE(eirStatus ?? NFS4_ERROR.NFS4_OK);
  offset += U32_BITS;

  if (eirStatus !== NFS4_ERROR.NFS4_OK) {
    // void
    return buffer;
  }

  buffer.writeBigInt64BE(eirClientId);
  offset += 8;
}

exports.execExchangeID = execExchangeID;
