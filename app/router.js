'use strict';

module.exports = app => {
  const { router, controller } = app;
  const { main } = controller;

  router.post('/login', main.login);
  router.post('/info', main.studentInfo);
  router.post('/schedule', main.schedule);
  router.post('/all-grades', main.allGrades);
  router.post('/current-grade', main.currentGrade);
  router.post('/usual-grades', main.usualGrades);
  router.post('/attendance', main.attendance);
  router.get('/', main.usualGrades);
};
