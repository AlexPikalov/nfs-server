const net = require("node:net");
const {parseRPC, asRPC} = require("./rpc");
const {handleNFSPacket} = require("./nfs-server");
const {connections, connectionIds} = require('./connections');
const server = net.createServer(connectionHandler);

server.listen(2049, "0.0.0.0", () => console.log("server created"));

function connectionHandler(c) {
  const now = Date.now();
  console.group(now);
  const addr = c.address();
  const key = `${addr.address}:${addr.port}`;

  const newConnection = {};
  connections.set(key, newConnection);
  const deleteConnection = () => {
    connections.delete(key);
    connectionIds.delete(newConnection.clientId4);
    console.log(`connection ${key} deleted`, newConnection);
    console.log('connections', connections);
    console.log('connection ids', connectionIds);
  };

  console.log("client conected");
  c.on("data", (data) => {
    console.log("request data: ", data);
    const request = parseRPC(data);
    console.log("RPC frame: ", request);

    try {
      const result = handleNFSPacket(request.body, key);
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
    deleteConnection();
  });

}
