'use strict'

module.exports = appInfo => {
  const config = exports = {}

  // use for cookie sign key, should change to your own and keep security
  config.keys = appInfo.name + '_1567352871417_897'

  // add your middleware config here
  config.middleware = []

  // 关闭安全威胁csrf防范
  config.security = {
    csrf: {
      enable: false,
    },
  }

  // add your user config here
  const userConfig = {
    // myAppName: 'egg',
  }

  return {
    ...config,
    ...userConfig,
  }
}
