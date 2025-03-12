const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Load environment variables
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY || supabaseKey);

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());

// Basic test route
app.get("/api/test", (req, res) => {
    res.json({ message: "Backend server is running!" });
});

// Test Supabase connection
app.get("/api/test-db", async (req, res) => {
    try {
        const { data, error } = await supabase.from("users").select("*").limit(1);

        // Check if table not found error; this is a unique supabase error code
        if (error) {
            if (error.code === "42P01") {
                return res.json({
                    message: "Connected to Supabase, but users table not found. This is expected if you haven't created tables yet.",
                    connection: "successful",
                    error: error.message,
                });
            }
            throw error;
        }

        res.json({
            message: "Supabase connection successful!",
            connection: "successful",
            data: data || [],
        });
    } catch (error) {
        console.error("Supabase connection error:", error);
        res.status(500).json({
            error: "Failed to connect to database",
            details: error.message,
        });
    }
});

// User Registration
app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase.from("users").select("*").eq("email", email).maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (existingUser) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user
        const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert([{ email, password: hashedPassword }])
            .select();

        if (insertError) {
            throw insertError;
        }

        // Generate JWT token
        const token = jwt.sign({ userId: newUser[0].id, email: newUser[0].email, isAdmin: newUser[0].is_admin }, process.env.JWT_SECRET, {
            expiresIn: "24h",
        });

        // Send response with token
        res.status(201).json({
            message: "User registered successfully",
            token,
            user: {
                id: newUser[0].id,
                email: newUser[0].email,
                isAdmin: newUser[0].is_admin,
            },
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ error: "Failed to register user", details: error.message });
    }
});

// Get a user by email (for testing purposes)
app.get("/api/user/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // Query the user from Supabase
        const { data, error } = await supabase.from("users").select("id, email, is_admin, api_calls_count, created_at").eq("email", email).single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: "User not found" });
        }

        // Return user data (excluding password)
        res.json({
            id: data.id,
            email: data.email,
            isAdmin: data.is_admin,
            apiCallsCount: data.api_calls_count,
            createdAt: data.created_at,
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to fetch user", details: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
});
