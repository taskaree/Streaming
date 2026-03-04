const fs = require("fs");
const { exec } = require("child_process");

const folders = fs.readdirSync(`${__dirname}/Chunks`);
let uploadedSize = 0;
let totalSize = 0;
folders.forEach((folder) => {
  const files = fs.readdirSync(`${__dirname}/Chunks/${folder}`);
  files.forEach((file) => {
    totalSize += fs.statSync(`${__dirname}/Chunks/${folder}/${file}`).size;
  });
});


const uploadFile = (folderIndex, index) => {
  if (folderIndex == folders.length) return;
  const folder = folders[folderIndex];
  if (index == 0) {
    console.log(`Uploading ${folder}`);
  }
  if (fs.existsSync(`${__dirname}/Chunks/${folder}/${index}.txt`)) {
    uploadedSize += fs.statSync(`${__dirname}/Chunks/${folder}/${index}.txt`).size;
    let size = uploadedSize / 1024 / 1024;
    if (size >= 1000) {
      size = (size / 1000).toFixed(2) + " GB";
    } else {
      size = size.toFixed(2) + " MB";
    }
    size += " / ";
    let total = totalSize / 1024 / 1024;
    if (total >= 1000) {
      total = (total / 1000).toFixed(2) + " GB";
    } else {
      total = total.toFixed(2) + " MB";
    }
    size += total;
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(size);
    exec(
      `cd ${__dirname}/Chunks/${folder} && git add ${index}.txt && git commit -m "added ${folder}/${index}.txt" && git push`,
      (error, stdout, stderr) => {
        uploadFile(folderIndex, index + 1);
      }
    );
  } else {
    exec(
      `cd ${__dirname}/Chunks/${folder} && git add extension.txt && git commit -m "added ${folder}/extension.txt" && git push`,
      (error, stdout, stderr) => {
        console.log(`\nFinished uploading ${folder}`);
        uploadFile(folderIndex + 1, 0);
      }
    );
  }
};

uploadFile(0, 0);
