const { Buffer } = require("node:buffer");

const U32_BITS = 4;
const U64_BITS = 8;

function parseRPC(buffer) {
  const recordMarker = buffer.readUInt32BE(0);
  // TODO: accumulate bytes untill is last, use xid to accumulate chunks
  const isLast = (0x80000000 & recordMarker) !== 0;
  const length = recordMarker & 0x7fffffff;
  let offset = U32_BITS;

  console.assert(
    buffer.length === length + U32_BITS,
    "buffer has unsufficient length",
  );

  const xidRes = parseXID(buffer, offset);
  const xid = xidRes[0];
  offset = xidRes[1];
  const bodyRes = parseBody(buffer, offset);
  console.assert(
    isLast && bodyRes[1] === buffer.length,
    "should exhaust buffer on last",
  );

  return { xid, body: bodyRes[0] };
}

function asRPC(xid, body) {
  // xid + body
  const frameLength = U32_BITS + body.length;
  console.assert(
    frameLength <= 0x7fffffff,
    "multi-frame responses not implemented yet",
  );

  // compute required capacity for the RCP frame
  // record marker - U32_BITS
  // remaning frame
  const bufferCap = U32_BITS + frameLength;
  const buffer = Buffer.alloc(bufferCap);

  let offset = 0;

  const recordMarker = frameLength | 0x80000000;
  buffer.writeInt32BE(recordMarker, offset);
  offset += U32_BITS;

  buffer.writeUInt32BE(xid, offset);
  offset += U32_BITS;

  body.copy(buffer, offset, 0);

  return buffer;
}

const MSG_TYPE_CALL_CODE = 0;
const MSG_TYPE_REPLY_CODE = 1;

function isMsgTypeCall(int) {
  return int === MSG_TYPE_CALL_CODE;
}

function parseXID(buffer, offset) {
  return [buffer.readUInt32BE(offset), offset + U32_BITS];
}

function parseBody(buffer, offset) {
  const discrRes = parseSwitchDiscr(buffer, offset);
  const discr = discrRes[0];
  offset = discrRes[1];
  const isCall = isMsgTypeCall(discr);
  const bodyRes = isCall
    ? parseCallBody(buffer, offset)
    : parseReplyBody(buffer, offset);
  return [{ isCall, body: bodyRes[0] }, bodyRes[1]];
}

function parseCallBody(buffer, offset) {
  const rpcVers = buffer.readUInt32BE(offset);
  offset += U32_BITS;
  console.assert(rpcVers === 2, "RPC version has to be 2");

  const prog = buffer.readUInt32BE(offset);
  offset += U32_BITS;

  const vers = buffer.readUInt32BE(offset);
  offset += U32_BITS;

  const proc = buffer.readUInt32BE(offset);
  offset += U32_BITS;

  const credsRes = parseOpaqueAuth(buffer, offset);
  const creds = credsRes[0];
  offset = credsRes[1];

  const verfRes = parseOpaqueAuth(buffer, offset);
  const verf = credsRes[0];
  offset = verfRes[1];

  const args = Buffer.from(buffer.subarray(offset));

  return [
    { rpcVers, prog, vers, proc, creds, verf, args },
    offset + args.length,
  ];
}

function parseReplyBody(buffer, offset) {
  const unparsed = buffer.subarray(offset);
  return [unparsed, offset + unparsed.length];
}

// reply_stat enum
const MSG_ACCEPTED = "MSG_ACCEPTED";
const MSG_ACCEPTED_CODE = 0;
const MSG_DENIED = "MSG_DENIED";
const MSG_DENIED_CODE = 1;

// accept_stat enum
const SUCCESS = "SUCCESS";
const SUCCESS_CODE = 0;
const PROG_UNAVAIL = "PROG_UNAVAIL";
const PROG_UNAVAIL_CODE = 1;
const PROG_MISMATCH = "PROG_MISMATCH";
const PROG_MISMATCH_CODE = 2;
const PROC_UNAVAIL = "PROC_UNAVAIL";
const PROC_MISMATCH_CODE = 3;
const GARBAGE_ARGS = "GARBAGE_ARGS";
const GARBAGE_ARGS_CODE = U32_BITS;
const SYSTEM_ERR = "SYSTEM_ERR";
const SYSTEM_ERR_CODE = 5;

