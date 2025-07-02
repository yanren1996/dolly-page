const path = require('path');
const fs = require('fs');
const Client = require('ssh2-sftp-client');
const cliProgress = require('cli-progress');
const colors = require('ansi-colors');

// __dirname 是node運行的主程式所在目錄(由node內建)
const localPath = path.join(__dirname, '..', 'websocket-example', 'target', 'websocket-example-0.0.1-SNAPSHOT.jar');
const remotePath = path.join('/home/yanren/', path.basename(localPath));
const config = {
  host: '192.168.0.29',
  username: 'yanren',
  password: '1113'
};

upload();

async function upload() {
  const sftp = new Client();
  try {
    await sftp.connect(config);
    console.log('🔗 已連線至 sftp 伺服器\n');

    // 進度條
    const fileSize = fs.statSync(localPath);
    const progress = new cliProgress.SingleBar({
      format: '📦 上傳進度 ' + colors.green('{bar}') + '  {percentage}% || {value}/{total} 位元組 || 速率: {speed}',
      barCompleteChar: '█',
      barIncompleteChar: '░',
      hideCursor: true
    });
    progress.start(fileSize.size, 0, { speed: 'N/A' });

    // 速度計算
    let transferred = 0;
    let lastTransferred = 0;
    let lastTime = Date.now();
    const speedInterval = setInterval(() => {
      const now = Date.now();
      const deltaBytes = transferred - lastTransferred;
      const deltaTimeSec = (now - lastTime) / 1000;
      const speedKBs = deltaBytes / deltaTimeSec;

      lastTransferred = transferred;
      lastTime = now;
      progress.update(transferred, { speed: unitConversion(speedKBs) });
    }, 500);

    // await sftp.put(localPath, remotePath); // 一般上傳(官方GitHub文檔提到，伺服器需要支援併發操作才可使用fastPut())
    await sftp.fastPut(localPath, remotePath, {
      step: (totalTransferred, chunk, total) => {
        transferred = totalTransferred;
        progress.update(totalTransferred);
      }
    });

    clearInterval(speedInterval);
    progress.stop();
    console.log('\n🚩 已成功上傳檔案\n');
  } catch (err) {
    console.error('sftp 上傳失敗 😱:', err);
  } finally {
    sftp.end();
  }
}

function unitConversion(bytes) {
  if (bytes > 2 * 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(2).toString() + " MB/s";
  } else if (bytes > 2 * 1024) {
    return (bytes / 1024).toFixed(2).toString() + " KB/s";
  } else {
    return bytes.toFixed(2).toString() + " byte/s";
  }
}
