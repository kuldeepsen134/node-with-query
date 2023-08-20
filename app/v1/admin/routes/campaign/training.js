var router = require('express').Router()

const { training } = require('app/v1/admin/controllers')

//Campaign routes
module.exports = app => {
  router.get('/assignments/:id/counts', training.count)
  router.get('/assignments/:id/courses', training.getAssignmentCourses)
  router.get('/assignments/:id/email-logs', training.assignmentEmailLog)
  router.post('/assignments', training.create)
  router.post('/assignments/:id/launch', training.createAssignmentEmailLogData)
  router.get('/assignments', training.getAll)
  router.get('/assignments/:id', training.findOne)
  router.put('/assignments/:id', training.update)
  router.delete('/assignments/:id', training.assignmentDelete)

  app.use('/v1/admin/', router)
}