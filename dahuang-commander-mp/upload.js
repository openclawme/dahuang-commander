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
const desc = '1. 全站界面全面对齐 Web 端宣纸水墨朱砂风：暗色赛博风（黑底青紫霓虹）整体换肤为宣纸米底 + 墨字 + 朱砂红 + 花青\n2. 导航栏与底部 TabBar 同步水墨配色\n3. 聊天气泡正文移除等宽字体并加大字号，时间戳与任务标签同步放大，提升可读性\n4. Agent 生成的 HTML 卡片（rich-text）适配浅色纸底，解决此前灰蓝色文字对比度不足看不清的问题\n5. 修正 299 处 rgba 颜色语法，清理全部霓虹渐变残留';

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
