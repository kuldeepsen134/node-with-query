var router = require('express').Router()

const { ip } = require('app/v1/admin/controllers')

//IP routes
module.exports = app => {
  router.post('/ip-filters', ip.create)
  router.get('/ip-filters', ip.findAll)
  router.get('/ip-filters/:id', ip.findOne)
  router.put('/ip-filters/:id', ip.update)
  router.delete('/ip-filters/:id', ip.delete)

  app.use('/v1/admin/', router)
}