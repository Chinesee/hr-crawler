'use strict';

module.exports = app => {
  const { router, controller } = app;
  const { main } = controller;

  router.post('/login', main.login);
  router.get('/info', main.studentInfo);
};
