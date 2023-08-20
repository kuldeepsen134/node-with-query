module.exports = (app) => {
  /**
  * Public routes
  */
  // Auth flow
  require('app/v1/user/routes/auth')(app)
  require('app/v1/public-routes')(app)

  app.use('/v1', require('app/middleware/middleware-user'));
  //User
  require('app/v1/user/routes/user')(app)
  require('app/v1/user/routes/course')(app)
  require('app/v1/user/routes/family')(app)
  require('app/v1/user/routes/breach-data')(app)
  require('app/v1/user/routes/news-tip')(app)
};