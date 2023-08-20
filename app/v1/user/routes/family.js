var router = require('express').Router()

const { family } = require('app/v1/user/index')

module.exports = app => {
  router.post('/members', family.create)
  router.get('/members', family.findAll)
  router.delete('/members/:id', family.delete)

  app.use('/v1/', router)
}