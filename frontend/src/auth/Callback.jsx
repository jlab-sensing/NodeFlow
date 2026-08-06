import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuth from './hooks/useAuth';

const Callback = () => {
  const called = useRef(false);
  const { setAuth, loggedIn, setLoggedIn } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    (async () => {
      if (loggedIn === false) {
        try {
          if (called.current) return; // prevent rerender caused by StrictMode
          called.current = true;
          const data = await axios
            .get(`/api/auth/token${window.location.search}`, {
              withCredentials: true,
            })
            .then((resp) => resp.data);
          setAuth({ accessToken: data });
          setLoggedIn(true);
          navigate('/', { replace: true });
        } catch (err) {
          console.error(err);
          navigate('/', { replace: true });
        }
      } else if (loggedIn === true) {
        navigate('/', { replace: true });
      }
    })();
  }, [loggedIn, setAuth, setLoggedIn, navigate]);
  return <></>;
};

export default Callback;
