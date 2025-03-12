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
app.use(cors({
    origin: '*', // In production, restrict this to your frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
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
        
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .maybeSingle();

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
            .insert([{ 
                email, 
                password: hashedPassword,
                is_admin: false,
                api_calls_count: 0
            }])
            .select();

        if (insertError) {
            throw insertError;
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: newUser[0].id, 
                email: newUser[0].email, 
                isAdmin: newUser[0].is_admin 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: "24h" }
        );

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

// User Login
app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Find user
        const { data: user, error: fetchError } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

        if (fetchError) {
            if (fetchError.code === 'PGRST116') {  // PostgreSQL "not found" error
                return res.status(401).json({ error: "Invalid email or password" });
            }
            throw fetchError;
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Compare password
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                isAdmin: user.is_admin 
            }, 
            process.env.JWT_SECRET, 
            { expiresIn: "24h" }
        );

        // Send response with token
        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                email: user.email,
                isAdmin: user.is_admin,
                apiCallsCount: user.api_calls_count,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ error: "Failed to login", details: error.message });
    }
});

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error("Token verification error:", error);
        return res.status(403).json({ error: "Invalid or expired token" });
    }
};

// Protected route - get user profile
app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
        // Fetch user from database to get the most up-to-date information
        const { data, error } = await supabase
            .from("users")
            .select("id, email, is_admin, api_calls_count, created_at")
            .eq("id", req.user.userId)
            .single();

        if (error) {
            console.error("Detailed Supabase error:", error);
            return res.status(500).json({
                error: "Database query error",
                details: error.message,
                code: error.code,
            });
        }

        if (!data) {
            return res.status(404).json({
                error: "User not found",
                userId: req.user.userId,
            });
        }

        // Return user profile data
        res.json({
            id: data.id,
            email: data.email,
            isAdmin: data.is_admin,
            apiCallsCount: data.api_calls_count,
            createdAt: data.created_at,
        });
    } catch (error) {
        console.error("Catch-all profile error:", error);
        res.status(500).json({
            error: "Unexpected error",
            details: error.message,
        });
    }
});

// Basic error handler middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: "Server error", 
        message: err.message || "An unexpected error occurred"
    });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
});