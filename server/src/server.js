const { createApp } = require('./index');

const app = createApp();
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server listening on port ${port}`));
