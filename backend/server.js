const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_KEY || supabaseKey);

const app = express();
app.use(
    cors({
        origin: ["https://elegant-faun-14186b.netlify.app", 
            "https://lyrics-generator-backend-883px.ondigitalocean.app",
            "http://localhost:5500",
            "http://127.0.0.1:5500"], 
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);
app.use(express.json());

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

app.get("/api/test", (req, res) => {
    res.json({ message: "Backend server is running!" });
});

app.get("/api/test-db", async (req, res) => {
    try {
        const { data, error } = await supabase.from("users").select("*").limit(1);

        if (error) {
            if (error.code === "42P01") {
                return res.json({
                    message: "Connected to Supabase, but users table not found.",
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

app.post("/api/generate-lyrics", authenticateToken, async (req, res) => {
    try {
        const { data: userData, error: userError } = await supabase.from("users").select("api_calls_count").eq("id", req.user.userId).single();

        if (userError) {
            throw userError;
        }

        const hasReachedLimit = userData.api_calls_count >= 20;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50000);

        const requestBody = {
            artist: req.body.artist,
            description: req.body.description,
            max_length: req.body.max_length,
            temperature: req.body.temperature,
            top_p: req.body.top_p,
            top_k: req.body.top_k,
            complete_song: req.body.complete_song,
        };

        const response = await fetch("http://146.190.124.66:8000/generate-pop-lyrics", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });

        clearTimeout(timeout);
        const data = await response.json();

        const { error: updateError } = await supabase
            .from("users")
            .update({ api_calls_count: userData.api_calls_count + 1 })
            .eq("id", req.user.userId);

        if (updateError) {
            console.error("Error updating API call count:", updateError);
        }

        res.json({
            ...data,
            apiCallsCount: userData.api_calls_count + 1,
            limitReached: hasReachedLimit,
            limitMessage: hasReachedLimit ? "You have reached your free tier limit of 20 API calls." : null,
        });
    } catch (error) {
        if (error.name === "AbortError") {
            return res.status(408).json({ error: "Request timed out" });
        }
        res.status(500).json({ error: "Failed to generate lyrics", details: error.message });
    }
});

app.post("/api/auth/register", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const { data: existingUser, error: checkError } = await supabase.from("users").select("*").eq("email", email).maybeSingle();

        if (checkError) {
            throw checkError;
        }

        if (existingUser) {
            return res.status(409).json({ error: "User with this email already exists" });
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const { data: newUser, error: insertError } = await supabase
            .from("users")
            .insert([
                {
                    email,
                    password: hashedPassword,
                    is_admin: false,
                    api_calls_count: 0,
                },
            ])
            .select();

        if (insertError) {
            throw insertError;
        }

        const token = jwt.sign(
            {
                userId: newUser[0].id,
                email: newUser[0].email,
                isAdmin: newUser[0].is_admin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

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

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        const { data: user, error: fetchError } = await supabase.from("users").select("*").eq("email", email).single();

        if (fetchError) {
            if (fetchError.code === "PGRST116") {
                return res.status(401).json({ error: "Invalid email or password" });
            }
            throw fetchError;
        }

        if (!user) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                isAdmin: user.is_admin,
            },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );

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

app.get("/api/user/profile", authenticateToken, async (req, res) => {
    try {
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

const checkAdmin = (req, res, next) => {
    if (!req.user.isAdmin) {
        return res.status(403).json({
            error: "Access denied",
            message: "Admin privileges required for this operation",
        });
    }
    next();
};

app.get("/api/admin/users", authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("users")
            .select("id, email, api_calls_count, is_admin, created_at")
            .order("created_at", { ascending: false });

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({
            error: "Failed to fetch users",
            details: error.message,
        });
    }
});

app.post("/api/admin/reset-api-count/:userId", authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const { data: user, error: userError } = await supabase.from("users").select("id").eq("id", userId).single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { error: updateError } = await supabase.from("users").update({ api_calls_count: 0 }).eq("id", userId);

        if (updateError) {
            throw updateError;
        }

        res.json({
            success: true,
            message: "API call count reset successfully",
        });
    } catch (error) {
        console.error("Error resetting API count:", error);
        res.status(500).json({
            error: "Failed to reset API count",
            details: error.message,
        });
    }
});

app.get("/api/admin/stats", authenticateToken, checkAdmin, async (req, res) => {
    try {
        const { count: totalUsers, error: countError } = await supabase.from("users").select("*", { count: "exact", head: true });

        if (countError) {
            throw countError;
        }

        const { data: apiCallsData, error: apiCallsError } = await supabase.from("users").select("api_calls_count");

        if (apiCallsError) {
            throw apiCallsError;
        }

        const totalApiCalls = apiCallsData.reduce((sum, user) => sum + user.api_calls_count, 0);

        const { data: limitedUsers, error: limitedError } = await supabase.from("users").select("id").gte("api_calls_count", 20);

        if (limitedError) {
            throw limitedError;
        }

        res.json({
            totalUsers,
            totalApiCalls,
            usersAtLimit: limitedUsers.length,
            averageApiCallsPerUser: totalUsers > 0 ? totalApiCalls / totalUsers : 0,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).json({
            error: "Failed to fetch statistics",
            details: error.message,
        });
    }
});

app.use((err, req, res, next) => {
    console.error("Server error:", err);
    res.status(500).json({
        error: "Server error",
        message: err.message || "An unexpected error occurred",
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running at: http://localhost:${PORT}`);
});
