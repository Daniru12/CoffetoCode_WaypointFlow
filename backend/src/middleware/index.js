module.exports = {
  auth: require('../middlewares/auth.middleware'),
  role: require('../middlewares/role.middleware'),
  validate: require('../middlewares/validate.middleware'),
  upload: require('../middlewares/upload.middleware'),
  error: require('../middlewares/error.middleware')
};
