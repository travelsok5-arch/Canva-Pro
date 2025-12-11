const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const database = require('./database');
const multer = require('multer');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// Multer setup for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// Initialize database
database.initializeDatabase();

// API Routes

// Admin Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  if (email === 'admin@canva.com' && password === 'admin@12345') {
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: 1,
        email: 'admin@canva.com',
        name: 'Admin',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// Get all teams
app.get('/api/teams', (req, res) => {
  const db = database.getDatabase();
  
  db.all(`
    SELECT t.*, 
           COUNT(DISTINCT ut.user_id) as member_count,
           COUNT(CASE WHEN ut.role = 'owner' THEN 1 END) as owner_count,
           COUNT(CASE WHEN ut.role = 'admin' THEN 1 END) as admin_count,
           COUNT(CASE WHEN ut.role = 'user' THEN 1 END) as user_count
    FROM teams t
    LEFT JOIN user_teams ut ON t.id = ut.team_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get team by ID
app.get('/api/teams/:id', (req, res) => {
  const db = database.getDatabase();
  const teamId = req.params.id;
  
  db.get('SELECT * FROM teams WHERE id = ?', [teamId], (err, team) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!team) {
      res.status(404).json({ error: 'Team not found' });
      return;
    }
    
    // Get team members
    db.all(`
      SELECT u.*, ut.role, ut.joined_at
      FROM users u
      JOIN user_teams ut ON u.id = ut.user_id
      WHERE ut.team_id = ?
      ORDER BY 
        CASE ut.role 
          WHEN 'owner' THEN 1
          WHEN 'admin' THEN 2
          WHEN 'user' THEN 3
          ELSE 4
        END,
        u.name
    `, [teamId], (err, members) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ ...team, members });
    });
  });
});

// Create new team
app.post('/api/teams', (req, res) => {
  const { name, description, plan, status, email } = req.body;
  const db = database.getDatabase();
  
  db.run(
    'INSERT INTO teams (name, description, plan, status, email, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
    [name, description, plan, status, email],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        message: 'Team created successfully' 
      });
    }
  );
});

// Update team
app.put('/api/teams/:id', (req, res) => {
  const teamId = req.params.id;
  const { name, description, plan, status, email } = req.body;
  const db = database.getDatabase();
  
  db.run(
    'UPDATE teams SET name = ?, description = ?, plan = ?, status = ?, email = ? WHERE id = ?',
    [name, description, plan, status, email, teamId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        changes: this.changes,
        message: 'Team updated successfully' 
      });
    }
  );
});

// Delete team
app.delete('/api/teams/:id', (req, res) => {
  const teamId = req.params.id;
  const db = database.getDatabase();
  
  db.run('DELETE FROM teams WHERE id = ?', [teamId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ 
      changes: this.changes,
      message: 'Team deleted successfully' 
    });
  });
});

// Get all users
app.get('/api/users', (req, res) => {
  const db = database.getDatabase();
  
  db.all(`
    SELECT u.*, 
           GROUP_CONCAT(DISTINCT t.name) as team_names,
           GROUP_CONCAT(DISTINCT ut.role) as roles
    FROM users u
    LEFT JOIN user_teams ut ON u.id = ut.user_id
    LEFT JOIN teams t ON ut.team_id = t.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get user by ID
app.get('/api/users/:id', (req, res) => {
  const db = database.getDatabase();
  const userId = req.params.id;
  
  db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    
    res.json(user);
  });
});

// Create new user
app.post('/api/users', (req, res) => {
  const { name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date } = req.body;
  const db = database.getDatabase();
  
  db.run(
    'INSERT INTO users (name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime("now"))',
    [name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        id: this.lastID, 
        message: 'User created successfully' 
      });
    }
  );
});

// Update user - FIXED: Check if email is being changed
app.put('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const { name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date } = req.body;
  const db = database.getDatabase();
  
  // First, check if the email already exists for another user
  db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId], (err, existingUser) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existingUser) {
      res.status(400).json({ error: 'Email already exists for another user' });
      return;
    }
    
    // Update the user
    db.run(
      `UPDATE users SET 
        name = ?, 
        email = ?, 
        reference = ?, 
        status = ?, 
        subscription_type = ?, 
        amount_paid = ?, 
        issue_date = ?, 
        expiry_date = ? 
      WHERE id = ?`,
      [name, email, reference, status, subscription_type, amount_paid, issue_date, expiry_date, userId],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          changes: this.changes,
          message: 'User updated successfully' 
        });
      }
    );
  });
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const db = database.getDatabase();
  
  db.run('DELETE FROM users WHERE id = ?', [userId], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ 
      changes: this.changes,
      message: 'User deleted successfully' 
    });
  });
});

