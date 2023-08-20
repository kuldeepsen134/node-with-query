const Joi = require("joi")

//Create group validation
const createBreachValidatorSchema = Joi.object().keys({
  dark_market_id: Joi.string().required()
}).options({ allowUnknown: true })

//Export all validation
module.exports = {
  createBreachValidatorSchema
}