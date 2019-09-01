'use strict';

const Controller = require('egg').Controller;
const cheerio = require('cheerio');

class HomeController extends Controller {
  async index() {
    const { ctx } = this;
    const res = await ctx.curl('http://class.sise.com.cn:7001/sise/', {
      dataType: 'json',
    });
    const $ = cheerio.load(res.data);
    console.log($('#token').text());

    ctx.status = 200;
    ctx.body = 'res.data';
  }
}

module.exports = HomeController;
