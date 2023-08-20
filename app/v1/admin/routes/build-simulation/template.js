var router = require('express').Router()

const { emailTemplate } = require('app/v1/admin/controllers')

//Email template routes
module.exports = app => {
  router.post('/email-templates', emailTemplate.create)
  router.get('/email-templates', emailTemplate.findAll)
  router.get('/email-templates/:id', emailTemplate.findOne)
  router.put('/email-templates/:id', emailTemplate.update)
  router.delete('/email-templates/:id', emailTemplate.delete)

  app.use('/v1/admin/', router)
}