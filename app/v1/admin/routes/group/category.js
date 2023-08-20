var router = require('express').Router()

const { category } = require('app/v1/admin/controllers')

//Category routes
module.exports = app => {
  router.post('/categories', category.create)
  router.get('/categories', category.findAll)
  router.get('/categories/:id', category.findOne)
  router.put('/categories/:id', category.update)
  router.delete('/categories/:id', category.delete)

  app.use('/v1/admin/', router)
}