var router = require('express').Router()

const { campaign } = require('app/v1/admin/controllers')

//Campaign routes
module.exports = app => {
  router.get('/logs', campaign.getAllEmailLogs)
  router.get('/campaigns/:id/overview', campaign.botVsReal)
  router.get('/campaigns/:id/user-agents', campaign.getBrowserStats)
  router.get('/campaigns/:id/counts', campaign.getCampaignEventsCount)
  router.get('/campaigns/:id/events-summary', campaign.getCampaignEventsSummary)
  router.get('/campaigns/:id/email-logs', campaign.getEmailLog)
  router.post('/campaigns', campaign.create)
  router.get('/campaigns', campaign.findAll)
  router.get('/campaigns/:id', campaign.findOne)
  router.put('/campaigns/:id', campaign.update)
  router.post('/campaigns/:id/modify', campaign.campaignModify)
  router.get('/campaigns/:id/top-ips', campaign.topIPCampaign)
  router.post('/campaigns/:id/launch', campaign.createCampaignEmailLogData)
  router.post('/campaigns/:id/gophish/launch', campaign.createCampaignGophish)
  router.post('/campaigns/:id/gophish/sync', campaign.campaignSyncGophish)
  router.post('/campaigns/gophish-test', campaign.testGophishApi)
  router.put('/campaigns/:id/gophish/launch', campaign.finalCampaignGophishLauch)
  router.delete('/campaigns/:id', campaign.campaignDelete)
  router.get('/track-events', campaign.getAllEvents)

  app.use('/v1/admin/', router)
}