const express = require('express')

module.exports = (app) => {
  app.use('/static', express.static('./app/uploads'))

  require('app/v1/admin/routes/campaign/track-event')(app)
  require('app/v1/admin/routes/cron-job')(app)
};