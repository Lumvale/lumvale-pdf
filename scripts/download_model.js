const fs = require('fs');
const path = require('path');
const https = require('https');

const model = 'Xenova/LaMini-Flan-T5-77M';
const files = [
  'config.json',
  'generation_config.json',
  'special_tokens_map.json',
  'tokenizer.json',
  'tokenizer_config.json',
  'onnx/encoder_model_quantized.onnx',
  'onnx/decoder_model_merged_quantized.onnx'
];

const baseUrl = `https://huggingface.co/${model}/resolve/main/`;
const outDir = path.join(__dirname, 'ui', 'public', 'models', model);

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Handle redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      } else {
        response.pipe(file);
        file.on('finish', () => {
          file.close(resolve);
        });
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  for (const file of files) {
    const url = baseUrl + file;
    const dest = path.join(outDir, file);
    console.log(`Downloading ${file}...`);
    await downloadFile(url, dest);
  }
  console.log('All files downloaded successfully!');
}

main().catch(console.error);
