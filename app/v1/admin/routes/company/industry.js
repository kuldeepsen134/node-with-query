var router = require('express').Router()

const { Industry } = require('app/v1/admin/controllers')

//Industry routes
module.exports = app => {
  router.post('/industries', Industry.create)
  router.get('/industries', Industry.findAll)
  router.get('/industries/:id', Industry.findOne)
  router.put('/industries/:id', Industry.update)
  router.delete('/industries/:id', Industry.delete)

  app.use('/v1/admin/', router)
}