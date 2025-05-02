const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const fetch = require('node-fetch');
const { Readable } = require('stream');
const path = require('path');

// Register the Open Sans font
registerFont(path.join(__dirname, '../../assets/fonts/SpaceMono-Regular.ttf'), { family: 'Space Mono' });

async function fetchImageBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch image from ${url}`);
  return await response.buffer();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;

    if (testWidth > maxWidth && n > 0) {
      lines.push(line.trim());
      line = words[n] + ' ';
    } else {
      line = testLine;
    }
  }

  lines.push(line.trim());
  return lines;
}

async function generateWelcomeGif(user, guild, messageTemplate, backgroundURL) {
  const width = 700;
  const height = 250;
  const encoder = new GIFEncoder(width, height);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100); // frame delay in ms
  encoder.setQuality(10); // image quality. 10 is default.

  const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
  const backgroundBuffer = await fetchImageBuffer(backgroundURL || 'https://media.tenor.com/nG8mRUjHvhoAAAAC/galaxy.gif');
  const avatarBuffer = await fetchImageBuffer(avatarURL);

  const avatarImage = await loadImage(avatarBuffer);
  const backgroundImage = await loadImage(backgroundBuffer);

  const welcomeMsg = messageTemplate
    .replace('{user}', user.username)
    .replace('{server}', guild.name);

  ctx.drawImage(backgroundImage, 0, 0, width, height);

  ctx.save();
  ctx.beginPath();
  ctx.arc(100, height / 2, 50, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(avatarImage, 50, height / 2 - 50, 100, 100);
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Space Mono';
  ctx.fillText(user.username, 200, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = '20px Space Mono';
  ctx.fillText(welcomeMsg, 200, 150);

  encoder.addFrame(ctx);
  encoder.finish();

  return encoder.out.getData();
}

module.exports = { generateWelcomeGif };
