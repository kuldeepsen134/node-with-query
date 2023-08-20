const express = require('express')
const app = express()
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
var bodyParser = require('body-parser');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV}` })

app.use(helmet())
app.use(express.json())
app.use(bodyParser.urlencoded({ extended: false }));

app.use(express.static('./app/uploads'));

var corsOptionsDelegate = function (req, callback) {
  callback(null, {
    origin: true
  })
}

// var allowlist = process.env.ALLOW_LIST
// var corsOptionsDelegate = function (req, callback) {
//   callback(null, {
//     origin: process.env.ENVIRONMENT === 'development' ? true :
//       allowlist.includes(req.header('Origin')) ? true : false
//   })
// }

app.use(cors(corsOptionsDelegate))

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
})

app.use('/v1/*', apiLimiter)

require('app/v1/admin/routes')(app)
require('app/v1/user/routes')(app)

app.get('*', function (req, res) {
  res.status(404).send({ message: 'Oops, looks like there is no route on the website. Thanks', error: true })
})

const port = process.env.PORT || 4005

app.listen(port, () => {
  console.log(`Server is running on port ${port}.`)
})
