'use strict';

const Controller = require('egg').Controller;
const cheerio = require('cheerio');
const getUserAgent = require('../util/user-agent');

const BaseUrl = 'http://class.sise.com.cn:7001/sise';
const loginUrl = `${BaseUrl}/login.jsp`;
const loginCheckUrl = `${BaseUrl}/login_check_login.jsp`;
const indexUrl = `${BaseUrl}/module/student_states/student_select_class/main.jsp`;

class SpiderController extends Controller {
  async index() {
    const { ctx } = this;
    let res = await ctx.curl(loginUrl, {
      dataType: 'text',
      headers: {
        'user-agent': getUserAgent(),
        host: 'class.sise.com.cn:7001',
      },
    });
    const $ = cheerio.load(res.data);
    console.log(res);

    const hiddenName = $('form > input').attr('name');
    const hiddenValue = $('form > input').attr('value');
    const randomValue = $('#random').attr('value');
    const tokenValue = $('#token').attr('value');
    const loginData = {
      [`${hiddenName}`]: hiddenValue,
      random: randomValue,
      token: tokenValue,
      username: '1640129331',
      password: 'qq00004',
    };
    res = await ctx.curl(loginCheckUrl, {
      method: 'POST',
      dataType: 'text',
      data: loginData,
    });
    const result = await ctx.curl(indexUrl, {
      dataType: 'text',
      headers: {
        cookie: res.headers['set-cookie'],
      },
    });
    console.log(result.data);

    ctx.status = 200;
    ctx.body = 'res.data';
  }
}

module.exports = SpiderController;
