var router = require('express').Router()

const { cronJobEmailSend } = require('app/v1/admin/controllers')

//Auth routes
module.exports = (app, ) => {
  router.get('/cron-jobs/send-emails', cronJobEmailSend.cronJobEmailSend)
  router.get('/cron-jobs/shoot-campaigns', cronJobEmailSend.cronJobShootCampaign)
  router.get('/cron-jobs/shoot-assignments', cronJobEmailSend.cronJobShootAssignment)
  router.get('/cron-jobs/send-emails-assginments', cronJobEmailSend.cronJobEmailSentEmailTrainings)
  router.post('/cron-jobs/gophish', cronJobEmailSend.getGophishEvents)

  app.use('/v1', router)
}