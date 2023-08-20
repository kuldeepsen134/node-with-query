var router = require('express').Router()

const { useragent } = require('app/v1/admin/controllers')

//User agent routes
module.exports = app => {
  router.post('/user-agents', useragent.create)
  router.get('/user-agents', useragent.findAll)
  router.get('/user-agents/:id', useragent.findOne)
  router.put('/user-agents/:id', useragent.update)
  router.delete('/user-agents/:id', useragent.delete)

  app.use('/v1/admin/', router)
}