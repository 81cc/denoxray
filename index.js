const express = require("express");
const app = express();
const { exec } = require("child_process");

const PORT = process.env.PORT || 3000;

const ARGO_AUTH = process.env.ARGO_AUTH || "";
const ARGO_DOMAIN = process.env.ARGO_DOMAIN || "";
const NEZHA_SERVER = process.env.NEZHA_SERVER || "";
const NEZHA_KEY = process.env.NEZHA_KEY || "";
const NEZHA_PORT = process.env.NEZHA_PORT || "";


// ================== HTTP（先啟動）==================
app.get("/", (req, res) => {
  res.send("running");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Server running on " + PORT);
});


// ================== 工具 ==================
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function run(cmd) {
  return new Promise((resolve) => {
    exec(cmd, (err, stdout, stderr) => {
      resolve(stdout || stderr);
    });
  });
}


// ================== 哪吒 ==================
async function startNezha() {
  if (!NEZHA_SERVER || !NEZHA_KEY) {
    console.log("skip nezha");
    return;
  }

  while (true) {
    try {
      console.log("starting nezha...");

      let cmd;

      if (NEZHA_PORT) {
        cmd = `nohup ./agent -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} >/dev/null 2>&1 &`;
      } else {
        cmd = `nohup ./agent -s ${NEZHA_SERVER} -p ${NEZHA_KEY} >/dev/null 2>&1 &`;
      }

      await run(cmd);
      console.log("nezha started");

      await sleep(60000); // 每分鐘檢查一次

    } catch (e) {
      console.log("nezha error", e);
      await sleep(5000);
    }
  }
}


// ================== CF隧道 ==================
async function startArgo() {
  while (true) {
    try {
      console.log("starting argo...");

      let cmd;

      if (ARGO_AUTH) {
        cmd = `nohup ./cloudflared tunnel run --token ${ARGO_AUTH} >/dev/null 2>&1 &`;
      } else {
        cmd = `nohup ./cloudflared tunnel --url http://localhost:${PORT} >/dev/null 2>&1 &`;
      }

      await run(cmd);
      console.log("argo started");

      await sleep(60000);

    } catch (e) {
      console.log("argo error", e);
      await sleep(5000);
    }
  }
}


// ================== 主啟動 ==================
async function main() {
  console.log("background start...");

  // 同時啟動（不阻塞）
  startNezha();
  startArgo();
}

// 延遲啟動（避免平台卡）
setTimeout(main, 2000);
