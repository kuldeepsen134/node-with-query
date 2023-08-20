const path = require('path');

//Get video api
module.exports = (app) => {
  try {
    app.get('/v1/video', (req, res) => {
      const filePath = path.join(__dirname, '../../../uploads');
      res.header("Cross-Origin-Resource-Policy", "cross-origin");
      res.sendFile(`${filePath}/${req.query.videoUrl.split('/').pop()}`)
    });
  } catch (error) {
    handleError(error, req, res)
  }
}