const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(bodyParser.json());
// ✅ Correct way to serve files from /uploads path
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.set('view engine', 'ejs');

// MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin',
  database: 'vbit'
});

db.connect((err) => {
  if (err) throw err;
  console.log('Connected to MySQL Database');
});

// File upload setup using multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads'); // folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // to avoid name collisions
  }
});
const upload = multer({ storage });

// Routes
app.get('/home', (req, res) => {
  res.sendFile(__dirname + '/home.html');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/register.html');
});

app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

app.get('/dashboard', (req, res) => {
  res.sendFile(__dirname + '/dashboard.html');
});

app.get('/teacher/dashboard', (req, res) => {
  res.sendFile(__dirname + '/teacher/main.html');
});

app.get('/student/dashboard', (req, res) => {
    res.sendFile(__dirname + '/student/main.html');
  });

app.get('/teacher/post', (req, res) => {
  res.sendFile(__dirname + '/teacher/post.html');
});

app.get('/teacher/upload', (req, res) => {
  res.render('upload'); // renders views/upload.ejs
});

app.get('/student/rag', (req, res) => {
  res.redirect('http://localhost:8501');
});

app.get('/student/llm', (req, res) => {
  res.redirect('https://gemini-pro-app-smartlearning.streamlit.app');
});

// Registration
app.post('/submit_registration', (req, res) => {
  const { first_name, last_name, roll_no, email, gender, password, confirm_password, mobile_number } = req.body;
  const sql = 'INSERT INTO users (first_name, last_name, roll_no, email, gender, password, confirm_password, mobile_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(sql, [first_name, last_name, roll_no, email, gender, password, confirm_password, mobile_number], (err) => {
    if (err) throw err;
    res.redirect('/login');
  });
});

// Login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, result) => {
    if (err) throw err;
    if (result.length > 0) {
      res.redirect('/dashboard');
    } else {
      res.send('Invalid email or password');
    }
  });
});

// Attendance Submission
app.post('/submit-attendance', (req, res) => {
  const data = req.body;

  const insertOrUpdate = (entry, callback) => {
    const { roll, name, attendance, marks, date } = entry;

    const checkSql = 'SELECT * FROM attendance_marks WHERE roll_no = ? AND date = ?';
    db.query(checkSql, [roll, date], (err, results) => {
      if (err) return callback(err);

      if (results.length > 0) {
        const updateSql = 'UPDATE attendance_marks SET attendance = ?, marks = ?, name = ? WHERE roll_no = ? AND date = ?';
        db.query(updateSql, [attendance, marks, name, roll, date], callback);
      } else {
        const insertSql = 'INSERT INTO attendance_marks (roll_no, name, attendance, marks, date) VALUES (?, ?, ?, ?, ?)';
        db.query(insertSql, [roll, name, attendance, marks, date], callback);
      }
    });
  };

  let completed = 0;
  data.forEach(entry => {
    insertOrUpdate(entry, (err) => {
      if (err) {
        console.error('DB Error:', err);
        return res.status(500).send('Error saving data.');
      }

      completed++;
      if (completed === data.length) {
        res.send('Attendance & Marks saved or updated successfully!');
      }
    });
  });
});

app.post('/upload-topic', upload.single('notes'), (req, res) => {
    const { topic_name, date } = req.body;
    const filePath = req.file ? req.file.path : null;
  
    if (!topic_name || !date || !filePath) {
      console.log("Missing fields:", topic_name, date, filePath);
      return res.status(400).send('Missing required fields.');
    }
  
    const sql = 'INSERT INTO uploads (topic_name, date, file_path) VALUES (?, ?, ?)';
    db.query(sql, [topic_name, date, filePath], (err) => {
      if (err) {
        console.error('DB Insert Error:', err);
        return res.status(500).send('Error uploading data.');
      }
  
      res.send('Topic uploaded successfully!'); // ✅ Send response to browser
    });
  });
  
  

// Visualize page
app.get('/teacher/visualize', (req, res) => {
  const getDatesSql = 'SELECT DISTINCT date FROM attendance_marks ORDER BY date DESC';
  db.query(getDatesSql, (err, dateResults) => {
    if (err) return res.status(500).send('Database error.');
    res.render('visualize', { dates: dateResults });
  });
});

// API for performance data
app.get('/api/data/:date', (req, res) => {
  const { date } = req.params;
  const sql = 'SELECT name, attendance, marks FROM attendance_marks WHERE date = ? ORDER BY name';
  db.query(sql, [date], (err, results) => {
    if (err) return res.status(500).send('Error fetching data.');
    res.json(results);
  });
});


app.get('/student/uploads', (req, res) => {
  const sql = 'SELECT * FROM uploads ORDER BY date DESC';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).send('Database fetch error.');
    res.render('studentuploads', { uploads: results });
  });
});



// Start Server
app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
