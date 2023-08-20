const { Op, Sequelize } = require('sequelize')

const { User, sequelize, Company } = require('app/models')

const { handleError, handleResponse, strings } = require('app/utils')

const { sendEmail, generateOTP } = require('app/send-email')

const { loginUserSchema, otpVerifySchema } = require('./validator')
const Joi = require('joi')

//Admin login 
exports.login = async (req, res) => {
  const { error } = loginUserSchema.validate(req.body)

  if (error) {
    handleError(error, req, res)
    return
  }

  try {
    const otp = generateOTP()

    const user = await User.findOne({
      where: {
        email: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          Sequelize.fn('LOWER', req.body.email)
        ), role: { [Op.in]: ['administrator', 'super_administrator', 'manager'] },
        status: 'active'
      }
    })

    if(user.company_id){
      const company = await Company.findOne({where: {id: user.company_id, status: 'active'}})
      
      if(!company){
        return res.status(400).send({ message: strings.YourCompany, error: true });
      }
    }

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

//Admin verify OTP
exports.verify = async (req, res) => {
  const { error } = otpVerifySchema.validate(req.body,)

  if (error) {
    handleError(error, req, res)
    return
  }

  try {

    const { email, otp, device_id } = req.body

    const validatedDeviceId = Joi.string().trim().required().validate(device_id)

    if (validatedDeviceId.error) {
      handleError(validatedDeviceId.error, req, res)
      return
    }

    const user = await User.findOne({
      where: {
        email: Sequelize.where(
          Sequelize.fn('LOWER', Sequelize.col('email')),
          Sequelize.fn('LOWER', email)
        ), otp: otp, role: { [Op.in]: ['administrator', 'super_administrator', 'manager'] },
        updated_at: {
          [Op.gte]: new Date(new Date() - 30 * 60 * 1000) // Filter updated_at within the last 30 minutes
        }
      }
    })

    if (user) {
      await sequelize.transaction(async (t) => {
        await User.update({ otp: null }, { where: { id: user.id } }, { transaction: t })

        const session = await user.createSession({ device_id: device_id }, { transaction: t })

        handleResponse(res, {
          message: strings.AuthSuccessMessage,
          access_token: session.access_token
        })
      })
    } else {
      handleError(strings.InvalidCode, req, res)
    }
  } catch (error) {
    handleError(error, req, res)
  }

}