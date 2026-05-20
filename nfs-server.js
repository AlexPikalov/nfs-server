const {
  buildNullAcceptBody,
  SUCCESS_CODE,
  parseUtf8String,
  parseU32,
  parseDynArray,
} = require("./rpc");

const { execOp } = require("./nfs-ops");

function handleNFSPacket(packet) {
  assertProg(packet.body);
  switch (packet.body.proc) {
    case PROC_NULL:
      return buildNullAcceptBody(SUCCESS_CODE);
    case PROC_COMPOUND:
      console.assert(packet.isCall, `COMPOUND proc is not a call`);
      // TODO: implement authorization
      console.log("COMPOUND creds", packet.body.creds);
      console.log("COMPOUND verf", packet.body.verf);
      return execCompound(packet.body.args);
    default:
      throw new Error(
        `Procedure (${packet.body.proc}) is not implemented yet.`,
      );
  }
}

const NFS_PROG_NO = 100003;
const PROC_NULL = 0;
const PROC_COMPOUND = 1;

function assertProg(body) {
  console.assert(body.prog === NFS_PROG_NO, `Unexpected prog ${body.prog}`);
}

function execCompound(buffer) {
  let offset = 0;
  // tag
  const tagRes = parseUtf8String(buffer, offset);
  offset = tagRes[1];
  const tag = tagRes[0];
  console.log("COMPOUND tag:", tag);

  // minorversion
  const minorVersionRes = parseU32(buffer, offset);
  const minorversion = minorVersionRes[0];
  offset = minorVersionRes[1];
  console.log("COMPOUND minorversion:", minorversion);

  const numberOfOpsRes = parseU32(buffer, offset);
  const numberOfOps = numberOfOpsRes[0];
  offset = numberOfOpsRes[1];

  const results = new Map();
  for (let i = 0; i < numberOfOps; i += 1) {
    const opcodeRes = parseU32(buffer, offset);
    const opcode = opcodeRes[0];
    offset = opcodeRes[1];

    const opExecRes = execOp(opcode, buffer, offset);
    offset = opExecRes[1];
    results.set(opcode, opExecRes[0]);
  }

  console.log("COMPOUND results:", results);

  return { results };
}

exports.handleNFSPacket = handleNFSPacket;