// Add user to team
app.post('/api/teams/:teamId/users', (req, res) => {
  const teamId = req.params.teamId;
  const { userId, role } = req.body;
  const db = database.getDatabase();
  
  db.run(
    'INSERT OR REPLACE INTO user_teams (user_id, team_id, role, joined_at) VALUES (?, ?, ?, datetime("now"))',
    [userId, teamId, role],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        message: 'User added to team successfully' 
      });
    }
  );
});

// Remove user from team
app.delete('/api/teams/:teamId/users/:userId', (req, res) => {
  const { teamId, userId } = req.params;
  const db = database.getDatabase();
  
  db.run(
    'DELETE FROM user_teams WHERE user_id = ? AND team_id = ?',
    [userId, teamId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        changes: this.changes,
        message: 'User removed from team successfully' 
      });
    }
  );
});

// Update user role in team
app.put('/api/teams/:teamId/users/:userId/role', (req, res) => {
  const { teamId, userId } = req.params;
  const { role } = req.body;
  const db = database.getDatabase();
  
  db.run(
    'UPDATE user_teams SET role = ? WHERE user_id = ? AND team_id = ?',
    [role, userId, teamId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ 
        changes: this.changes,
        message: 'User role updated successfully' 
      });
    }
  );
});

// Backup database
app.get('/api/backup', (req, res) => {
  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  
  const backupFile = path.join(backupDir, `canva-backup-${Date.now()}.db`);
  const sourceFile = path.join(__dirname, 'canva_management.db');
  
  fs.copyFile(sourceFile, backupFile, (err) => {
    if (err) {
      res.status(500).json({ error: 'Failed to create backup' });
      return;
    }
    
    res.download(backupFile, `canva-backup-${Date.now()}.db`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }
    });
  });
});

// Restore database
app.post('/api/restore', upload.single('database'), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  
  const sourceFile = req.file.path;
  const destFile = path.join(__dirname, 'canva_management.db');
  
  // Close current database connection
  const db = database.getDatabase();
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    }
    
    // Copy uploaded file to replace current database
    fs.copyFile(sourceFile, destFile, (err) => {
      if (err) {
        res.status(500).json({ error: 'Failed to restore database' });
        return;
      }
      
      // Reinitialize database connection
      database.initializeDatabase();
      
      // Clean up uploaded file
      fs.unlinkSync(sourceFile);
      
      res.json({ 
        success: true,
        message: 'Database restored successfully' 
      });
    });
  });
});

// Get statistics
app.get('/api/stats', (req, res) => {
  const db = database.getDatabase();
  
  db.all(`
    SELECT 
      (SELECT COUNT(*) FROM users) as total_users,
      (SELECT COUNT(*) FROM teams) as total_teams,
      (SELECT COUNT(*) FROM users WHERE status = 'active') as active_users,
      (SELECT COUNT(*) FROM users WHERE status = 'inactive') as inactive_users,
      (SELECT COUNT(*) FROM teams WHERE plan = 'premium') as premium_teams,
      (SELECT COUNT(*) FROM teams WHERE plan = 'free') as free_teams,
      (SELECT COUNT(*) FROM users WHERE subscription_type = 'paid') as paid_users,
      (SELECT COUNT(*) FROM users WHERE subscription_type = 'free') as free_users,
      (SELECT SUM(amount_paid) FROM users WHERE subscription_type = 'paid') as total_revenue,
      (SELECT COUNT(*) FROM user_teams WHERE role = 'owner') as total_owners,
      (SELECT COUNT(*) FROM user_teams WHERE role = 'admin') as total_admins,
      (SELECT COUNT(*) FROM user_teams WHERE role = 'user') as total_team_users
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows[0]);
  });
});

// Get recent activity
app.get('/api/recent-activity', (req, res) => {
  const db = database.getDatabase();
  
  db.all(`
    SELECT 'team_created' as type, name, created_at as timestamp
    FROM teams
    UNION ALL
    SELECT 'user_added' as type, name, created_at as timestamp
    FROM users
    ORDER BY timestamp DESC
    LIMIT 10
  `, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Serve main page
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Admin Login: admin@canva.com / admin@12345`);
});