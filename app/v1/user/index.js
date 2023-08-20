const auth = require('./auth/auth')
const user = require('./user')
const course = require('./course')
const family = require('./family/family')
const breachData = require('./breach-data')
const newsAndTip = require('./new-tip')

module.exports = {
  auth,
  user,
  course,
  family,
  breachData,
  newsAndTip
}
