var router = require('express').Router()

const { landingPage } = require('app/v1/admin/controllers')

//Landing page routes
module.exports = app => {
  router.post('/landing-pages', landingPage.create)
  router.get('/landing-pages', landingPage.findAll)
  router.get('/landing-pages/:id', landingPage.findOne)
  router.put('/landing-pages/:id', landingPage.update)
  router.delete('/landing-pages/:id', landingPage.delete)

  app.use('/v1/admin/', router)
}