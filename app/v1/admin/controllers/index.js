const auth = require('./auth/auth')
const user = require('./user/user')
const course = require('./campaign/course')
const company = require('./company/company')
const campaign = require('./campaign/campaign')
const emailTemplate = require('./build-simulations/template')
const Industry = require('./company/industry')
const trackEvent = require('./track-event')
const category = require('./category/category')
const sendingProfile = require('./build-simulations/sending-profile')
const tag = require('./tag/tag')
const media = require('./media')
const group = require('./group/group')
const landingPage = require('./campaign/landing-page')
const useragent = require('./settings/user-agent')
const ip = require('./settings/ip')
const domain = require('./campaign/domain')
const report = require('./report')
const cronJobEmailSend = require('./cron-job')
const training = require('./campaign/training-assignment')
const breachData = require('./breach-data')
const NewsAndTip = require('./news-tip/news-tip')
const darkWeb = require('./breach/dark-web')

module.exports = {
  auth,
  user,
  course,
  company,
  campaign,
  emailTemplate,
  Industry,
  trackEvent,
  category,
  sendingProfile,
  tag,
  media,
  group,
  landingPage,
  useragent,
  ip,
  domain,
  report,
  cronJobEmailSend,
  training,
  breachData,
  NewsAndTip,
  darkWeb
}