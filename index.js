#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const sharp = require('sharp');

// 全局变量存储命令行参数
let options = {
  convertAllToJpg: false
};

/**
 * 解析命令行参数
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const positionalArgs = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--convert-all-to-jpg' || arg === '-c') {
      options.convertAllToJpg = true;
    } else if (!arg.startsWith('-')) {
      positionalArgs.push(arg);
    }
  }

  return positionalArgs[0] || '.';
}

/**
 * 下载图片并保存到指定路径
 * @param {string} url 图片URL
 * @param {string} filepath 保存路径
 * @returns {Promise}
 */
function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    // 确保目录存在
    const dir = path.dirname(filepath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith('https') ? https : http;

    const request = protocol.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(filepath);
      });
    });

    request.on('error', (err) => {
      fs.unlink(filepath, () => { }); // 删除未完成的文件
      reject(err);
    });
  });
}

/**
 * 转换 awebp 图片为 png 或 jpg
 * @param {string} inputPath 输入文件路径
 * @param {string} outputPath 输出文件路径
 * @returns {Promise}
 */
async function convertAwebpToStandardFormat(inputPath, outputPath) {
  try {
    // 使用 sharp 将 awebp 转换为 png
    await sharp(inputPath).png().toFile(outputPath);
    // 删除原始 awebp 文件
    fs.unlinkSync(inputPath);
    return outputPath;
  } catch (error) {
    console.error('Error converting awebp to png:', error);
    throw error;
  }
}

/**
 * 将图片转换为 JPG 格式
 * @param {string} inputPath 输入文件路径
 * @param {string} outputPath 输出文件路径
 * @returns {Promise}
 */
async function convertToJpg(inputPath, outputPath) {
  try {
    await sharp(inputPath).jpeg({ quality: 90 }).toFile(outputPath);
    // 删除原始文件
    fs.unlinkSync(inputPath);
    return outputPath;
  } catch (error) {
    console.error(`Error converting ${inputPath} to jpg:`, error);
    throw error;
  }
}

/**
 * 处理单个 Markdown 文件
 * @param {string} filePath Markdown 文件路径
 */
async function processMarkdownFile(filePath) {
  console.log(`Processing ${filePath}...`);

  // 获取文件名（不含扩展名）作为目录名
  const fileName = path.basename(filePath, path.extname(filePath));
  const fileDir = path.dirname(filePath);
  const imagesDir = path.join(fileDir, fileName);

  // 读取文件内容
  const content = fs.readFileSync(filePath, 'utf8');

  // 正则表达式匹配 Markdown 图片语法 ![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
  let newContent = content;
  let match;
  let index = 0;

  while ((match = imageRegex.exec(content)) !== null) {
    const [fullMatch, altText, imageUrl] = match;

    // 只处理网络链接
    if (imageUrl.startsWith('http')) {
      try {
        // 生成本地文件名
        const urlObj = new URL(imageUrl);
        let extension = path.extname(urlObj.pathname) || '.jpg';
        let localFileName = `${index}${extension}`;
        let localImagePath = path.join(imagesDir, localFileName);
        let relativeImagePath = path.join(fileName, localFileName).replace(/\\/g, '/');

        // 下载图片
        await downloadImage(imageUrl, localImagePath);
        console.log(`Downloaded ${imageUrl} to ${localImagePath}`);

        // 检查是否为 awebp 格式，需要转换
        if (extension.toLowerCase() === '.awebp' ||
          (extension.toLowerCase() === '.webp' && path.basename(urlObj.pathname).toLowerCase().endsWith('.awebp'))) {
          // 如果启用了全部转换为 JPG 的选项，则转换为 JPG
          if (options.convertAllToJpg) {
            const jpgImagePath = localImagePath.replace(/\.(awebp|webp)$/i, '.jpg');
            const relativeJpgPath = relativeImagePath.replace(/\.(awebp|webp)$/i, '.jpg');

            await convertToJpg(localImagePath, jpgImagePath);
            console.log(`Converted awebp to jpg: ${jpgImagePath}`);

            // 更新路径和文件名
            localImagePath = jpgImagePath;
            relativeImagePath = relativeJpgPath;
            localFileName = path.basename(jpgImagePath);
          } else {
            // 转换为 png 格式
            const pngImagePath = localImagePath.replace(/\.(awebp|webp)$/i, '.png');
            const relativePngPath = relativeImagePath.replace(/\.(awebp|webp)$/i, '.png');

            await convertAwebpToStandardFormat(localImagePath, pngImagePath);
            console.log(`Converted awebp to png: ${pngImagePath}`);

            // 更新路径和文件名
            localImagePath = pngImagePath;
            relativeImagePath = relativePngPath;
            localFileName = path.basename(pngImagePath);
          }
        }
        // 如果启用了全部转换为 JPG 的选项，且不是 png、jpg、jpeg 格式，则转换为 JPG
        else if (options.convertAllToJpg &&
          !['.png', '.jpg', '.jpeg'].includes(extension.toLowerCase())) {
          const jpgImagePath = localImagePath.replace(new RegExp(`${extension}$`, 'i'), '.jpg');
          const relativeJpgPath = relativeImagePath.replace(new RegExp(`${extension}$`, 'i'), '.jpg');

          await convertToJpg(localImagePath, jpgImagePath);
          console.log(`Converted ${extension} to jpg: ${jpgImagePath}`);

          // 更新路径和文件名
          localImagePath = jpgImagePath;
          relativeImagePath = relativeJpgPath;
          localFileName = path.basename(jpgImagePath);
        }

        // 替换链接
        const newImageTag = `![${altText}](${relativeImagePath})`;
        newContent = newContent.replace(fullMatch, newImageTag);

        index++;
      } catch (error) {
        console.error(`Failed to download ${imageUrl}:`, error.message);
      }
    }
  }

  // 写入修改后的内容
  fs.writeFileSync(filePath, newContent, 'utf8');
  console.log(`Processed ${filePath}`);
}

/**
 * 处理目录下的所有 Markdown 文件
 * @param {string} dirPath 目录路径
 */
function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath); // 递归处理子目录
    } else if (path.extname(file).toLowerCase() === '.md') {
      processMarkdownFile(filePath);
    }
  });
}

const targetPath = parseArguments();
const fullPath = path.resolve(targetPath);

console.log(`Target path: ${fullPath}`);
if (options.convertAllToJpg) {
  console.log('Converting all non-PNG/JPG images to JPG format');
}

if (fs.existsSync(fullPath)) {
  const stat = fs.statSync(fullPath);

  if (stat.isDirectory()) {
    processDirectory(fullPath);
  } else if (path.extname(fullPath).toLowerCase() === '.md') {
    processMarkdownFile(fullPath);
  } else {
    console.error('Target must be a directory or a markdown file');
    process.exit(1);
  }
} else {
  console.error('Path does not exist');
  process.exit(1);
}