const fs = require("fs");
let folders = fs.readdirSync(`${__dirname}/Chunks`);
let season = folders[0].substring(0, folders[0].indexOf("E"));
const url = "https://streaming-t95i.onrender.com";
let dataString = "";
folders.forEach((folder) => {
  if (!folder.startsWith(season)) {
    dataString = dataString + "\n";
    season = folder.substring(0, folder.indexOf("E"));
  }
  const extension = fs.readFileSync(`${__dirname}/Chunks/${folder}/extension.txt`);
  dataString = dataString + url + "/videos/stream/" + folder + "." + extension + "\n"
});
fs.writeFileSync(`${__dirname}/episodes.txt`,dataString);

if(fs.existsSync(`${__dirname}/subtitles`)) {
  folders = fs.readdirSync(`${__dirname}/subtitles`);
  dataString = "";
  folders.forEach((folder) => {
    if (!folder.startsWith(season)) {
      dataString = dataString + "\n";
      season = folder.substring(0, folder.indexOf("E"));
    }
    dataString = dataString + url + "/subtitles/" + folder + "\n"
  });
  fs.writeFileSync(`${__dirname}/subtitles.txt`,dataString);
}