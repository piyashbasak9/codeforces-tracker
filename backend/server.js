require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  handle: { type: String, required: true, unique: true },
  rating: { type: Number, default: 0 },
  rank: { type: String, default: 'unrated' },
  lastUpdated: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Codeforces API Helper
async function fetchCodeforcesUser(handle) {
  try {
    const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
    if (response.data.status === 'OK' && response.data.result.length > 0) {
      const user = response.data.result[0];
      return {
        handle: user.handle,
        rating: user.rating || 0,
        rank: user.rank || 'unrated'
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Codeforces user:', error.message);
    return null;
  }
}

// Routes
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find().sort({ rating: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { handle } = req.body;
  
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ handle });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    // Fetch user data from Codeforces
    const cfUser = await fetchCodeforcesUser(handle);
    if (!cfUser) {
      return res.status(404).json({ message: 'Codeforces user not found' });
    }
    
    // Create new user
    const newUser = new User({
      handle: cfUser.handle,
      rating: cfUser.rating,
      rank: cfUser.rank,
      lastUpdated: Date.now()
    });
    
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete('/api/users/:handle', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ handle: req.params.handle });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update all users' ratings
app.get('/api/update-all', async (req, res) => {
  try {
    const users = await User.find();
    const handles = users.map(user => user.handle).join(';');
    
    if (handles.length === 0) {
      return res.json({ message: 'No users to update' });
    }
    
    const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handles}`);
    if (response.data.status === 'OK') {
      const updatedUsers = response.data.result;
      
      for (const cfUser of updatedUsers) {
        await User.findOneAndUpdate(
          { handle: cfUser.handle },
          {
            rating: cfUser.rating || 0,
            rank: cfUser.rank || 'unrated',
            lastUpdated: Date.now()
          }
        );
      }
      
      res.json({ message: 'All users updated successfully' });
    } else {
      res.status(500).json({ message: 'Failed to fetch data from Codeforces' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});