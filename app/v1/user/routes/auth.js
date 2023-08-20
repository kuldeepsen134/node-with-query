var router = require('express').Router()

const { auth } = require('app/v1/user/index')

module.exports = app => {
  router.post('/login', auth.login)
  router.post('/verify', auth.verify)

  app.use('/v1/', router)
}