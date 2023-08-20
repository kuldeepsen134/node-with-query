var router = require('express').Router()

const { user } = require('app/v1/admin/controllers')

//Auth routes
module.exports = app => {
  router.post('/users', user.create)
  router.get('/users', user.findAll)
  router.get('/users/:id', user.findOne)
  router.put('/users/:id', user.update)
  router.delete('/users/:id', user.delete)
  router.put('/profile', user.profile)
  router.post('/users/import', user.importCSV)

  router.get('/me', user.me)

  app.use('/v1/admin/', router)
}