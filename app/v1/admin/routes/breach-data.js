var router = require('express').Router()

const { breachData } = require('app/v1/admin/controllers')

//Auth routes
module.exports = (app,) => {
  router.get('/breaches/sources', breachData.getBreachesDataBase)
  router.get('/breaches/sync', breachData.getBreachData)
  router.get('/breaches/history', breachData.getBreachDataHistory)
  router.get('/breaches', breachData.getBreachesSuperAdmin)
  router.get('/breaches-by-source', breachData.getBreachesBySource)
  router.get('/breaches-by-email', breachData.getBreachesByEmail)
  router.get('/breaches/export', breachData.breachExport)
  router.get('/breaches/stats', breachData.getBreachesStats)
  router.get('/breaches/stats-superadmin', breachData.getBreachesStatsSuperAdmin)
  router.get('/breaches/:email_id', breachData.getBreachDataEmail)
  router.put('/breaches/:id', breachData.updateBreachData)
  router.delete('/breaches/:id', breachData.deleteBreachData)

  app.use('/v1/admin', router)
}