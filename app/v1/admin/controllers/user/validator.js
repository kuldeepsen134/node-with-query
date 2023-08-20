// Joi module import
const Joi = require('joi');

const trimString = (value) => {
  if (typeof value === 'string') {
    return value.trim().replace(/\s+/g, '');
  }
  return value;
};

// User creation validation schema
const createUserSchema = Joi.object().keys({
  first_name: Joi.string().trim().required().custom((value, helper) => {
    const trimmedValue = trimString(value);
    if (trimmedValue !== value) {
      return helper.error('any.invalid');
    }
    return trimmedValue;
  }),
  last_name: Joi.string().trim().required().custom((value, helper) => {
    const trimmedValue = trimString(value);
    if (trimmedValue !== value) {
      return helper.error('any.invalid');
    }
    return trimmedValue;
  }),
  email: Joi.string().email().required(),
  phone_number: Joi.number().allow(null, ''),
  status: Joi.string().allow(null, ''),
  role: Joi.string().allow(null, ''),
  department_id: Joi.string().allow(null, ''),
  nationality: Joi.string().allow(null, ''),
  address: Joi.string().allow(null, ''),
  country: Joi.string().allow(null, ''),
  state: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  postcode: Joi.string().allow(null, ''),
  website: Joi.string().allow(null, '')
}).options({ allowUnknown: true });

// Profile update validation schema
const updateProfileSchema = Joi.object({
  first_name: Joi.string().allow(null, ''),
  last_name: Joi.string().allow(null, ''),
  mobile_number: Joi.string().allow(null, ''),
  country: Joi.string().allow(null, ''),
  state: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  postcode: Joi.string().allow(null, '')
}).options({ allowUnknown: true });

// User update validation schema
const updateUserSchema = Joi.object().keys({
  first_name: Joi.string().allow(null, ''),
  last_name: Joi.string().allow(null, ''),
  email: Joi.string().email().allow(null, ''),
  mobile_number: Joi.string().allow(null, ''),
  status: Joi.string().allow(null, ''),
  role: Joi.string().allow(null, ''),
  department_id: Joi.string().allow(null, ''),
  nationality: Joi.string().allow(null, ''),
  category: Joi.string().allow(null, ''),
  address: Joi.string().allow(null, ''),
  country: Joi.string().allow(null, ''),
  state: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  postcode: Joi.string().allow(null, ''),
  website: Joi.string().allow(null, '')
}).options({ allowUnknown: true });

// Export schemas for use in other modules
module.exports = {
  createUserSchema,
  updateUserSchema,
  updateProfileSchema
}
