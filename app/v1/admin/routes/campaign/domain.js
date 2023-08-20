var router = require('express').Router()

const { domain } = require('app/v1/admin/controllers')

//Domain routes
module.exports = app => {
  router.post('/domains', domain.create)
  router.get('/domains', domain.findAll)
  router.get('/domains/:id', domain.findOne)
  router.put('/domains/:id', domain.update)
  router.delete('/domains/:id', domain.delete)

  app.use('/v1/admin/', router)
}