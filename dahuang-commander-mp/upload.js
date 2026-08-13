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
const desc = '1. 修复命令发送窗口（终端底栏、微信输入条）仍是黑色背景的换肤遗漏，全部改为宣纸纸白\n2. 发送按钮加大（56→76rpx 高、加宽、28rpx 字号），激活态由微信绿改为朱砂渐变，与水墨风统一\n3. 清理全部残留：霓虹光晕阴影、白色半透明边框、青/紫渐变、发光 text-shadow 均替换为柔和墨影与墨线\n4. 全站 14/16rpx 超小字号提升至 20rpx 下限，时间戳与徽标更易读\n5. room 页发送按钮同步加大，语义警示色统一为朱砂深红/花青';

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
