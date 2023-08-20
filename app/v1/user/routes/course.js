var router = require('express').Router()

const { course } = require('app/v1/user/index')

module.exports = app => {
  router.get('/assignments/:assignment_id/courses/:id/initiate', course.findVedio)
  router.get('/assignments', course.findTrainingCourse)
  router.get('/assignments/:assignment_id/courses/:id', course.findOne)
  router.get('/assignments/:assignment_id/courses/:id/questions', course.getCourseQuestions)
  router.post('/assignments/:assignment_id/courses/:id/submission', course.createCourseResult)
  router.get('/assignments/:assignment_id/courses/:id/results', course.getCourseResult)
  router.get('/assignments/:assignment_id/courses/:id/review-answers', course.getCourseQuestionsReview)

  app.use('/v1', router)
}