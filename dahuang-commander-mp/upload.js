const ci = require('miniprogram-ci');
const path = require('path');

const APPID = 'wx6ac4406ed64d11ed';

const project = new ci.Project({
  appid: APPID,
  type: 'miniProgram',
  projectPath: __dirname,
  privateKeyPath: path.join(__dirname, `private.${APPID}.key`),
  ignores: ['node_modules/**/*', '.git/**/*', 'package.json', 'package-lock.json', 'upload.js'],
});

const pkg = require('./package.json');
const version = pkg.version || '1.9.2';
const desc = '1. 聊天页横向空间优化：HTML 卡片/表格气泡放宽至 96% 屏宽（原 85%），表格可用宽度约 +29%\n2. 聊天面板与滚动区左右留白收紧（24→12rpx、20→10rpx），气泡内边距同步收窄\n3. 普通文字气泡保持原比例与左右错落布局不变，仅富内容卡片受益';

async function run() {
  console.log('⚡ 正在对「我是分身」微信小程序进行天道编译与打包...');
  const uploadResult = await ci.upload({
    project,
    version: version,
    desc: desc,
    setting: {
      es6: true,
      minify: true,
      autoPrefixWXSS: true,
    },
    onProgressUpdate: (msg) => {
      if (msg && msg.status) {
        console.log(`[编译进度] ${msg.status}: ${msg.message || ''}`);
      } else {
        console.log(msg);
      }
    },
  });

  console.log('\n🎉 叩求天道功成！「我是分身」已成功飞升并安全上传至微信后台开发版本！');
  console.log('==================================================');
  console.log('您现在可以前往微信的「小程序助手」或「微信公众平台」后台，查看并扫码体验开发版！');
}

run().catch(err => {
  console.error('\n❌ 天道降下雷劫（上传失败）！具体错误反馈如下：');
  console.error('--------------------------------------------------');
  console.error(err.message || err);
  console.error('--------------------------------------------------');
  console.error('📌 建议对策：请检查您在微信公众平台后台是否开启了「上传密钥」，并且是否把当前主机的公网IP加入了「IP白名单」中。');
  process.exit(1);
});
