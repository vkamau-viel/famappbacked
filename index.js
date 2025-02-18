const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
//const sequelize = require('./configs/db'); // Ensure this is configured correctly
const { sequelize } = require('./models'); // Import sequelize instance
const authRoutes = require('./routes/authRoutes');
const familyRoutes = require('./routes/familyRoutes');
const memberRoutes = require('./routes/memberRoutes');
const relationshipRoutes = require('./routes/relationshipRoutes');
const relativeRoutes = require('./routes/relativeRoutes');
const familyUserRoutes = require('./routes/familyUserRoutes');

//process.env.NODE_ENV = 'production';

dotenv.config(); // Load environment variables before using them

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded request bodies

// Logger Middleware
app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});

// Routes
app.use('/api/auth', authRoutes); // Mount authentication routes
app.use('/api/family', familyRoutes);
app.use('/api/member', memberRoutes);
app.use('/api/relationship', relationshipRoutes);
app.use('/api/relative', relativeRoutes);
app.use('/api/familyUser', familyUserRoutes);

// Sync the database and start the server
sequelize.sync({ }) // Change to `{ force: true || alter: true }` for development if needed
    .then(() => {
        console.log('Database synced successfully.');
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database sync error:', error);
    });
