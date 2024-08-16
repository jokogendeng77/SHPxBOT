const {
    mkdirSync: mkdirSync
  } = require("fs");
  const chalk = require("chalk");
  const path = require("path");
  const fs = require("fs");
  const axios = require("axios");
  const {
    performance: performance
  } = require("perf_hooks");
  const { exec } = require("child_process");
  let ffmpegProcess = null;
  
  function decodeUnicode(e) {
    return e.replace(/\\u([\d\w]{4})/gi, (e, t) => String.fromCharCode(parseInt(t, 16)));
  }
  
  async function downloadFile(e, t, o = 30) {
    const r = fs.createWriteStream(t);
    const a = performance.now();
    const n = a + o * 1000;
    const s = new Date(Date.now() + o * 1000).toLocaleTimeString();
    const i = await axios({
      url: e,
      method: "GET",
      responseType: "stream"
    });
    if (i.headers["content-length"]) {
      parseInt(i.headers["content-length"], 10);
    }
    let l = 0;
    i.data.on("data", e => {
      l += e.length;
      const t = (performance.now() - a) / 1000;
      const r = l / 1048576;
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(`Progress: [${(t / o * 100).toFixed(2)}%] | Time Elapsed: ${formatTime(t)} | Downloaded: ${r.toFixed(2)} MB | Estimated End Time: ${s}`);
      
      // Check if the duration has been reached
      if (t >= o) {
        i.data.destroy(); // Stop the download
        r.end();
        console.log(`\nDownload stopped after ${o} seconds`);
      }
    });
    i.data.pipe(r);
    return new Promise((resolve, reject) => {
      r.on("finish", () => {
        // Ensure the file is properly closed before conversion
        r.close(() => {
          // Convert the file using ffmpeg
          const outputFilePath = t.replace(/\.[^/.]+$/, "") + ".mp4"; // Change extension to .mp4
          exec(`ffmpeg -i ${t} -c copy ${outputFilePath}`, (err, stdout, stderr) => {
            if (err) {
              console.error("Error converting file with ffmpeg:", err);
              reject(err);
            } else {
              console.log("File converted successfully:", outputFilePath);
              resolve(outputFilePath);
            }
          });
        });
      });
      r.on("error", err => {
        r.close(() => {
          fs.unlink(t, () => {
            reject(err);
          });
        });
      });
      i.data.on("error", err => {
        r.close(() => {
          fs.unlink(t, () => {
            reject(err);
          });
        });
      });
    });
  }
  
  function formatTime(e) {
    const t = Math.floor(e / 3600);
    const o = Math.floor(e % 3600 / 60);
    const r = Math.floor(e % 60);
    return `${t.toString().padStart(2, "0")}:${o.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
  }
  
  const processVideo = async ({
    liveUrl: e,
    rtmpServer: t = null,
    rtmpKey: o = null,
    isInfiniteMode: r = false,
    streamDuration: a = 0,
    baseFilePath: n = "",
    mode: s = "stream"
  }) => {
    console.log(chalk.blue("Starting the streaming process. Please wait..."));
    const i = require("child_process");
    const { existsSync: l } = require("fs");
    let c;
    let d = null;
    if (s === "restream") {
      if (t && o) {
        c = `${t}${o}`;
        d = `${n}.flv`;
      } else {
        c = `${n}.flv`;
      }
    } else {
      c = `${t}${o}`;
    }
    const generateFileName = (e, t) => {
      let o = 0;
      let r = `${e}${o > 0 ? `-${o}` : ""}.${t}`;
      while (l(r)) {
        o++;
        r = `${e}${o > 0 ? `-${o}` : ""}.${t}`;
      }
      return r;
    };
    if (d && l(d)) {
      d = generateFileName(n, "flv");
    }
    if (l(c)) {
      const e = c.split(".").pop();
      c = generateFileName(n, e);
    }
    process.stdout.clearLine(0);
    process.stdout.cursorTo(0);
    const p = [
      chalk.white("Live Url : ") + chalk.red(`${e}`),
      chalk.white("Output Destination : ") + chalk.yellow(`${c}`),
      chalk.white("Secondary Output : ") + chalk.green(`${d || "Not Applicable"}`)
    ].join("\n");
    const m = Math.max(0, p.length - chalk.reset(p).length + 20);
    const u = chalk.blue("=".repeat(m));
    process.stdout.write(`${u}\n${p}\n${u}`);
    const h = [
      "-re",
      "-stream_loop",
      "-1",
      "-i",
      e,
      "-r",
      "30",
      "-b:v",
      "2000k",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-c:a",
      "aac",
      "-f",
      "flv",
      "-loglevel",
      "info",
      "-hide_banner",
      c
    ];
    if (d) {
      h.push(d);
    }
    if (a > 0) {
      h.push("-t", a.toString());
    }
    ffmpegProcess = i.spawn("ffmpeg", h);
    let f = 0;
    let S = 0;
    let g = 0;
    let w = 0;
    let k = a > 0 ? new Date(Date.now() + a * 1000).toLocaleTimeString() : "N/A";
    ffmpegProcess.stderr.on("data", e => {
      const t = e.toString();
      const o = t.match(/Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2},/);
      const r = t.match(/time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/);
      const n = t.match(/size=\s*(\d+)kB/);
      if (o) {
        S = parseInt(o[1]) * 3600 + parseInt(o[2]) * 60 + parseInt(o[3]);
      }
      if (r) {
        g = parseInt(r[1]) * 3600 + parseInt(r[2]) * 60 + parseInt(r[3]);
        if (a > 0 && g >= a) {
          console.log(chalk.green("\nStream duration reached. Stopping..."));
          ffmpegProcess.kill("SIGKILL");
        }
      }
      if (n) {
        w = parseInt(n[1]);
      }
      const s = a > 0 ? (g / a * 100).toFixed(2) : "N/A";
      const i = (w / 1024).toFixed(2);
      const l = new Date(g * 1000).toISOString().substr(11, 8);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(chalk.green(`Progress: [${s}%] | Time Elapsed: ${l} | Downloaded: ${i} MB | Estimated End Time: ${k}`));
      if (t.includes("error")) {
        f += 1;
        if (f > 5) {
          console.log(chalk.red("\nWe encountered a problem and need to stop. Please try again."));
          ffmpegProcess.kill("RESTART");
        }
      }
    });
    ffmpegProcess.on("close", (i, l) => {
      const c = `Streaming process exited with code: ${i} and signal: ${l}`;
      if (i !== 0 && l !== "SIGINT" && l !== "SIGKILL") {
        console.log(chalk.magenta(c));
        console.log(chalk.yellow("The streaming process has ended unexpectedly. Attempting to restart..."));
        setTimeout(() => {
          if (s !== "restream") {
            ({
              liveUrl: r || s === "restream" ? d : e,
              rtmpServer: t,
              rtmpKey: o,
              isInfiniteMode: r,
              streamDuration: a,
              baseFilePath: n
            }).mode = s;
          }
          downloadFile(e, n, a).then(() => console.log("Download complete")).catch(e => console.error("Download failed", e));
        }, 3000);
      } else if (l === "SIGINT" || l === "SIGKILL") {
        console.log(chalk.yellow("Streaming process was automatically terminated. Thank you!"));
        process.exit();
      } else {
        console.log(chalk.green("Streaming completed successfully."));
      }
    });
    process.on("SIGINT", () => {
      console.log(chalk.magenta("Streaming has been stopped. Thank you for using our service."));
      if (ffmpegProcess) {
        ffmpegProcess.kill("SIGINT");
      }
      process.exit();
    });
  };
  
  const reStreamShopee = async ({
    videoUrl: e,
    rtmpServer: t = null,
    rtmpKey: o = null,
    isInfiniteMode: r = false,
    streamDuration: a = 0
  }) => new Promise(async (n, s) => {
    try {
      let n = null;
      let s = `${__dirname}/../${e}`;
      let i = "stream";
      if (!e.includes("mp4") && !e.includes("flv")) {
        n = await getShopeeStreamDetails(e);
        if (!n) {
          throw new Error("Stream details could not be retrieved.");
        }
        s = decodeURIComponent(n.play_url);
        i = "restream";
      }
      const l = `${__dirname}/../stream_output/${n?.room_id}-${n?.username}`;
      await processVideo({
        liveUrl: s,
        rtmpServer: t,
        rtmpKey: o,
        isInfiniteMode: r,
        streamDuration: a,
        baseFilePath: l,
        mode: i
      });
    } catch (e) {
      s(e);
      console.error("Error in reStreamShopee function: ", e);
    }
  });
  
  const downloadStream = async ({
    videoUrl: e,
    durasiVideo: t = 0,
    rtmpServer: o = null,
    rtmpKey: r = null,
    isInfinite: a = false
  }) => {
    try {
      const n = getStreamProvider(e);
      let s = null;
      switch (n) {
        case "shopee":
        case "filestream":
          s = await reStreamShopee({
            videoUrl: e,
            streamDuration: t ? t * 60 : null,
            rtmpServer: o,
            rtmpKey: r,
            isInfiniteMode: a
          });
          break;
        case "tiktok":
          s = await tiktokDownload({
            videoUrl: e,
            duration: t ? parseInt(t) * 60 : null,
            rtmpServer: o,
            rtmpKey: r,
            isInfiniteMode: a
          });
          break;
        default:
          throw Error(`Platform "${n}" Not Supported Yet!`);
      }
      return s;
    } catch (e) {
      throw Error(e);
    }
  };
  
  const getStreamProvider = e => {
    let t = "";
    t = e.includes("http") ? new URL(e).hostname : "filestream";
    if (t.includes("tiktok")) {
      return "tiktok";
    } else if (t.includes("youtube")) {
      return "youtube";
    } else if (t.includes("twitch")) {
      return "twitch";
    } else if (t.includes("facebook")) {
      return "facebook";
    } else if (t.includes("tokopedia")) {
      return "tokopedia";
    } else if (t.includes("shopee")) {
      return "shopee";
    } else if (t.includes("file")) {
      return "filestream";
    } else {
      return t;
    }
  };
  
  const getShopeeStreamDetails = async e => {
    const t = new URL(e);
    const o = t.hostname;
    const r = t.searchParams.get("session");
    return fetch(`https://${o}/api/v1/session/${r}`, {
      headers: {
        Host: `${o}`,
        "Sec-Ch-Ua": "\"Brave\";v=\"119\", \"Chromium\";v=\"119\", \"Not?A_Brand\";v=\"24\"",
        "Sec-Ch-Ua-Mobile": "?0",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "X-Api-Source": "pc",
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopee-Language": "id",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Ch-Ua-Platform": "\"macOS\"",
        "Sec-Gpc": "1",
        "Accept-Language": "id-ID,id;q=0.6",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        Referer: `https://${o}/?is_from_login=true&is_from_login=true`,
        "Accept-Encoding": "gzip, deflate, br"
      }
    }).then(async e => {
      const t = await e.json();
      if (t.err_code == 0) {
        return t?.data?.session;
      } else {
        return t;
      }
    });
  };
  
  const tiktokStreamData = async e => {
    const t = `https://www.tiktok.com/@${e}/live`;
    const o = (await fetch(t, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36"
      }
    }).then(e => e.text())).match(/room_id=(\d+)/);
    if (!o) {
      throw new Error("No live stream found");
    }
    const r = o[1];
    console.info(`\nFound live stream with room id ${r}!`);
    const a = `https://www.tiktok.com/api/live/detail/?aid=1988&roomID=${r}`;
    const {
      LiveRoomInfo: n
    } = await fetch(a).then(e => e.json());
    const {
      title: s,
      liveUrl: i
    } = n;
    return {
      title: s,
      liveUrl: i
    };
  };
  
  const tiktokDownload = async ({
    videoUrl: e,
    outputDirectory: t = "stream_output",
    format: o = "mp4",
    duration: r = 0,
    rtmpKey: a = null,
    rtmpServer: n = null,
    isInfiniteMode: s = false
  }) => new Promise(async (i, l) => {
    try {
      const i = e.split("/");
      const l = i[i.length - 2].replace("@", "");
      const {
        title: c,
        liveUrl: d
      } = await tiktokStreamData(l);
      const p = t.endsWith(o) ? t : `${t.replace(/\/$/, "")}/${l}-${Date.now()}.${o}`;
      mkdirSync(path.dirname(p), {
        recursive: true
      });
      await processVideo({
        liveUrl: d,
        rtmpServer: n,
        rtmpKey: a,
        isInfiniteMode: s,
        streamDuration: r,
        baseFilePath: p,
        mode: "restream"
      });
      console.info("\nCtrl+C to stop downloading and exit");
    } catch (e) {
      l(e);
    }
  });
  
  module.exports = {
    ffmpegProcess: ffmpegProcess,
    reStreamShopee: reStreamShopee,
    getShopeeStreamDetails: getShopeeStreamDetails,
    downloadStream: downloadStream,
    decodeUnicode: decodeUnicode,
    tiktokDownload: tiktokDownload
  };