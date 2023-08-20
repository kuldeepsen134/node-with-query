var router = require('express').Router()

const { group } = require('app/v1/admin/controllers')

//Group routes
module.exports = app => {
  router.get('/groups/:id/users', group.groupUsers)
  router.post('/groups', group.create)
  router.get('/groups', group.findAll)
  router.get('/groups/:id', group.findOne)
  router.put('/groups/:id', group.update)
  router.delete('/groups/:id/users', group.userRemoveGroup)
  router.delete('/groups/:id', group.delete)
  router.post('/groups/:id/users', group.userAddGroup)

  app.use('/v1/admin/', router)
}