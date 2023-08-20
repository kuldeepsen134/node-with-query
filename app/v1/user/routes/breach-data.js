var router = require('express').Router()

const { breachData } = require('app/v1/user/index')

//Auth routes
module.exports = (app, ) => {
  router.get('/breaches/stats', breachData.getBreachesStats)
  router.get('/breaches', breachData.getBreachData)
  router.get('/breaches/:email_id', breachData.getBreachDataEmail)

  app.use('/v1', router)
}