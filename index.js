const net = require("node:net");
const { parseRPC, asRPC, buildNullAcceptBody, SUCCESS_CODE } = require("./rpc");
const { handleNFSPacket } = require("./nfs-server");
const server = net.createServer(connectionHandler);

server.listen(2049, "0.0.0.0", () => console.log("server created"));

function connectionHandler(c) {
  const now = Date.now();
  console.group(now);
  console.log("client conected");
  c.on("data", (data) => {
    console.log("request data: ", data);
    const request = parseRPC(data);
    console.log("RPC frame: ", request);

    try {
      const result = handleNFSPacket(request.body);
      const responseFrame = asRPC(request.xid, result);
      console.log("response RPC frame:", responseFrame);
      c.write(responseFrame);
    } catch (err) {
      console.error(err);
    }
  });
  c.on("end", () => {
    console.log("client disconnected");
    console.groupEnd(now);
  });
}
