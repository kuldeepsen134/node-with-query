var router = require('express').Router()

const { company } = require('app/v1/admin/controllers')

//Company routes
module.exports = app => {
  router.post('/companies/:company_id/admins', company.addAdmin)
  router.get('/companies/:company_id/admins', company.admins)
  router.post('/companies', company.create)
  router.get('/companies', company.findAll)
  router.get('/companies/:id', company.findOne)
  router.put('/companies/:id', company.update)
  router.delete('/companies/:company_id/admins', company.removeAdmin)
  router.delete('/companies/:id', company.delete)
  router.get('/companies/:id/statics', company.countAll)

  app.use('/v1/admin/', router)
}