function buildNullAcceptBody(acceptStatCode, data = Buffer.alloc(0)) {
  const dataLength = data.length;
  const noneVerifier = buildAuthNoneVerifier();

  // msg_type + reply_stat + verifier + accept_stat + data
  const bufferCap =
    U32_BITS + U32_BITS + noneVerifier.length + U32_BITS + dataLength;
  let offset = 0;
  const buffer = Buffer.alloc(bufferCap);

  buffer.writeUInt32BE(MSG_TYPE_REPLY_CODE, offset);
  offset += U32_BITS;

  buffer.writeUInt32BE(MSG_ACCEPTED_CODE, offset);
  offset += U32_BITS;

  noneVerifier.copy(buffer, offset, 0);
  offset += noneVerifier.length;

  buffer.writeUInt32BE(acceptStatCode, offset);
  offset += U32_BITS;

  data.copy(buffer, offset, 0);

  return buffer;
}

const AUTH_NONE = "AUTH_NONE";
const AUTH_NONE_CODE = 0;
const AUTH_SYS = "AUTH_SYS";
const AUTH_SHORT = "AUTH_SHORT";
const AUTH_DH = "AUTH_DH";
const RPCSEC_GSS = "RPCSEC_GSS";

const flavours = Object.freeze(
  new Map([
    [0, AUTH_NONE],
    [1, AUTH_SYS],
    [2, AUTH_SHORT],
    [3, AUTH_DH],
    [6, RPCSEC_GSS],
  ]),
);

function buildAuthNoneVerifier() {
  const buffer = Buffer.alloc(2 * U32_BITS);
  const verifierLength = 0;
  buffer.writeUInt32BE(AUTH_NONE_CODE);
  buffer.writeUInt32BE(verifierLength, U32_BITS);
  return buffer;
}

function parseAuthFlavor(buffer, offset) {
  const flavourBytes = buffer.readInt32BE(offset);

  const authFlavour = flavours.get(flavourBytes);
  console.assert(typeof authFlavour === "string", "unrecognized auth flavour");

  return [authFlavour, offset + U32_BITS];
}

function parseOpaqueAuth(buffer, offset) {
  const authFlavourRes = parseAuthFlavor(buffer, offset);
  const authFlavour = authFlavourRes[0];
  offset = authFlavourRes[1];

  const bodyLength = buffer.readUInt32BE(offset);
  offset += U32_BITS;

  const body = buffer.subarray(offset, offset + bodyLength);

  return [{ authFlavour, body }, offset + bodyLength];
}

function parseSwitchDiscr(buffer, offset) {
  return [buffer.readInt32BE(offset), offset + U32_BITS];
}

function parseUtf8String(buffer, offset, padded) {
  const length = buffer.readUInt32BE(offset);
  offset += U32_BITS;

  const stringBytes = Buffer.from(buffer.subarray(offset, offset + length));
  const finalOffset =
    padded && length % 4 !== 0
      ? offset + length + (4 - (length % 4))
      : offset + length;
  return [stringBytes.toString("utf8"), finalOffset];
}

function parseU32(buffer, offset) {
  return [buffer.readUInt32BE(offset), offset + U32_BITS];
}
function parseI32(buffer, offset) {
  return [buffer.readInt32BE(offset), offset + U32_BITS];
}

function parseI64(buffer, offset) {
  return [buffer.readBigInt64BE(offset), offset + U64_BITS];
}

function parseDynArray(buffer, offset) {
  console.log("dyn array offset", offset);
  const length = buffer.readUInt32BE();
  offset += U32_BITS;
  console.log("dyn array length", length);

  const bytes = buffer.subarray(offset, offset + length);
  return [Buffer.from(bytes), offset + length];
}

function parseOpaque(buffer, offset, size) {
  return [Buffer.from(buffer.subarray(offset, offset + size)), offset + size];
}

function parseU32(buffer, offset) {
  return [buffer.readUInt32BE(offset), offset + U32_BITS];
}

exports.parseRPC = parseRPC;
exports.asRPC = asRPC;
exports.isMsgTypeCall = isMsgTypeCall;
exports.AUTH_NONE = AUTH_NONE;
exports.AUTH_SYS = AUTH_SYS;
exports.AUTH_SHORT = AUTH_SHORT;
exports.AUTH_DH = AUTH_DH;
exports.RPCSEC_GSS = RPCSEC_GSS;

exports.buildNullAcceptBody = buildNullAcceptBody;
exports.MSG_ACCEPTED_CODE = MSG_ACCEPTED_CODE;
exports.SUCCESS_CODE = SUCCESS_CODE;

exports.asRPC = asRPC;

exports.parseUtf8String = parseUtf8String;
exports.parseU32 = parseU32;
exports.parseI32 = parseI32;
exports.parseI64 = parseI64;
exports.parseDynArray = parseDynArray;
exports.parseOpaque = parseOpaque;
