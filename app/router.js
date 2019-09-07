'use strict';

module.exports = app => {
  const { router, controller } = app;
  const { main } = controller;

  router.post('/login', main.login);
  router.post('/info', main.studentInfo);
  router.post('/schedule', main.schedule);
  router.post('/all-grades', main.allGrades);
};
