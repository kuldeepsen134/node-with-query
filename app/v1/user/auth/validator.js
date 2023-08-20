const Joi = require('joi')

const loginUserSchema = Joi.object({
  email: Joi.string().email().required()
}).options({ allowUnknown: true })

const otpVerifySchema = Joi.object({
  email: Joi.string().email().required(),
  otp: Joi.string().required(),
  device_id: Joi.string().required(),
}).options({ allowUnknown: true })

module.exports = {
  loginUserSchema,
  otpVerifySchema
}