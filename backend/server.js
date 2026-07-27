// Force Node.js to resolve IPv4 addresses first and use reliable public DNS servers to prevent querySrv ECONNREFUSED with MongoDB Atlas & Gmail SMTP
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch(e) {}

const app = require("./app");
const connectDB = require("./config/db");
const startCronJobs = require("./utils/cronJobs");

require("dotenv").config();
console.log("ENV FILE TEST");
console.log(process.env.EMAIL_USER);

const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        origin.includes("localhost") ||
        origin.includes("127.0.0.1") ||
        origin.includes("vercel.app") ||
        origin.includes("onrender.com") ||
        (process.env.FRONTEND_URL && origin.includes(process.env.FRONTEND_URL))
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true
  }
});

// Pass io to Express app so controllers can use it
app.set("io", io);

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Connect to MongoDB and start server
connectDB().then(() => {
  // Initialize cron scheduler after DB connection
  startCronJobs();

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}).catch(err => {
  console.error("Critical error starting backend server:", err);
  process.exit(1);
});
