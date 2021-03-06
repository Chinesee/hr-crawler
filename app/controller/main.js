'use strict'

const Controller = require('egg').Controller

class MainController extends Controller {
  welcome() {
    const { ctx } = this
    ctx.body = '欢迎使用，华软爬虫'
  }

  async login() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.login(data)

    ctx.status = 200
    ctx.body = res
  }

  async studentInfo() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getStudentInfo(data)

    ctx.status = 200
    ctx.body = res
  }

  async schedule() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getSchedule(data)

    ctx.status = 200
    ctx.body = res
  }

  async allGrades() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getAllGrades(data)

    ctx.status = 200
    ctx.body = res
  }

  async currentGrade() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getCurrentGrade(data)

    ctx.status = 200
    ctx.body = res
  }

  async attendance() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getAttendance(data)

    ctx.status = 200
    ctx.body = res
  }

  async examTime() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getExamTime(data)

    ctx.status = 200
    ctx.body = res
  }

  async usualGrades() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getUsualGrades(data)

    ctx.status = 200
    ctx.body = res
  }

  async teachers() {
    const { ctx, service } = this

    const data = ctx.request.body
    const res = await service.spider.getTeachers(data)

    ctx.status = 200
    ctx.body = res
  }
}

module.exports = MainController
