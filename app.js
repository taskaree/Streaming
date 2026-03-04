const { google } = require("googleapis");
const MESSAGING_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const scopes = [MESSAGING_SCOPE];
const express = require("express");
const fs = require("fs");
const https = require("https");
const app = express();
app.use(express.json());
const port = process.env.PORT || 5000;

const email = "taskaree2026season1@outlook.com";
let chunkedFiles = 0;
let totalFiles = 0;

const deleteFolderRecursive = (path) => {
  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function (file) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const prepareChunkForFile = (fileName, start, numberOfChunks) => {
  const fileSize = fs.statSync(`${__dirname}/Videos/${fileName}`).size;
  if (start == fileSize) {
    console.log(`finished chunking ${fileName}`);
    chunkedFiles++;
    if (chunkedFiles == totalFiles) {
      console.log("\n###### Chunked all files ######\n")
    }
    return;
  }
  if (start == 0) {
    const extension = fileName.substring(fileName.lastIndexOf(".") + 1);
    fs.writeFileSync(
      `${__dirname}/Chunks/${fileName.substring(
        0,
        fileName.lastIndexOf(".")
      )}/extension.txt`,
      extension
    );
  }
  const end = Math.min(start + 20 * 1024 * 1024, fileSize - 1);
  const stream = fs.createReadStream(`${__dirname}/Videos/${fileName}`, {
    start,
    end,
  });
  stream.on("data", (data) => {
    fs.appendFileSync(
      `${__dirname}/Chunks/${fileName.substring(
        0,
        fileName.lastIndexOf(".")
      )}/${numberOfChunks}.txt`,
      data
    );
    // stream.close();
  });
  stream.on("close", () => {
    prepareChunkForFile(fileName, end + 1, numberOfChunks + 1);
  });
};

const prepareChunks = () => {
  const filenames = fs.readdirSync(`${__dirname}/Videos`);
  totalFiles = filenames.length;
  let chunks = 0;
  let start = 0;
  let end = 0;
  deleteFolderRecursive(`${__dirname}/Chunks`);
  fs.mkdirSync(`${__dirname}/Chunks`);
  filenames.forEach((fileName) => {
    fs.mkdirSync(
      `${__dirname}/Chunks/${fileName.substring(0, fileName.lastIndexOf("."))}`
    );
    prepareChunkForFile(fileName, 0, 0);
  });
};

const prepareVideos = () => {
  const folderNames = fs.readdirSync(`${__dirname}/Chunks`);
  deleteFolderRecursive(`${__dirname}/PreparedVideos`);
  fs.mkdirSync(`${__dirname}/PreparedVideos`);
  folderNames.forEach((folderName) => {
    const extension = fs
      .readFileSync(`${__dirname}/Chunks/${folderName}/extension.txt`)
      .toString();
    const chunks = fs.readdirSync(`${__dirname}/Chunks/${folderName}`);
    for (let i = 0; i < chunks.length - 1; i++) {
      const data = fs.readFileSync(
        `${__dirname}/Chunks/${folderName}/${i}.txt`
      );
      fs.appendFileSync(
        `${__dirname}/PreparedVideos/${folderName}.${extension}`,
        data
      );
    }
    console.log(`finished preparing ${folderName}`);
  });
};

// prepareVideos();
prepareChunks();

const sendServiceStartNotification = () => {
  if (port != 5000) {
    const options = {
      hostname: "streamvilla-fcm.onrender.com",
      path: "/fcm/send",
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    };
    const request = https.request(options);

    request.on("error", (error) => {
      res
        .status(501)
        .send({ error: "Cannot send notification to target devices" });
    });

    const data = {
      to: "/topics/developer",
      data: {
        title: "Streaming service started",
        text: email,
        notification_id: 4096,
        topic: "/topics/developer",
      },
    };
    request.write(JSON.stringify(data));
    request.end();
  }
};

app.get("/videos/details", (req, res) => {
  const videoPath = `${__dirname}/PreparedVideos`;
  const fileNames = fs.readdirSync(videoPath);
  const data = [];
  data.push({ email });
  fileNames.forEach((fileName) => {
    data.push({ fileName, size: fs.statSync(`${videoPath}/${fileName}`).size });
  });
  res.json({ data });
});

app.get("/videos/stream/:id", (req, res) => {
  const { range } = req.headers;
  const videoPath = `${__dirname}/PreparedVideos/${req.params.id}`;
  const videoSize = fs.statSync(videoPath).size;
  const fullVideoStream = fs.createReadStream(videoPath);
  let actualSize = videoSize / 1024 / 1024;
  // console.log(`video size = ${actualSize} MB`)
  const start =
    range == undefined
      ? 0
      : Number(range.substring("bytes=".length, range.indexOf("-")));
  let end = Math.max(0, videoSize - 1);
  if (
    range != undefined &&
    range.includes("-") &&
    range.length > range.indexOf("-") + 1
  ) {
    end = Number(range.substring(range.indexOf("-") + 1));
  }
  actualSize = start / 1024 / 1024;
  // console.log(`start at = ${actualSize} MB, ${convertToStandardTime(Math.floor(videoTime * start / videoSize))}`)
  actualSize = end / 1024 / 1024;
  // console.log(`end at = ${actualSize} MB`)
  // console.log(`Enjoy until ${convertToStandardTime(nextLoadTime)}`);
  const contentLength = end - start + 1;
  const headers = {
    "Content-Range": `bytes=${start}-${end}/${videoSize}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength,
    "Content-Type": `video/${videoPath.substring(
      videoPath.lastIndexOf(".") + 1
    )}`,
  };
  res.writeHead(206, headers);
  const stream = fs.createReadStream(videoPath, {
    start,
    end,
  });
  stream.pipe(res);
});

app.get("/videos/download/:id", (req, res) => {
  res.download(`${__dirname}/PreparedVideos/${req.params.id}`);
});

app.get("/subtitles/:id", (req, res) => {
  res.download(`${__dirname}/subtitles/${req.params.id}`);
});

app.listen(port, () => {
  sendServiceStartNotification();
  console.log(`Server started on port ${port}`);
});
