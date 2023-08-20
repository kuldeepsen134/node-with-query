var router = require('express').Router()

const { darkWeb } = require('app/v1/admin/controllers')

module.exports = app => {
  router.post('/dark-web', darkWeb.create)
  router.get('/dark-web', darkWeb.findAll)
  router.delete('/dark-web/:id', darkWeb.delete)

  app.use('/v1/admin', router)
}