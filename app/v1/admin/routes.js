module.exports = (app) => {
    /**
   * Public routes
   */
  // Auth flow
  require('app/v1/admin/routes/auth')(app)
  require('app/v1/admin/routes/campaign/track-event')(app)
  
  // Media
  require('app/v1/admin/controllers/media')(app)

  app.use('/v1/admin', require('app/middleware/middleware-admin'))


  // Clients flow
  require('app/v1/admin/routes/company/company')(app)
  require('app/v1/admin/routes/user/user')(app)
  require('app/v1/admin/routes/company/industry')(app)

  //campaign
  require('app/v1/admin/routes/campaign/campaign')(app)
  require('app/v1/admin/routes/campaign/course')(app)
  require('app/v1/admin/routes/campaign/landing-page')(app)
  require('app/v1/admin/routes/campaign/ip')(app)
  require('app/v1/admin/routes/campaign/user-agent')(app)
  require('app/v1/admin/routes/campaign/training')(app)

  //Report
  require('app/v1/admin/routes/report')(app)

  //email-template
  require('app/v1/admin/routes/build-simulation/template')(app)
  require('app/v1/admin/routes/build-simulation/sending-profile')(app)

  //group
  require('app/v1/admin/routes/group/category')(app)
  require('app/v1/admin/routes/group/tag')(app)
  require('app/v1/admin/routes/group/group')(app)

  //Domain
  require('app/v1/admin/routes/campaign/domain')(app)

  //Breach data
  require('app/v1/admin/routes/breach-data')(app)

  //News and tip
  require('app/v1/admin/routes/news-tip')(app)

  //Dark web
  require('app/v1/admin/routes/dark-web')(app)
};