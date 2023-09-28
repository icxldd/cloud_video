const express = require('express');
const { WebSocketServer } = require("protoo-server");
const mediasoup = require("mediasoup");
const ConfRoom = require("./lib/Room");
const https = require('httpolyglot')
const app = express();
const fs = require('fs');
const path = require('path');


(async () => {
  const worker = await mediasoup.createWorker({
    rtcMinPort: 3000,
    rtcMaxPort: 4000
  });

  worker.on("died", () => {
    console.log("mediasoup Worker died, exit..");
    process.exit(1);
  });

  var webRtcServerOptions = {
    listenInfos :
    [
      {
        protocol    : 'udp',
        ip          : '0.0.0.0',
        announcedIp : '192.168.1.12',
        port        : 44444
      },
      {
        protocol    : 'tcp',
        ip          : '0.0.0.0',
        announcedIp :  '192.168.1.12',
        port        : 44444
      }
    ]
  };

	const webRtcServer = await worker.createWebRtcServer(webRtcServerOptions);

	worker.appData.webRtcServer = webRtcServer;
  const router = await worker.createRouter({
    mediaCodecs: [
      {
        kind: "audio",
        name: "opus",
        mimeType: "audio/opus",
        clockRate: 48000,
        channels: 2
      },
      {
        kind: "video",
        name: "VP8",
        mimeType: "video/VP8",
        clockRate: 90000
      }
    ]
  });

  const room = new ConfRoom(router,worker);

const options = {
    key: fs.readFileSync(path.join(__dirname, './cert/live.taoqiu.top.key'), 'utf-8'),
    cert: fs.readFileSync(path.join(__dirname, './cert/live.taoqiu.top.pem'), 'utf-8')
}

const httpsServer = https.createServer(options, app);

httpsServer.listen(2345, () => {
  console.log('listening https ' + 2345)
});


  const wsServer = new WebSocketServer(httpsServer);
  wsServer.on("connectionrequest", (info, accept) => {
    console.log(
      "protoo connection request [peerId:%s, address:%s, origin:%s]",
      info.socket.remoteAddress,
      info.origin
    );

    room.handlePeerConnect({
      // to be more and more strict
      peerId: `p${String(Math.random()).slice(2)}`,
      protooWebSocketTransport: accept()
    });
  });

  console.log("websocket server started on http://127.0.0.1:2345");
  setInterval(() => console.log("room stat", room.getStatus()), 1000 * 5);
})();
