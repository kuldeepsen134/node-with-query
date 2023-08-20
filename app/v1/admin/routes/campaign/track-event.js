var router = require('express').Router()

const { trackEvent } = require('app/v1/admin/controllers')

//Track event routes
module.exports = app => {
  router.post('/track-events', trackEvent.createTrackEvent)
  router.put('/track-events/:id', trackEvent.update)
  router.get('/track-events/open', trackEvent.getTrackEvent)
  router.get('/pages/:id', trackEvent.getLandingPage)
  router.get('/track-links', trackEvent.trackLinks)

  app.use('/v1/admin/', router)
}