const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/user.model');

async function seed() {
    try {
        const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/find_a_partner';
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB for seeding...');

        const testEmail = 'abhishek.socket2026@gmail.com';
        const testPassword = 'Test@12345';

        let user = await User.findOne({ email: testEmail });
        if (!user) {
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            user = await User.create({
                name: 'Abhishek',
                email: testEmail,
                password: hashedPassword,
                role: 'user',
                isVerified: true
            });
            console.log(`Successfully created test user: ${testEmail} with password: ${testPassword}`);
        } else {
            // Update password to match Test@12345 if needed
            const hashedPassword = await bcrypt.hash(testPassword, 10);
            user.password = hashedPassword;
            await user.save();
            console.log(`User ${testEmail} already exists. Reset password to: ${testPassword}`);
        }

        await mongoose.disconnect();
        console.log('Seeding completed successfully.');
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
