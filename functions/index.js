const { onRequest } = require("firebase-functions/v2/https");
const next = require("next");

const nextjsServer = next({
  dev: false,
  conf: {
    distDir: ".next",
  },
});

const nextjsHandle = nextjsServer.getRequestHandler();

exports.nextjsFunc = onRequest(
  {
    region: "europe-west1",
    memory: "1GiB",
    timeoutSeconds: 60,
  },
  async (req, res) => {
    await nextjsServer.prepare();
    return nextjsHandle(req, res);
  }
);
