var router = require('express').Router()

const { tag } = require('app/v1/admin/controllers')

//Tag routes
module.exports = app => {
  router.post('/tags', tag.create)
  router.get('/tags', tag.findAll)
  router.get('/tags/:id', tag.findOne)
  router.put('/tags/:id', tag.update)
  router.delete('/tags/:id', tag.delete)

  app.use('/v1/admin/', router)
}