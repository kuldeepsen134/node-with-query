var router = require('express').Router()

const { sendingProfile } = require('app/v1/admin/controllers')

//Sending profile profile routes
module.exports = app => {
  router.post('/sending-profiles/testing', sendingProfile.sendTestEmail)
  router.post('/sending-profiles', sendingProfile.create)
  router.get('/sending-profiles', sendingProfile.findAll)
  router.get('/sending-profiles/:id', sendingProfile.findOne)
  router.put('/sending-profiles/:id', sendingProfile.update)
  router.delete('/sending-profiles/:id', sendingProfile.delete)

  app.use('/v1/admin/', router)
}