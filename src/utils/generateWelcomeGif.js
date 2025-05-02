const { createCanvas, loadImage, registerFont } = require('canvas');
const GIFEncoder = require('gif-encoder-2');
const fetch = require('node-fetch');
const { Readable } = require('stream');
const path = require('path');
const sharp = require('sharp'); // Import sharp for image processing

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

  try {
    // Validate user object
    if (!user || typeof user.displayAvatarURL !== 'function') {
      throw new Error('Invalid user object. Ensure the user parameter is a valid Discord.js User or GuildMember instance.');
    }

    // Load background GIF and extract frames using sharp
    const backgroundBuffer = await fetchImageBuffer(backgroundURL || 'https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExNzQ4bjB3NnI2ZDE2bGx2azZjaWR3NnF4cGhvMWU0OGt3NGt0dGtvMCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1jRItUChOutcU0MDsc/giphy.gif');
    const gifFrames = await sharp(backgroundBuffer, { animated: true }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

    // Validate frame data
    if (!gifFrames.info || gifFrames.info.pages <= 0) {
      throw new Error('Invalid GIF format or no frames found.');
    }

    // Load user avatar
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 512 });
    const avatarBuffer = await fetchImageBuffer(avatarURL);
    const avatarImage = await loadImage(avatarBuffer);

    // Prepare welcome message
    const welcomeMsg = messageTemplate
      .replace('{user}', user.username)
      .replace('{server}', guild.name);

    // Generate frames by combining the background GIF frames with the user avatar and text
    const maxFrames = Math.min(60, gifFrames.info.pages); // Limit to 60 frames
    for (let i = 0; i < maxFrames; i++) {
      ctx.clearRect(0, 0, width, height);

      const frameSize = gifFrames.info.width * gifFrames.info.height * gifFrames.info.channels;
      const frameBuffer = gifFrames.data.slice(i * frameSize, (i + 1) * frameSize);

      const processedFrameBuffer = await sharp(frameBuffer, {
        raw: {
          width: gifFrames.info.width,
          height: gifFrames.info.height,
          channels: gifFrames.info.channels,
        },
      })
        .resize(width, height)
        .png()
        .toBuffer();

      const frameImage = await loadImage(processedFrameBuffer);
      ctx.drawImage(frameImage, 0, 0, width, height);

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
    }

    encoder.finish();

    // Return the complete GIF buffer
    return encoder.out.getData();
  } catch (error) {
    console.error('Error generating welcome GIF:', error);
    throw new Error('Failed to generate welcome GIF. Please check the image formats.');
  }
}

module.exports = { generateWelcomeGif };
