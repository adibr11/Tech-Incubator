import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import Home from './components/Home';
import Tasks from './components/Tasks';
import Signup from './components/Signup';
import Login from './components/Login';
import 'bootstrap/dist/css/bootstrap.css';
import { Auth } from 'aws-amplify';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { pathname } = location;
  const isHome = pathname === '/';

  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const user = await Auth.currentAuthenticatedUser();
        setCurrentUser(user);
      } catch (e) {
        setCurrentUser(null);
      }
    };
    checkAuthState();
  }, []);

  const signOut = async () => {
    try {
      const currentLocation = isHome ? '/' : pathname;
      await Auth.signOut();
      setCurrentUser(null);
      navigate(currentLocation); // Redirect to the appropriate page after signing out
    } catch (error) {
      console.log('error signing out: ', error);
    }
  };

  return (
    <div>
      <nav className="navbar navbar-light bg-dark">
        <div className="container-fluid">
          <Link to="/" className="navbar-brand">
            <img src={require('./components/Task.png')} width="30" height="30" className="d-inline-block align-top" alt="" />
            <Link to={'/'} className='home'>Tech Incubator</Link>
          </Link>
          <div className="justify-content-end">
            {currentUser ? (
              <React.Fragment>
                <span>Welcome {currentUser.username}</span>
                <Link to={'/Tasks'} className='tasks'> Tasks </Link>
                <button onClick={signOut}>Logout</button>
              </React.Fragment>
            ) : (
              <Link to={'/Login'} className='login'> Login </Link>
            )}
          </div>
        </div>
      </nav>
      <Routes>
        <Route path="/" element={<Home currentUser={currentUser} />} />
        <Route path="/tasks" element={<Tasks currentUser={currentUser} />} />
        <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
        <Route path="/signup" element={<Signup setCurrentUser={setCurrentUser} />} />
        <Route path="/home" element={<Home currentUser={currentUser} />} />
        
      </Routes>
    </div>
  );
}

export default App;



