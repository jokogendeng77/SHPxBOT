const {mkdirSync} = require("fs");
const chalk = require("chalk");
const path = require('path')

let ffmpegGlobalProcess = null;

function decodeUnicodeEscape(url) {
  return url.replace(/\\u([\d\w]{4})/gi, (match, grp) => {
    return String.fromCharCode(parseInt(grp, 16));
  });
}
const videoProcessing = async ({liveUrl, rtmpServer = null, rtmpKey = null, isInfiniteMode = false, streamDuration = null, baseFilePath = "", mode = "stream"}) =>{
  console.log(chalk.blue("Starting the streaming process. Please wait..."));
  const childProcess = require("child_process");
  const {existsSync} = require("fs");
  let outputDestination;
  let secondaryOutput = null;
  // Dynamically import boxen due to ES Module requirement
  if (mode === "restream") {
    if (rtmpServer && rtmpKey) {
      outputDestination = `${rtmpServer}${rtmpKey}`;
      secondaryOutput = `${baseFilePath}.flv`;
    } else {
      outputDestination = `${baseFilePath}.flv`;
    }
  } else {
    outputDestination = `${rtmpServer}${rtmpKey}`;
  }

  // Function to generate a unique file name to avoid conflicts
  const generateUniqueFileName = (baseName, extension) => {
    let counter = 0;
    let uniqueName = `${baseName}${counter > 0 ? `-${counter}` : ''}.${extension}`;
    while (existsSync(uniqueName)) {
      counter++;
      uniqueName = `${baseName}${counter > 0 ? `-${counter}` : ''}.${extension}`;
    }
    return uniqueName;
  };

  // Adjusting file names to be unique if necessary
  if (secondaryOutput && existsSync(secondaryOutput)) {
    secondaryOutput = generateUniqueFileName(baseFilePath, 'flv');
  }
  if (existsSync(outputDestination)) {
    const extension = outputDestination.split('.').pop();
    outputDestination = generateUniqueFileName(baseFilePath, extension);
  }

  process.stdout.clearLine(0);
  process.stdout.cursorTo(0);
  const messageComponents = [
    chalk.white('Live Url : ')+chalk.red(`${liveUrl}`),
    chalk.white('Output Destination : ')+chalk.yellow(`${outputDestination}`),
    chalk.white('Secondary Output : ')+chalk.green(`${secondaryOutput || 'Not Applicable'}`)
  ];
  const message = messageComponents.join('\n');
  // Ensuring borderLength is not negative
  const borderLength = Math.max(0, message.length - chalk.reset(message).length + 20);
  const border = chalk.blue('='.repeat(borderLength));
  process.stdout.write(`${border}\n${message}\n${border}`);
  const ffmpegArgs = [
    "-re", 
    "-stream_loop", "-1", 
    "-i", liveUrl, 
    "-r", "30", 
    "-b:v", "2000k", 
    "-c:v", "libx264", 
    "-preset", "veryfast", 
    "-c:a", "aac", 
    "-f", "flv", 
    "-loglevel", "info",
    "-hide_banner",
    outputDestination
  ];

  if (secondaryOutput) {
    ffmpegArgs.push(secondaryOutput);
  }

  if (streamDuration) {
    ffmpegArgs.push("-t", streamDuration.toString());
  }

  ffmpegGlobalProcess = childProcess.spawn("ffmpeg", ffmpegArgs);
  let errorCount = 0;
  let totalSeconds = 0, currentTime = 0;

  ffmpegGlobalProcess.stderr.on("data", data => {
    const message = data.toString();
    const durationRegex = /Duration: (\d{2}):(\d{2}):(\d{2})\.\d{2},/;
    const timeRegex = /time=(\d{2}):(\d{2}):(\d{2})\.\d{2}/;
    const durationMatch = message.match(durationRegex);
    const timeMatch = message.match(timeRegex);

    if (durationMatch) {
      totalSeconds = parseInt(durationMatch[1]) * 3600 + parseInt(durationMatch[2]) * 60 + parseInt(durationMatch[3]);
    }

    if (timeMatch) {
      currentTime = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]);
      const progress = (currentTime / totalSeconds * 100).toFixed(2);
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(chalk.green(`Streaming Progress: [${progress}%]  | Time Elapsed: ${currentTime} seconds`));
    }
    if (message.includes("error")) {
      errorCount += 1;
      if (errorCount > 5) {
        console.log(chalk.red("We encountered a problem and need to stop. Please try again."));
        ffmpegGlobalProcess.kill('SIGINT');
      }
    }
  });
  ffmpegGlobalProcess.on("close", (code, signal) => {
    const exitMessage = `Streaming process exited with code: ${code} and signal: ${signal}`;
    const restartMessage = "Restarting in 3 seconds...";
    const restartProcess = () => {
      setTimeout(() => {
        try {
          videoProcessing({liveUrl: secondaryOutput, rtmpServer, rtmpKey, isInfiniteMode, streamDuration, baseFilePath, mode});
        } catch (error) {
          console.error(chalk.red(`Error restarting streaming process: ${error.message}`));
        }
      }, 3000);
    };

    if (code !== 0) {
      console.log(chalk.magenta(exitMessage));
      console.log(chalk.yellow("The streaming process has ended unexpectedly. Attempting to restart..."));
    } else {
      console.log(chalk.green("Streaming completed successfully."));
    }

    if (isInfiniteMode || (errorCount <= 5 && mode === "restream" && rtmpServer && rtmpKey)) {
      console.log(chalk.blue(restartMessage));
      restartProcess();
    }
  });

  process.on("SIGINT", () => {
    console.log(chalk.magenta("Streaming has been stopped. Thank you for using our service."));
    if (ffmpegGlobalProcess) {
      ffmpegGlobalProcess.kill('SIGINT');
    }
    process.exit();
  });
}
const reStreamShopee = async ({videoUrl, rtmpServer = null, rtmpKey = null, isInfiniteMode = false, streamDuration = null}) => {
  return new Promise(async (resolve, reject) => {
  try {
    let streamData = null;
    let liveUrl = `${__dirname}/../${videoUrl}`;
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
    reject(error);
    console.error("Error in reStreamShopee function: ", error);
  }});
};


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
  return new Promise(async (resolve, reject) => {
    try {
  const splitUsername = videoUrl.split('/');
  const tt_username = splitUsername[splitUsername.length - 2].replace('@', '');
  const {title, liveUrl} = await tiktokStreamData(tt_username);
  const fileName = output.endsWith(format)
    ? output
    : `${output.replace(
        /\/$/,
        ''
      )}/${tt_username}-${Date.now()}.${format}`
  mkdirSync(path.dirname(fileName), { recursive: true })
  await videoProcessing({liveUrl, rtmpServer, rtmpKey, isInfiniteMode, streamDuration: duration, baseFilePath:fileName, mode:"restream"});
  console.info(`\nCtrl+C to stop downloading and exit`)
}catch (error) {
    reject(error);
  }
});
}



module.exports = { ffmpegGlobalProcess ,reStreamShopee, getShopeeStreamDetails, decodeUnicodeEscape, streamDownloader };

