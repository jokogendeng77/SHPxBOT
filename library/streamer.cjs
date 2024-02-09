const ffmpeg = require("fluent-ffmpeg");
const util = require("util");
const exec = util.promisify(require("child_process").exec);
const fs = require("fs").promises;
const {mkdirSync} = require("fs");
const {isFileExist} = require("./file_helper.cjs");
const chalk = require("chalk");
const path = require('path')
const shell = require('shelljs')

let ffmpegGlobalProcess = null;

function decodeUnicodeEscape(url) {
  return url.replace(/\\u([\d\w]{4})/gi, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}

const videoProcessing = async ({liveUrl, rtmpServer = null, rtmpKey = null, isInfiniteMode = false, streamDuration = null, baseFilePath = "", mode = "stream"}) =>{
  const flvFilePath = `${baseFilePath}.flv`;
  const mp4FilePath = `${baseFilePath}.mp4`;
  
  // Create ffmpeg process
  ffmpegGlobalProcess = ffmpeg(liveUrl)
  .inputOptions(["-re", "-stream_loop -1"])
  .outputOptions([
    "-r 30",
    "-s 720x1280",
    "-b:v 800k",
    "-c:v libx264",
    "-preset superfast",
    "-c:a aac",
    "-f flv",
    "-maxrate 800k",
    "-bufsize 800k", 
    "-nostats", 
    "-hide_banner", 
    "-loglevel error"
  ]);

if (rtmpServer && rtmpKey) {
  console.log("Re-Steam started!..");
  ffmpegGlobalProcess
    .output(`${rtmpServer}/${rtmpKey}`)
    .format("flv");
}

if (streamDuration) {
  ffmpegGlobalProcess.duration(streamDuration);
}

if (mode === "restream"){
  ffmpegGlobalProcess
  .output(flvFilePath)
  .format("flv");
}

// Event listeners for ffmpeg process
ffmpegGlobalProcess
  .on("error", (err, stdout, stderr) => {
    console.error(chalk.red("Error:"), err);
    console.error("ffmpeg stdout:", stdout);
    console.error("ffmpeg stderr:", stderr);
    cleanup(ffmpegGlobalProcess);
  })
  .on("progress", (progress) => {
    // console.log("PROGRESS", progress);
  })
  .on("stderr", (stderrLine) => console.log(stderrLine))
  .on("end", async () => {
    console.log("Streaming finished.");
    if(isInfiniteMode){
      await handleStreamEnd(isInfiniteMode, flvFilePath, mp4FilePath, rtmpServer, rtmpKey);
    }
    return "Streaming finished.";
  });

// Start the ffmpeg process
ffmpegGlobalProcess.run();
}

const reStreamShopee = async ({videoUrl, rtmpServer = null, rtmpKey = null, isInfiniteMode = false, streamDuration = null}) => {
  try {
    let streamData = null;
    let liveUrl = `${__dirname}/../stream_input/${videoUrl}`;
    let mode = "stream";
    if(!videoUrl.includes("mp4") && !videoUrl.includes("flv")){
      streamData = await getShopeeStreamDetails(videoUrl);
      if (!streamData) {
        throw new Error("Stream details could not be retrieved.");
      }
      liveUrl = decodeURIComponent(streamData.play_url);
      mode = "restream";
    }
    const baseFilePath = `${__dirname}/../stream_output/${streamData?.room_id}-${streamData?.username}`;

    await videoProcessing({liveUrl, rtmpServer, rtmpKey, isInfiniteMode, streamDuration, baseFilePath, mode});
    
  } catch (error) {
    console.error("Error in reStreamShopee function: ", error);
  }
};

async function handleStreamEnd(isInfiniteMode, flvFilePath, mp4FilePath, rtmpServer, rtmpKey) {
  // Convert FLV to MP4
  await convertFlvToMp4(flvFilePath, mp4FilePath);
  // Check if the file exists
  const isMp4 = await isFileExist(mp4FilePath);
  
  if (isInfiniteMode) {
    console.log(chalk.green("\nRestarting the stream..."));
    const videoFile = isMp4 ? mp4FilePath : flvFilePath;
    // Restart the stream in infinite mode
    let ffmpegProcess = ffmpeg(videoFile)
      .inputOptions(["-re", "-stream_loop -1"])
      .output(`${rtmpServer}/${rtmpKey}`)
      .format("flv")
      .on("error", (err) => {
        console.error(chalk.red("Error during infinite streaming:"), err);
        cleanup(ffmpegProcess);
      })
      .run();
  } else {
    console.log(chalk.green("\nConversion finished."));
  }
}

function cleanup(ffmpegProcess) {
  ffmpegProcess.kill('SIGKILL');
  console.log("Cleaning Up ffmpeg..")
}


const streamDownloader = async ({videoUrl, durasiVideo = null, rtmpServer = null, rtmpKey = null, isInfinite = false}) => {
  try {
    const streamProvider = getStreamProvider(videoUrl);
    let result = null;
    switch (streamProvider) {
      case "shopee":
      case "filestream": 
        result = await reStreamShopee({videoUrl, streamDuration:durasiVideo?durasiVideo*60:null, rtmpServer, rtmpKey, isInfiniteMode:isInfinite});
        break;
  
      case "tiktok":
        result = await tiktokDownload({videoUrl:videoUrl, duration:durasiVideo?parseInt(durasiVideo)*60:null, rtmpServer, rtmpKey, isInfiniteMode:isInfinite})
        break;
  
      default:
        throw Error(`Platform "${streamProvider}" Not Supported Yet!`);
    }
    return result;
  } catch(err) {
    throw Error(err);
  }

}

const getStreamProvider = (videoUrl) => {
  let hostname = "";
  if(videoUrl.includes("http")){
    const url = new URL(videoUrl);
    hostname = url.hostname;
  }else {
    hostname = "filestream";
  }
  if (hostname.includes("tiktok.com")) {
    return "tiktok";
  } else if (hostname.includes("youtube.com")) {
    return "youtube";
  } else if (hostname.includes("twitch.tv")) {
    return "twitch";
  } else if (hostname.includes("facebook.com")) {
    return "facebook";
  } else if (hostname.includes("tokopedia.com")) {
    return "tokopedia";
  } else if (hostname.includes("shopee.co.id")) {
    return "shopee";
  } else if (hostname.includes("file")) {
    return "filestream";
  } else {
    return hostname;
  }
}

const getShopeeStreamDetails = async (videoUrl) => {
  const url = new URL(videoUrl);
  const session_id = url.searchParams.get("session");
  const response = fetch(
    `https://live.shopee.co.id/api/v1/session/${session_id}`,
    {
      headers: {
        Host: "live.shopee.co.id",
        "Sec-Ch-Ua":
          '"Brave";v="119", "Chromium";v="119", "Not?A_Brand";v="24"',
        "Sec-Ch-Ua-Mobile": "?0",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
        "X-Api-Source": "pc",
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Shopee-Language": "id",
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Gpc": "1",
        "Accept-Language": "id-ID,id;q=0.6",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Dest": "empty",
        Referer: "https://shopee.co.id/?is_from_login=true&is_from_login=true",
        "Accept-Encoding": "gzip, deflate, br",
      },
    }
  ).then(async (res) => {
    const jsonRes = await res.json();
    if (jsonRes.err_code == 0) {
      return jsonRes?.data?.session;
    }
    return jsonRes;
  });
  return response;
};

const tiktokStreamData = async (username) => {
  const tiktokUrl = `https://www.tiktok.com/@${username}/live`
  const textHtml = await fetch(tiktokUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36',
    },
  }).then((res) => res.text())
  const matchRoomId = textHtml.match(/room_id=(\d+)/)
  if (!matchRoomId) {
    throw new Error('No live stream found')
  }
  const roomId = matchRoomId[1]
  console.info(`\nFound live stream with room id ${roomId}!`)
  const api = `https://www.tiktok.com/api/live/detail/?aid=1988&roomID=${roomId}`
  const {LiveRoomInfo} = await fetch(api).then((res) => res.json())
  const {title, liveUrl} = LiveRoomInfo;

  return {title, liveUrl};
}

