const app = require('./app');
const port = process.env.PORT || 8138;

app.listen(port, '0.0.0.0', () => {
  console.info(`binb server listening on port ${port}`);
});
