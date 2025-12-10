const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'canva_management.db');
let db = null;

const initializeDatabase = () => {
  db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      return;
    }
    console.log('Connected to SQLite database');
    
    createTables();
    seedData();
  });
  
  return db;
};

const createTables = () => {
  // Users table with new fields
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    reference TEXT,
    status TEXT DEFAULT 'active',
    subscription_type TEXT DEFAULT 'free',
    amount_paid DECIMAL(10,2) DEFAULT 0.00,
    issue_date DATE,
    expiry_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Teams table with email field
  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    plan TEXT DEFAULT 'free',
    status TEXT DEFAULT 'active',
    email TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // User-Teams relationship table
  db.run(`CREATE TABLE IF NOT EXISTS user_teams (
    user_id INTEGER,
    team_id INTEGER,
    role TEXT DEFAULT 'user',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, team_id),
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
  )`);
};

const seedData = () => {
  // Check if we already have data
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return;
    
    if (row.count === 0) {
      // Insert sample users with new fields
      const users = [
        ['John Doe', 'john@example.com', 'REF001', 'active', 'paid', 99.99, '2024-01-15', '2024-12-15'],
        ['Jane Smith', 'jane@example.com', 'REF002', 'active', 'paid', 149.99, '2024-02-01', '2025-02-01'],
        ['Bob Johnson', 'bob@example.com', 'REF003', 'inactive', 'free', 0.00, '2024-01-10', '2024-02-10'],
        ['Alice Brown', 'alice@example.com', 'REF004', 'active', 'paid', 199.99, '2024-03-01', '2025-03-01'],
        ['Charlie Wilson', 'charlie@example.com', 'REF005', 'active', 'free', 0.00, '2024-01-20', '2024-04-20']
      ];
      
      const insertUser = db.prepare('INSERT INTO users (name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      users.forEach(user => insertUser.run(user));
      insertUser.finalize();
      
      // Insert sample teams with email
      const teams = [
        ['Design Team Alpha', 'Main design team for marketing', 'premium', 'active', 'design-alpha@company.com'],
        ['Content Creators', 'Content creation team', 'free', 'active', 'content@company.com'],
        ['Social Media Team', 'Handles all social media accounts', 'premium', 'active', 'social@company.com'],
        ['Admin Team', 'Administrative team', 'free', 'active', 'admin-team@company.com']
      ];
      
      const insertTeam = db.prepare('INSERT INTO teams (name, description, plan, status, email) VALUES (?, ?, ?, ?, ?)');
      teams.forEach(team => insertTeam.run(team));
      insertTeam.finalize();
      
      // Add users to teams
      const userTeams = [
        [1, 1, 'owner'],
        [1, 2, 'admin'],
        [2, 1, 'admin'],
        [2, 3, 'owner'],
        [3, 1, 'user'],
        [3, 2, 'user'],
        [4, 3, 'admin'],
        [4, 4, 'owner'],
        [5, 2, 'user'],
        [5, 3, 'user']
      ];
      
      const insertUserTeam = db.prepare('INSERT INTO user_teams (user_id, team_id, role) VALUES (?, ?, ?)');
      userTeams.forEach(ut => insertUserTeam.run(ut));
      insertUserTeam.finalize();
      
      console.log('Sample data inserted');
    }
  });
};

const getDatabase = () => {
  if (!db) {
    return initializeDatabase();
  }
  return db;
};

module.exports = {
  initializeDatabase,
  getDatabase
};
