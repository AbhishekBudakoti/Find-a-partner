const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();

const User = require('../models/user.model');
const Profile = require('../models/profile.model');
const Activity = require('../models/activity.model');

async function seed() {
    try {
        const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/find_a_partner';
        await mongoose.connect(mongoUrl);
        console.log('Connected to MongoDB for seeding...');

        // 1. Seed Activities
        const activityList = ["Tennis", "Running", "Cycling", "Badminton", "Chess", "Swimming"];
        const activityDocs = {};

        for (const name of activityList) {
            let act = await Activity.findOne({ name });
            if (!act) {
                act = await Activity.create({ name, description: `${name} activity` });
            }
            activityDocs[name] = act._id;
        }
        console.log('Activities seeded.');

        const defaultPassword = 'Test@12345';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        // 2. Main Test User (Abhishek)
        const testEmail = 'abhishek.socket2026@gmail.com';
        let mainUser = await User.findOne({ email: testEmail });
        if (!mainUser) {
            mainUser = await User.create({
                name: 'Abhishek',
                email: testEmail,
                password: hashedPassword,
                role: 'user',
                isVerified: true
            });
            console.log(`Created main test user: ${testEmail}`);
        } else {
            mainUser.password = hashedPassword;
            await mainUser.save();
        }

        let mainProfile = await Profile.findOne({ user: mainUser._id });
        if (!mainProfile) {
            await Profile.create({
                user: mainUser._id,
                bio: "Passionate about sports & outdoor activities!",
                skillLevel: "intermediate",
                activities: [activityDocs["Tennis"], activityDocs["Running"]],
                location: {
                    city: "Dehradun",
                    point: { type: "Point", coordinates: [78.0322, 30.3165] }
                }
            });
            console.log('Created profile for main test user.');
        } else {
            mainProfile.location = {
                city: "Dehradun",
                point: { type: "Point", coordinates: [78.0322, 30.3165] }
            };
            await mainProfile.save();
            console.log('Updated profile for main test user with coordinates.');
        }

        // 3. Test Candidates at various distances from [78.0322, 30.3165]
        const candidates = [
            {
                name: "Aarav Sharma",
                email: "aarav@example.com",
                bio: "Tennis enthusiast looking for weekly matches",
                skillLevel: "intermediate",
                activities: [activityDocs["Tennis"], activityDocs["Running"]],
                location: {
                    city: "Dehradun",
                    point: { type: "Point", coordinates: [78.0432, 30.3275] } // ~1.7 km
                },
                averageRating: 4.8,
            },
            {
                name: "Priya Patel",
                email: "priya@example.com",
                bio: "Beginner badminton & cycling partner wanted",
                skillLevel: "beginner",
                activities: [activityDocs["Badminton"], activityDocs["Cycling"]],
                location: {
                    city: "Dehradun",
                    point: { type: "Point", coordinates: [78.0550, 30.3400] } // ~3.6 km
                },
                averageRating: 4.2,
            },
            {
                name: "Rohan Verma",
                email: "rohan@example.com",
                bio: "Competitive tennis and chess player",
                skillLevel: "advanced",
                activities: [activityDocs["Tennis"], activityDocs["Chess"]],
                location: {
                    city: "Dehradun",
                    point: { type: "Point", coordinates: [78.0900, 30.3700] } // ~8.5 km
                },
                averageRating: 4.9,
            },
            {
                name: "Sneha Kapoor",
                email: "sneha@example.com",
                bio: "Trail runner and swimmer",
                skillLevel: "intermediate",
                activities: [activityDocs["Running"], activityDocs["Swimming"]],
                location: {
                    city: "Mussoorie",
                    point: { type: "Point", coordinates: [78.1700, 30.4500] } // ~20 km
                },
                averageRating: 4.6,
            },
            {
                name: "Vikram Singh",
                email: "vikram@example.com",
                bio: "Advanced badminton player",
                skillLevel: "advanced",
                activities: [activityDocs["Badminton"], activityDocs["Tennis"]],
                location: {
                    city: "Rishikesh",
                    point: { type: "Point", coordinates: [78.3000, 30.5800] } // ~40 km
                },
                averageRating: 4.0,
            },
            {
                name: "Ananya Gupta",
                email: "ananya@example.com",
                bio: "Weekend cyclist & chess hobbyist",
                skillLevel: "beginner",
                activities: [activityDocs["Cycling"], activityDocs["Chess"]],
                location: {
                    city: "Haridwar",
                    point: { type: "Point", coordinates: [78.5000, 30.8000] } // ~70 km
                },
                averageRating: 4.5,
            },
            {
                name: "Dev Kumar",
                email: "dev@example.com",
                bio: "Digital nomad - no fixed location point set",
                skillLevel: "intermediate",
                activities: [activityDocs["Tennis"], activityDocs["Swimming"]],
                location: {
                    city: "Remote Nomad"
                    // Intentionally NO point coordinates!
                },
                averageRating: 4.1,
            },
        ];

        for (const candidate of candidates) {
            let u = await User.findOne({ email: candidate.email });
            if (!u) {
                u = await User.create({
                    name: candidate.name,
                    email: candidate.email,
                    password: hashedPassword,
                    role: 'user',
                    isVerified: true
                });
            }

            let p = await Profile.findOne({ user: u._id });
            if (!p) {
                await Profile.create({
                    user: u._id,
                    bio: candidate.bio,
                    skillLevel: candidate.skillLevel,
                    activities: candidate.activities,
                    location: candidate.location,
                    averageRating: candidate.averageRating,
                });
                console.log(`Created profile for ${candidate.name} (${candidate.email})`);
            } else {
                p.location = candidate.location;
                p.activities = candidate.activities;
                p.skillLevel = candidate.skillLevel;
                p.averageRating = candidate.averageRating;
                await p.save();
                console.log(`Updated profile for ${candidate.name}`);
            }
        }

        await mongoose.disconnect();
        console.log('Seeding completed successfully. All candidate test profiles created!');
    } catch (err) {
        console.error('Seeding failed:', err);
        process.exit(1);
    }
}

seed();
