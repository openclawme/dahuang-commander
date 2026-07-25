const fs = require('fs');
const glob = require('glob');
const chineseRegex = /[\u4e00-\u9fa5]+/g;

// I'll install glob to do this if needed, but I can also just use native fs and recurse.
