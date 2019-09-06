'use strict';

const Service = require('egg').Service;

const cheerio = require('cheerio');
const getUserAgent = require('../util/user-agent');

const BaseUrl = 'http://class.sise.com.cn:7001';
const loginUrl = `${BaseUrl}/sise/login.jsp`;
const loginCheckUrl = `${BaseUrl}/sise/login_check_login.jsp`;
const indexUrl = `${BaseUrl}/sise/module/student_states/student_select_class/main.jsp`;
const scheduleUrl = `${BaseUrl}/sise/module/student_schedular/student_schedular.jsp`;

class SpiderService extends Service {
  async login(data) {
    const { ctx } = this;

    const { username, password } = data;

    let res = await ctx.curl(loginUrl, {
      dataType: 'text',
      headers: {
        'user-agent': getUserAgent(),
        host: 'class.sise.com.cn:7001',
      },
    });

    if (res.status === 200) {
      const $ = cheerio.load(res.data);

      const hiddenName = $('form > input').attr('name');
      const hiddenValue = $('form > input').attr('value');
      const randomValue = $('#random').attr('value');
      const tokenValue = $('#token').attr('value');

      const loginData = {
        [`${hiddenName}`]: hiddenValue,
        random: randomValue,
        token: tokenValue,
        username,
        password,
      };

      res = await ctx.curl(loginCheckUrl, {
        method: 'POST',
        dataType: 'text',
        data: loginData,
      });

      if (res.status === 200) {
        if (res.data.includes('你输入的密码错误')) {
          return { msg: '错误密码', code: 2002 };
        } else if (res.data.includes('系统数据库中找不到你的数据')) {
          return { msg: '无效账号', code: 2003 };
        } else if (res.data.includes('本页面有防刷新功能')) {
          return { msg: '页面防刷新', code: 2004 };
        }
        const cookie = res.headers['set-cookie'];
        res = await ctx.curl(indexUrl, {
          dataType: 'text',
          headers: { cookie },
        });
        if (res.status === 200) {
          return { cookie, data: res.data, code: 1000 };
        }
        return { msg: '请求首页失败', code: 5000 };
      }
      return { msg: '请求登录校验页面失败', code: 5000 };
    }
    return { msg: '请求登录页面失败', code: 5000 };
  }

  async getStudentInfo(data) {
    const { ctx } = this;
    let res = await this.login(data);
    if (res.code === 1000) {
      let $ = cheerio.load(res.data);
      const re = /\/SISEWeb.*(?=')/i;
      const infoUrl = BaseUrl + $('.table1 table:nth-child(1) td').attr('onclick').match(re)[0];

      res = await ctx.curl(infoUrl, {
        dataType: 'text',
        headers: { cookie: res.cookie },
      });

      if (res.status >= 400) {
        return { msg: '查询“个人信息”页面出错', code: 3002 };
      }

      const label = [ '学号', '姓名', '年级', '专业', '身份证', '电子邮箱', '行政班', '班主任', '辅导员' ];
      const value = [];
      const info = [];

      $ = cheerio.load(res.data);
      $('table.table1 table td.td_left').each(function() {
        const text = $(this)
          .text()
          .trim()
          .replace(/[\n\t\r]/g, '');
        if (text.length > 0) {
          value.push(text);
        }
      });
      value.forEach((el, i) => {
        info.push({ label: label[i], value: el });
      });
      info.push({
        label: '绩点',
        value: $('#form1 table:nth-child(11) tr:nth-child(7) td:nth-child(4) font').text(),
      });

      return { data: { info }, code: 1000 };
    }
    return res;
  }

  async getSchedule(data) {
    const { ctx } = this;
    let res = await this.login(data);
    if (res.code === 1000) {
      res = await ctx.curl(scheduleUrl, {
        dataType: 'text',
        headers: { cookie: res.cookie },
      });

      if (res.status >= 400) {
        return { msg: '查询“课程表”页面出错', code: 3002 };
      }

      const $ = cheerio.load(res.data);
      $('form table:nth-child(5) tr:nth-child(1)')
        .nextAll()
        .each(function() {
          const text = $(this).text();
          console.log(text);
        });

      return res;
    }
    return res;
  }
}

module.exports = SpiderService;
