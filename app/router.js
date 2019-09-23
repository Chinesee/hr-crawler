'use strict';

module.exports = app => {
  const { router, controller } = app;
  const { main } = controller;

  router.get('/', main.welcome);
  router.post('/login', main.login);
  router.post('/info', main.studentInfo);
  router.post('/schedule', main.schedule);
  router.post('/all-grades', main.allGrades);
  router.post('/current-grade', main.currentGrade);
  router.post('/attendance', main.attendance);
  router.post('/exam-time', main.examTime);
  router.post('/usual-grades', main.usualGrades);
  router.post('/teachers', main.teachers);
};
