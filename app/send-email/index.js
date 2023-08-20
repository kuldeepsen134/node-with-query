const { transporter, bulkTransporter } = require('./config/mail-transporter')
const nodemailer = require('nodemailer')

//Send all email
exports.sendEmail = async (params) => {
  const data = {
    from: `${process.env.EMAIL_FROM}`,
    to: `${params.email}`,
    subject: `${params.subject} - PhishSentinel`,
    template: `${params.fileName}`,
    message: `${params.message}`,
    context: {
      otp: `${params.otp}`,
      email: `${params.email}`,
      first_name: `${params.first_name ? params.first_name : ''}`
    }
  }
  transporter.sendMail(data, (error, info) => {
    if (error) {
      params.res.status(error.responseCode).send(error)
      return
    }
  })
}

//Send bulk email
exports.bulkEmail = async (params) => {
  var args = {
    host: `${params.host}`,
    secure: false,
    port: params.port,
    auth: {
      user: params.user,
      pass: params.pass
    },
    tls: {
      rejectUnauthorized: false
    }
  }

  /**
   * https://github.com/nodemailer/nodemailer/issues/527
   * https://stackoverflow.com/questions/58814876/forcing-nodemailer-to-only-do-tls-1-2-with-recommended-ciphers
   * https://stackoverflow.com/questions/59060658/set-up-nodemailer-to-secure-email-with-a-startls-handshake
   * https://stackoverflow.com/questions/54479188/nodemailer-problems-with-tls-certificate-smtp
   */

  //   if (params.encryption === 'starttls') {
  //     args.tls = {
  //       rejectUnauthorized: false
  //     }
  //   }

  //   if (params.encryption === 'ssl/tls') {
  //     args.secure = true
  //   }
  const data = {
    from: `${params.from}`,
    to: `${params.email}`,
    replyTo: `${params.reply}`,
    subject: `${params.subject}`,
    html: `${params.email_content}`
    // headers: params.headers
  };

  return new Promise((resolve, reject) => {
    const transporter = nodemailer.createTransport(args)

    transporter.sendMail(data, function (error, info) {
      if (error) {
        resolve(error)
      }
      else {
        resolve(info)
      }
    })
  })

  // const bulkTransporter = nodemailer.createTransport(args);

  // bulkTransporter.sendMail(data, (error, info) => {
  //   if(error){
  //     return error
  //   }
  //   return info
  // })
};


//Generate OTP
exports.generateOTP = () => {
  const digits = '0123456789'
  const otpLength = 6
  let otp = ''

  for (let i = 1; i <= otpLength; i++) {
    var index = Math.floor(Math.random() * (digits.length))
    otp = otp + digits[index]
  }

  return otp
}