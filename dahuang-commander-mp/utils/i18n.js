const en = require('./en.js');
const zh = require('./zh.js');

let currentLang = 'zh';

const initLanguage = () => {
  // 统一中文：新页面大量文案尚未进字典，跟随系统切英文会出现"半汉半英"，
  // 比中文界面更糟。这里只保留显式缓存（未来若有语言设置项可直接生效）。
  const cachedLang = wx.getStorageSync('dahuang_lang');
  currentLang = cachedLang || 'zh';
};

const updateTabBar = () => {
  const dict = getDict();
  if (dict && dict.tabbar) {
    wx.setTabBarItem({ index: 0, text: dict.tabbar.index }).catch(() => {});
    wx.setTabBarItem({ index: 1, text: dict.tabbar.chat }).catch(() => {});
    wx.setTabBarItem({ index: 2, text: dict.tabbar.dahuang }).catch(() => {});
    wx.setTabBarItem({ index: 3, text: dict.tabbar.settings }).catch(() => {});
  }
};

const getDict = () => {
  return currentLang === 'en' ? en : zh;
};

const setLang = (lang) => {
  currentLang = lang;
  wx.setStorageSync('dahuang_lang', lang);
};

const getLang = () => {
  return currentLang;
};

module.exports = {
  initLanguage,
  updateTabBar,
  getDict,
  setLang,
  getLang
};
