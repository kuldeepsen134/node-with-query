var router = require('express').Router()

const { report } = require('app/v1/admin/controllers')

//Campaign routes
module.exports = app => {
  router.get('/reports/campaigns', report.getCampaignsAverage)
  router.get('/reports/stats', report.getCompanyStats)
  router.get('/reports/events', report.getAllEvents)

  app.use('/v1/admin/', router)
}