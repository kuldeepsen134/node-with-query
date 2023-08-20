const { User, Family } = require('app/models')

const { handleError, handleResponse, strings } = require('app/utils')

const { sendEmail, generateOTP } = require('app/send-email')
const { loginUserSchema, otpVerifySchema } = require('./validator')

exports.login = async (req, res) => {

  const { error } = loginUserSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {
    const otp = generateOTP()

    const user = await User.findOne({ where: { email: req.body.email, role: 'user', status: 'active' } })
    if (user) {
      await User.update({ otp: otp }, { where: { id: user.id } })

      await sendEmail({ email: user.email, subject: `Your login OTP is ${otp}`, otp: otp, fileName: 'index', res: res, first_name: user.first_name })
      handleResponse(res, { message: strings.OtpSend })
    } else {
      handleError(strings.UserNotFound, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}

exports.verify = async (req, res) => {
  const { error } = otpVerifySchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }
  try {
    const user = await User.findOne({ where: { email: req.body.email, otp: req.body.otp } })

    if (user) {
      const session = await user.createSession({ device_id: req.body.device_id })

      await User.update({ otp: null }, { where: { id: user.id } })

      const [member, created] = await Family.findOrCreate({
        where: { user_id: user.id, email: user.email },
        defaults: { user_id: user.id, type: 'corporate', email: user.email }
      });

      handleResponse(res, {
        message: strings.AuthSuccessMessage,
        access_token: session.access_token
      })
    } else {
      handleError(strings.InvalidCode, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }
}