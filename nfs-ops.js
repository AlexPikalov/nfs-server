const {execAccess} = require("./ops/access");
const {execExchangeID} = require("./ops/exchange-id");

const OP_ACCESS = 3;
const OP_EXCHANGE_ID = 42;

// it executes operation (op) by consuming expected arguments from buffer
// starting from (offset)
// returns [result, new offset]
function execOp(op, buffer, offset, key) {
  switch (op) {
    case OP_ACCESS:
      return execAccess(buffer, offset);
    case OP_EXCHANGE_ID:
      return execExchangeID(buffer, offset, key);
    default:
      throw new Error(`Operation (${op}) is not implemented yet`);
  }
}

exports.execOp = execOp;
exports.OP_EXCHANGE_ID = OP_EXCHANGE_ID;