const tiktokDownload = async ({videoUrl, output="stream_output", format="mp4", duration=0, rtmpKey=null, rtmpServer=null, isInfiniteMode=false}) => {
  // return new Promise(async (resolve, reject) => {
    try {
  // const recDuration = duration > 0 ? `-t ${duration}` : "";
  const splitUsername = videoUrl.split('/');
  const tt_username = splitUsername[splitUsername.length - 2].replace('@', '');
  const {title, liveUrl} = await tiktokStreamData(tt_username);
  const fileName = output.endsWith(format)
    ? output
    : `${output.replace(
        /\/$/,
        ''
      )}/${tt_username}-${Date.now()}`
  mkdirSync(path.dirname(fileName), { recursive: true })
  await videoProcessing({liveUrl, rtmpServer, rtmpKey, isInfiniteMode, streamDuration: duration, baseFilePath:fileName, mode:"restream"});
  // const ffmpegCommand = `ffmpeg -i "${liveUrl}" -r 30 -s 720x1280 -b:v 800k -c:v libx264 -preset superfast -c:a aac -maxrate 800k -bufsize 800k "${fileName}" ${recDuration} -n -nostats -hide_banner -loglevel error`;
  
  console.info(`\nDownloading livestream ${title} to /${fileName}`)
  console.info(`\nCtrl+C to stop downloading and exit`)
  // Listen for the Ctrl+C signal
  // shell.exec(ffmpegCommand, { async: true }, (code, stdout, stderr) => {
  //   if (code === 0) {
  //     resolve(`Download completed: ${fileName}`);
  //   } else {
  //     reject(`Download failed with code ${code}: ${stderr}`);
  //   }
  // });
}catch (error) {
    reject(error);
  }
// });
}

