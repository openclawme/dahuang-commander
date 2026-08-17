const en = require('./en.js');
const zh = require('./zh.js');

let currentLang = 'zh';

const initLanguage = () => {
  const cachedLang = wx.getStorageSync('dahuang_lang');
  if (cachedLang) {
    currentLang = cachedLang;
  } else {
    try {
      const appInfo = wx.getAppBaseInfo();
      if (appInfo.language && appInfo.language.indexOf('en') === 0) {
        currentLang = 'en';
      } else {
        currentLang = 'zh';
      }
    } catch (e) {
      currentLang = 'zh';
    }
  }
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
