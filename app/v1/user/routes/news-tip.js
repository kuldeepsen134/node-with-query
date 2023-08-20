var router = require('express').Router()

const { newsAndTip } = require('app/v1/user/index')

module.exports = app => {
  router.get('/news-tips', newsAndTip.findAll)

  app.use('/v1', router)
}