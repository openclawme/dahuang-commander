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
const desc = '登录归一化：删除独立登录页，仙册点化改名「分身登录」成为唯一登录入口；本地最近登录直接点选，搜索框支持名字/DID模糊搜索；退出后留在设置页即可重新登录';

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
