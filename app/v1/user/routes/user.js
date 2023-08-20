var router = require('express').Router()

const { user } = require('app/v1/user/index')

module.exports = app => {
  router.put('/profile', user.profile)
  router.get('/me', user.me)

  app.use('/v1/', router)
}