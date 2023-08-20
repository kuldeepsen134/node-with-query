var router = require('express').Router()

const { course } = require('app/v1/admin/controllers')

//Course routes
module.exports = app => {
  router.post('/courses', course.create)
  router.get('/courses', course.findAll)
  router.get('/courses/:id', course.findOne)
  router.put('/courses/:id', course.update)
  router.delete('/courses/:id', course.delete)
  router.post('/courses/:id/questions', course.createCourseQuestion)
  router.get('/courses/:id/questions', course.getCourseQuestions)
  router.post('/courses/:id/submission', course.createCourseResult)
  router.get('/courses/:id/results', course.getCourseResult)
  router.post('/courses/assign', course.assignCourseUser)
  router.post('/news', course.createNews)

  app.use('/v1/admin/', router)
}