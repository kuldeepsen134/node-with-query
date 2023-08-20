var router = require('express').Router()

const { NewsAndTip } = require('app/v1/admin/controllers')

//Auth routes
module.exports = (app, ) => {
  router.post('/news-tips', NewsAndTip.create)
  router.get('/news-tips', NewsAndTip.findAll)
  router.get('/news-tips/:id', NewsAndTip.findOne)
  router.put('/news-tips/:id', NewsAndTip.update)
  router.delete('/news-tips/:id', NewsAndTip.delete)

  app.use('/v1/admin', router)
}