async function getVideoFileInfo(inputPath) {
  const { stdout } = await exec(
    `ffprobe.exe -v error -select_streams v:0 -show_entries stream=width,height -of csv=s=x:p=0 "${inputPath}"`
  );
  const [width, height] = stdout.trim().split("x").map(Number);
  return { width, height };
}

async function convertFlvToMp4(inputPath, outputPath) {
  try {
    const videoInfo = await getVideoFileInfo(inputPath);
    // Determine the best video bitrate based on resolution
    const maxBitrate = Math.min(
      5000,
      Math.floor((videoInfo.width * videoInfo.height) / 4000)
    );
    const videoBitrate = `${maxBitrate}k`;
    await new Promise((resolve, reject) => {
      ffmpeg()
        .input(inputPath)
        .outputOptions([
          "-movflags frag_keyframe+empty_moov",
          "-c:v libx264",
          "-b:v " + videoBitrate,
        ])
        .videoCodec("libx264") // Re-encode the video stream
        .videoBitrate(videoBitrate)
        .output(outputPath)
        .on("end", () => {
          console.log("Conversion to MP4 finished.");
          resolve();
        })
        .on("error", (err) => {
          console.error("Error during MP4 conversion:", err);
          reject(err);
        })
        .run();
    });

    // Remove the FLV file
    await fs.unlink(inputPath);
    console.log("FLV file removed:", inputPath);
  } catch (error) {
    console.error("Error in convertFlvToMp4:", error);
  }
}

module.exports = { ffmpegGlobalProcess ,reStreamShopee, getShopeeStreamDetails, convertFlvToMp4, decodeUnicodeEscape, streamDownloader };
