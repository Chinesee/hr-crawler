'use strict';

const Service = require('egg').Service;

const cheerio = require('cheerio');
const getUserAgent = require('../util/user-agent');

const BaseUrl = 'http://class.sise.com.cn:7001';
const loginUrl = `${BaseUrl}/sise/login.jsp`;
const loginCheckUrl = `${BaseUrl}/sise/login_check_login.jsp`;
const indexUrl = `${BaseUrl}/sise/module/student_states/student_select_class/main.jsp`;
const scheduleUrl = `${BaseUrl}/sise/module/student_schedular/student_schedular.jsp?schoolyear=2018&semester=1`;
const usualGradesUrl = `${BaseUrl}/sise/module/commonresult/index.jsp`;

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
      const random = $('#random').attr('value');
      const token = $('#token').attr('value');

      const loginData = {
        [`${hiddenName}`]: hiddenValue,
        random,
        token,
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

      // 预编译正则表达式
      const regName = /.*(?=\()/; // 课程名称
      const regCode = /(?<=\().*?(?=\s)/; // 课程代码
      const regAddr = /(?<=\[).*?(?=\])/; // 课程地点
      const regWeek = /(?<=\().*(?=\))/; // 课程周数

      const courses = []; // 存放所有课表信息的地方

      const $ = cheerio.load(res.data);
      $('form table:nth-child(5) tr:nth-child(1)')
        .nextAll()
        .each(function(i, el) {
          const _ = cheerio.load(el);

          const courseList = [];
          for (let i = 2; i <= 6; i += 1) {
            const v = _(`td:nth-child(${i})`).text().trim();
            if (v.length > 0) { // 如果课程不为空
              const courseArray = v.split(', '); // 长度为1代表该格子只有1节课，2为两节课
              if (courseArray.length === 1) {
                const classOne = courseArray[0];
                const courseName = classOne.match(regName)[0];
                const courseCode = classOne.match(regCode)[0];
                const courseAddr = classOne.match(regAddr)[0];
                const weekArray = classOne.match(regWeek)[0].split(' ');
                const courseTeacher = weekArray[1];
                let weeks = weekArray.slice(2, -1);
                weeks.push(weeks.pop().replace('周', '')); // 将 “周” 字去除
                weeks = weeks.map(Number);

                courseList.push({
                  course: [{
                    name: courseName,
                    code: courseCode,
                    addr: courseAddr,
                    teacher: courseTeacher,
                    weeks,
                  }],
                });
              } else if (courseArray.length === 2) {
                const courseOne = courseArray[0];
                const courseTwo = courseArray[1];

                const courseName = courseOne.match(regName)[0];
                const courseCode = courseOne.match(regCode)[0];
                const courseAddr = courseOne.match(regAddr)[0];
                const weekArray = courseOne.match(regWeek)[0].split(' ');
                const courseTeacher = weekArray[1];
                let weeks = weekArray.slice(2, -1);
                weeks.push(weeks.pop().replace('周', ''));
                weeks = weeks.map(Number);

                const courseName2 = courseTwo.match(regName)[0];
                const courseCode2 = courseTwo.match(regCode)[0];
                const courseAddr2 = courseTwo.match(regAddr)[0];
                const weekArray2 = courseTwo.match(regWeek)[0].split(' ');
                const courseTeacher2 = weekArray[1];
                let weeks2 = weekArray2.slice(2, -1);
                weeks2.push(weeks2.pop().replace('周', ''));
                weeks2 = weeks2.map(Number);

                courseList.push({
                  course: [{
                    name: courseName,
                    code: courseCode,
                    addr: courseAddr,
                    teacher: courseTeacher,
                    weeks,
                  }, {
                    name: courseName2,
                    code: courseCode2,
                    addr: courseAddr2,
                    teacher: courseTeacher2,
                    weeks: weeks2,
                  }],
                });
              }
            } else {
              courseList.push({ course: [] });
            }
          }
          courses.push(courseList);
        });
      return { data: { courses }, code: 1000 };
    }
    return res;
  }

  async getAllGrades(data) {
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

      const semester = [];
      const courses = [];
      const course = [];

      $ = cheerio.load(res.data);

      // 必修成绩
      $('#form1 > .table:nth-child(6) > tbody tr')
        .each(function(i, el) {
          const _ = cheerio.load(el);
          const code = _('td:nth-child(2)').text();
          const name = _('td:nth-child(3)').text();
          const credit = _('td:nth-child(4)').text();
          const method = _('td:nth-child(5)').text();
          const term = _('td:nth-child(8)').text();
          const score = _('td:nth-child(9)').text();

          semester.push(_('td:nth-child(1)').text().trim());
          course.push({
            type: 1,
            code,
            name,
            credit,
            method,
            term,
            score,
          });
        });

      const num = []; // 每个学期的课程数
      let count = 1;
      for (let i = 0; i < semester.length; i += 1) {
        if (semester[i].length === 0) {
          count += 1;
          continue;
        }
        num.push(count);
        count = 1;
      }
      num.push(count);
      num.shift();

      num.reduce((acc, curr) => {
        courses.push(course.slice(acc, acc + curr));
        return acc + curr;
      }, 0);

      // 选修成绩
      const electiveCourses = [];
      $('#form1 > .table:nth-child(10) > tbody tr')
        .each(function(i, el) {
          const _ = cheerio.load(el);
          const code = _('td:nth-child(1)').text();
          const name = _('td:nth-child(2)').text();
          const credit = _('td:nth-child(3)').text();
          const method = _('td:nth-child(5)').text();
          const term = _('td:nth-child(7)').text();
          const score = _('td:nth-child(8)').text();

          electiveCourses.push({
            type: 2,
            code,
            name,
            credit,
            method,
            term,
            score,
          });
        });
      courses.push(electiveCourses);

      return { data: { courses }, code: 1000 };
    }
    return res;
  }

  async getCurrentGrade(data) {
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

      const courses = [];

      $ = cheerio.load(res.data);

      // 必修成绩
      $('#form1 > .table:nth-child(6) > tbody tr')
        .each(function(i, el) {
          const _ = cheerio.load(el);
          const term = _('td:nth-child(8)').text().trim();

          if (term === data.current_term) {
            const code = _('td:nth-child(2)').text();
            const name = _('td:nth-child(3)').text();
            const credit = _('td:nth-child(4)').text();
            const method = _('td:nth-child(5)').text();
            const score = _('td:nth-child(9)').text();

            courses.push({
              type: 1,
              code,
              name,
              credit,
              method,
              term,
              score,
            });
          }
        });

      $('#form1 > .table:nth-child(10) > tbody tr')
        .each(function(i, el) {
          const _ = cheerio.load(el);
          const term = _('td:nth-child(7)').text().trim();

          if (term === data.current_term) {
            const code = _('td:nth-child(1)').text();
            const name = _('td:nth-child(2)').text();
            const credit = _('td:nth-child(3)').text();
            const method = _('td:nth-child(5)').text();
            const score = _('td:nth-child(8)').text();

            courses.push({
              type: 2,
              code,
              name,
              credit,
              method,
              term,
              score,
            });
          }
        });

      return { data: { courses }, code: 1000 };
    }
    return res;
  }

  async getUsualGrades(data) {
    const { ctx } = this;
    let res = await this.login(data);
    const cookie = res.cookie;

    if (res.code === 1000) {
      res = await ctx.curl(usualGradesUrl, {
        dataType: 'text',
        headers: { cookie },
      });

      if (res.status >= 400) {
        return { msg: '查询“平时成绩”页面出错', code: 3002 };
      }

      const names = []; // 课程名称列表
      const links = []; // 链接列表
      const usualGrades = []; // 最终结果数据存放处

      let $ = cheerio.load(res.data);
      $('table.table1 tr:nth-child(1)')
        .nextAll()
        .each(function(i, el) {
          const _ = cheerio.load(el);
          const item = _('a');
          names.push(item.text().trim());
          links.push(item.attr('href'));
        });

      const base = 'http://class.sise.com.cn:7001/sise/module/commonresult/';

      // 并行执行异步爬虫
      const promises = links.map(async (link, i) => {
        const url = `${base}${link}`;

        res = await ctx.curl(url, {
          dataType: 'text',
          headers: { cookie },
        });

        const rows = [];
        let total = '';
        const keys = [ 'label', 'percentage', 'most', 'score' ];
        $ = cheerio.load(res.data);
        $('table:nth-child(2) table tr:nth-child(1)')
          .nextAll()
          .each(function(i, el) {
            const row = {};
            const _ = cheerio.load(el);
            const spans = _('td').find('span');
            if (spans.length > 0) {
              spans.each(function(i) {
                row[keys[i]] = _(this).text().trim();
              });
              rows.push(row);
            }
          });

        // 总平时成绩
        $('p table table tr')
          .each(function(i, el) {
            const row = {};
            const _ = cheerio.load(el);
            const spans = _('td').find('span');
            if (spans.length > 0) {
              spans.each(function(i) {
                row[keys[i]] = _(this).text().trim();
              });
              total = row.score;
              rows.push(row);
            }
            console.log(rows);
          });
        if (rows.length > 0) {
          usualGrades.push({
            name: names[i],
            items: rows,
            total,
          });
        }
      });
      await Promise.all(promises);

      return { data: { usual_grades: usualGrades }, code: 1000 };
    }
    return res;
  }

  async getAttendance(data) {
    const { ctx } = this;
    let res = await this.login(data);

    const result = [];
    if (res.code === 1000) {
      let $ = cheerio.load(res.data);
      const re = /\/SISEWeb.*(?=')/i;
      const attendanceUrl = BaseUrl + $('table.table1 tr:nth-child(1) > td:nth-child(4) td').attr('onclick').match(re)[0];

      res = await ctx.curl(attendanceUrl, {
        dataType: 'text',
        headers: { cookie: res.cookie },
      });

      if (res.status >= 400) {
        return { msg: '查询“考勤信息”页面出错', code: 3002 };
      }

      $ = cheerio.load(res.data);
      $('#table1 tbody tr').each(function(i, el) {
        const _ = cheerio.load(el);
        const label = _('td:nth-child(2)').text();
        const value = _('td:nth-child(3)').text().trim() || '全勤'; result.push({ label, value });
      });
      return result;
    }
    return res;
  }
}

module.exports = SpiderService;
