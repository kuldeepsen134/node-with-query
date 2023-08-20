const nodemailer = require('nodemailer')
const hbs = require('nodemailer-express-handlebars')
const path = require('path')

//Mail transporter
const transporter = nodemailer.createTransport({
  host: `${process.env.EMAIL_HOST}`,
  port: `${process.env.EMAIL_PORT}`,
  auth: {
    user: `${process.env.EMAIL_USER}`,
    pass: `${process.env.EMAIL_PASSWORD}`
  }
})

const viewPath = path.resolve(__dirname, '../templates/views/')
const partialsPath = path.resolve(__dirname, '../templates/partials')
transporter.use('compile', hbs({
  viewEngine: {
    extName: '.handlebars',
    layoutsDir: viewPath,
    defaultLayout: false,
    partialsDir: partialsPath,
  },
  viewPath: viewPath,
  extName: '.handlebars',
}))

module.exports = {
  transporter
}