const fs = require("fs").promises;

const isFileExist = async (filePath) => {
    const fileExists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);

      if (fileExists) {
        console.log("File saved successfully:", filePath);
        return true;
      } else {
        console.error("Error: File not saved.");
        return false;
      }
}

const getRandomDelay = (min=3000, max=30000) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

module.exports = {getRandomDelay, isFileExist}