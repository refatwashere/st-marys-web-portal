import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useParams } from "react-router-dom";
import './App.css';

// Main App component
const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState('');

  // IMPORTANT: Replace with your deployed backend URL if not running locally
  const API_BASE_URL = 'http://localhost:10000';

  useEffect(() => {
    console.log(`Frontend configured to use API_BASE_URL: ${API_BASE_URL}`);
    // setMessage is stable from useState, so not needed in deps
    // React 18+ is fine with this usage
  }, [API_BASE_URL]);

  // --- Authentication Logic ---
  // We'll use useNavigate inside a wrapper below
  const handleLogin = async (username, password, navigate) => {
    try {
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsLoggedIn(true);
        setCurrentUser({ username: data.username, token: data.token });
        setMessage('Login successful!');
        fetchClasses();
        if (navigate) navigate('/dashboard');
      } else {
        setMessage(data.message || 'Login failed.');
      }
    } catch {
      setMessage('An error occurred during login. Please ensure the backend server is running and the API_BASE_URL is correctly configured.');
    }
  };

  const handleLogout = (navigate) => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setClasses([]);
    setMessage('Logged out successfully.');
    if (navigate) navigate('/login');
  };

  // --- Data Fetching Functions ---
  const fetchClasses = async () => {
    if (!isLoggedIn || !currentUser?.token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setClasses(data);
      } else {
        setMessage(data.message || 'Failed to fetch classes.');
      }
    } catch {
      setMessage('Error fetching classes. Please check your network connection and backend status.');
    }
  };

  // Removed unused fetchClassMaterials, fetchClassStudents, fetchStudentUpdates

  // --- App Layout with React Router ---
  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={
            <LoginScreenWrapper
              isLoggedIn={isLoggedIn}
              onLogin={handleLogin}
              message={message}
            />
          }
        />
        <Route
          path="/dashboard"
          element={
            isLoggedIn ? (
              <AppLayout
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                message={message}
                handleLogout={handleLogout}
              >
                <DashboardScreen
                  classes={classes}
                  onAddClass={fetchClasses}
                  currentUser={currentUser}
                  API_BASE_URL={API_BASE_URL}
                  token={currentUser?.token}
                  setMessage={setMessage}
                />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/class/:classId"
          element={
            isLoggedIn ? (
              <AppLayout
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                message={message}
                handleLogout={handleLogout}
              >
                <ClassDetailScreen
                  currentUser={currentUser}
                  API_BASE_URL={API_BASE_URL}
                  token={currentUser?.token}
                  setMessage={setMessage}
                />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="/class/:classId/student/:studentId"
          element={
            isLoggedIn ? (
              <AppLayout
                isLoggedIn={isLoggedIn}
                currentUser={currentUser}
                message={message}
                handleLogout={handleLogout}
              >
                <StudentDetailScreen
                  currentUser={currentUser}
                  API_BASE_URL={API_BASE_URL}
                  token={currentUser?.token}
                  setMessage={setMessage}
                />
              </AppLayout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route
          path="*"
          element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  );
};

// --- LoginScreen Wrapper to use useNavigate ---
const LoginScreenWrapper = ({ isLoggedIn, onLogin, message }) => {
  const navigate = useNavigate();
  if (isLoggedIn) return <Navigate to="/dashboard" />;
  return <LoginScreen onLogin={(u, p) => onLogin(u, p, navigate)} message={message} />;
};

// --- App Layout Wrapper ---
// --- AppLayout Wrapper to use useNavigate for logout ---
const AppLayout = ({ isLoggedIn, currentUser, handleLogout, message, children }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <header className="bg-blue-600 text-white p-6 rounded-t-xl flex justify-between items-center">
          <h1 className="text-3xl font-bold font-inter">SMIS - WEB PORTAL</h1>
          {isLoggedIn && (
            <div className="flex items-center space-x-4">
              <span className="text-lg">Welcome, {currentUser?.username}!</span>
              <button
                onClick={() => handleLogout(navigate)}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg shadow-md hover:bg-blue-50 transition duration-300 font-semibold"
              >
                Logout
              </button>
            </div>
          )}
        </header>
        <main className="p-6">
          {message && (
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4" role="alert">
              {message}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
};

// --- Login Screen Component ---
const LoginScreen = ({ onLogin, message }) => {
  const [username, setUsername] = useState('teacher');
  const [password, setPassword] = useState('password');

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(username, password);
  };

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <h2 className="text-3xl font-semibold text-gray-800 mb-6 font-inter">Teacher Login</h2>
      {message && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-lg mb-4" role="alert">
          {message}
        </div>
      )}
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-gray-50 p-8 rounded-lg shadow-md">
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
            Username
          </label>
          <input
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="username"
            type="text"
            placeholder="teacher"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
            Password
          </label>
          <input
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="password"
            type="password"
            placeholder="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 w-full"
            type="submit"
          >
            Sign In
          </button>
        </div>
      </form>
    </div>
  );
};

const DashboardScreen = ({ classes, onAddClass, currentUser, API_BASE_URL, token, setMessage }) => {
  const teacherName = currentUser?.username || 'Teacher';
  const [newClassName, setNewClassName] = useState('');
  const [newClassDescription, setNewClassDescription] = useState('');
  const navigate = useNavigate();

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setMessage('Class name cannot be empty.');
      return;
    }
    try {
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newClassName, description: newClassDescription, teacher_id: currentUser.username }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Class added successfully!');
        setNewClassName('');
        setNewClassDescription('');
        onAddClass();
      } else {
        setMessage(data.message || 'Failed to add class.');
      }
    } catch {
      setMessage('Error adding class. Please check your network connection and backend status.');
    }
  };

  return (
    <div className="py-4">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2 font-inter">Welcome, {teacherName}!</h2>
      <h3 className="text-xl font-semibold text-gray-800 mb-6 font-inter">Your Classes</h3>
      {/* Add New Class Form */}
      <form onSubmit={handleAddClass} className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Add New Class</h3>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="className">
            Class Name
          </label>
          <input
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="className"
            type="text"
            placeholder="e.g., Grade 10 English"
            value={newClassName}
            onChange={(e) => setNewClassName(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="classDescription">
            Description (Optional)
          </label>
          <textarea
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="classDescription"
            placeholder="Brief description of the class"
            rows="3"
            value={newClassDescription}
            onChange={(e) => setNewClassDescription(e.target.value)}
          ></textarea>
        </div>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
          type="submit"
        >
          Add Class
        </button>
      </form>
      {/* Classes List */}
      {classes.length === 0 ? (
        <p className="text-gray-600 text-lg">No classes found. Add your first class above!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white p-6 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition duration-300 cursor-pointer flex flex-col justify-between"
              onClick={() => navigate(`/class/${cls.id}`)}
            >
              <div>
                <h3 className="text-xl font-semibold text-blue-700 mb-2 font-inter">{cls.name}</h3>
                <p className="text-gray-600 text-sm">{cls.description || 'No description provided.'}</p>
              </div>
              <button
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md self-end transition duration-300"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Class Detail Screen Component ---
const ClassDetailScreen = ({ currentUser, API_BASE_URL, token, setMessage }) => {
  const { classId } = useParams();
  const teacherName = currentUser?.username || 'Teacher';
  const [classData, setClassData] = useState(null);
  const [materials, setMaterials] = useState([]);
  const [students, setStudents] = useState([]);
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialContent, setNewMaterialContent] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClass = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/classes/${classId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setClassData(data);
        } else {
          setMessage(data.message || 'Failed to fetch class.');
        }
      } catch {
        setMessage('Error fetching class.');
      }
    };
    const fetchMaterials = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/materials`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setMaterials(data);
        } else {
          setMessage(data.message || 'Failed to fetch materials.');
        }
      } catch {
        setMessage('Error fetching materials.');
      }
    };
    const fetchStudents = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setStudents(data);
        } else {
          setMessage(data.message || 'Failed to fetch students.');
        }
      } catch {
        setMessage('Error fetching students.');
      }
    };
    fetchClass();
    fetchMaterials();
    fetchStudents();
  }, [classId, API_BASE_URL, token, setMessage]);

  const handleAddMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterialTitle.trim() || !newMaterialContent.trim()) {
      setMessage('Material title and content cannot be empty.');
      return;
    }
    try {
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/materials`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ title: newMaterialTitle, content: newMaterialContent, class_id: classId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Material added successfully!');
        setNewMaterialTitle('');
        setNewMaterialContent('');
        // Refresh materials
        const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/materials`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setMaterials(await res.json());
      } else {
        setMessage(data.message || 'Failed to add material.');
      }
    } catch {
      setMessage('Error adding material.');
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName.trim()) {
      setMessage('Student name cannot be empty.');
      return;
    }
    try {
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newStudentName, class_id: classId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Student added successfully!');
        setNewStudentName('');
        // Refresh students
        const res = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setStudents(await res.json());
      } else {
        setMessage(data.message || 'Failed to add student.');
      }
    } catch {
      setMessage('Error adding student.');
    }
  };

  if (!classData) return <div>Loading class details...</div>;

  return (
    <div className="py-4">
      <div className="mb-2 text-gray-500 text-sm">Managed by: {teacherName}</div>
      <button
        onClick={() => navigate('/dashboard')}
        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mb-6 shadow-md transition duration-300"
      >
        &larr; Back to Dashboard
      </button>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 font-inter">Class: {classData.name}</h2>
      <p className="text-gray-600 mb-8">{classData.description}</p>
      {/* Add New Material Form */}
      <form onSubmit={handleAddMaterial} className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Add New Material</h3>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="materialTitle">
            Material Title
          </label>
          <input
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="materialTitle"
            type="text"
            placeholder="e.g., Chapter 1 Notes"
            value={newMaterialTitle}
            onChange={(e) => setNewMaterialTitle(e.target.value)}
            required
          />
        </div>
        <div className="mb-6">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="materialContent">
            Content (Text or URL)
          </label>
          <textarea
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="materialContent"
            placeholder="Enter material content or a link"
            rows="4"
            value={newMaterialContent}
            onChange={(e) => setNewMaterialContent(e.target.value)}
            required
          ></textarea>
        </div>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
          type="submit"
        >
          Add Material
        </button>
      </form>
      {/* Class Materials List */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Class Materials</h3>
      {materials.length === 0 ? (
        <p className="text-gray-600 mb-8">No materials added yet for this class.</p>
      ) : (
        <div className="space-y-4 mb-8">
          {materials.map((material) => (
            <div key={material.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <h4 className="text-lg font-semibold text-blue-600">{material.title}</h4>
              <p className="text-gray-700 text-sm mt-1">{material.content}</p>
            </div>
          ))}
        </div>
      )}
      {/* Add New Student Form */}
      <form onSubmit={handleAddStudent} className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Add New Student</h3>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="studentName">
            Student Name
          </label>
          <input
            className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
            id="studentName"
            type="text"
            placeholder="e.g., John Doe"
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            required
          />
        </div>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300"
          type="submit"
        >
          Add Student
        </button>
      </form>
      {/* Students List */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Students in {classData.name}</h3>
      {students.length === 0 ? (
        <p className="text-gray-600">No students added yet to this class.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-white p-4 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition duration-300 cursor-pointer flex justify-between items-center"
              onClick={() => navigate(`/class/${classId}/student/${student.id}`)}
            >
              <span className="text-lg font-medium text-blue-700">{student.name}</span>
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-1 px-3 rounded-lg shadow-md text-sm transition duration-300"
              >
                View Updates
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// --- Student Detail Screen Component ---
const StudentDetailScreen = ({ currentUser, API_BASE_URL, token, setMessage }) => {
  const { classId, studentId } = useParams();
  const teacherName = currentUser?.username || 'Teacher';
  const [student, setStudent] = useState(null);
  const [updates, setUpdates] = useState([]);
  const [newUpdateContent, setNewUpdateContent] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudent = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          const found = data.find((s) => String(s.id) === String(studentId));
          setStudent(found);
        } else {
          setMessage(data.message || 'Failed to fetch student.');
        }
      } catch {
        setMessage('Error fetching student.');
      }
    };
    const fetchUpdates = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/updates`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const data = await response.json();
        if (response.ok) {
          setUpdates(data);
        } else {
          setMessage(data.message || 'Failed to fetch updates.');
        }
      } catch {
        setMessage('Error fetching updates.');
      }
    };
    fetchStudent();
    fetchUpdates();
  }, [classId, studentId, API_BASE_URL, token]);

  const handleAddUpdate = async (e) => {
    e.preventDefault();
    if (!newUpdateContent.trim()) {
      setMessage('Update content cannot be empty.');
      return;
    }
    try {
      setMessage('');
      const response = await fetch(`${API_BASE_URL}/api/students/${studentId}/updates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newUpdateContent, student_id: studentId }),
      });
      const data = await response.json();
      if (response.ok) {
        setMessage('Update added successfully!');
        setNewUpdateContent('');
        // Refresh updates
        const res = await fetch(`${API_BASE_URL}/api/students/${studentId}/updates`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setUpdates(await res.json());
      } else {
        setMessage(data.message || 'Failed to add update.');
      }
    } catch {
      setMessage('Error adding update.');
    }
  };

  if (!student) return <div>Loading student details...</div>;

  return (
    <div className="py-4">
      <div className="mb-2 text-gray-500 text-sm">Teacher: {teacherName}</div>
      <button
        onClick={() => navigate(`/class/${classId}`)}
        className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg mb-6 shadow-md transition duration-300"
      >
        &larr; Back to Class
      </button>
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 font-inter">Student: {student.name}</h2>
      <p className="text-gray-600 mb-8">Updates for {student.name}.</p>
      {/* Add New Update Form */}
      <form onSubmit={handleAddUpdate} className="bg-gray-50 p-6 rounded-lg shadow-md mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Add New Update</h3>
        <textarea
          className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-400"
          id="updateContent"
          placeholder="Enter update content"
          rows="3"
          value={newUpdateContent}
          onChange={(e) => setNewUpdateContent(e.target.value)}
          required
        ></textarea>
        <button
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 mt-4"
          type="submit"
        >
          Add Update
        </button>
      </form>
      {/* Student Updates List */}
      <h3 className="text-xl font-semibold text-gray-800 mb-4 font-inter">Updates</h3>
      {updates.length === 0 ? (
        <p className="text-gray-600">No updates for this student yet.</p>
      ) : (
        <ul className="space-y-4">
          {updates.map((update) => (
            <li key={update.id} className="bg-white p-4 rounded-lg shadow border border-gray-100">
              <p className="text-gray-700 text-sm">{update.content}</p>
              <span className="text-xs text-gray-400">{new Date(update.created_at).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default App;
