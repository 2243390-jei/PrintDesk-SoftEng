// Minimal server starter — uses modular app in `app.js`
const app = require('./app')

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))


// For reset tokens in the userTokens in the admin side.
const resetTokensRouter = require('./routes/resetTokens');

app.use('/api', resetTokensRouter);