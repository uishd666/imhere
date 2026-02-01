import { io, Socket } from 'socket.io-client';

export const createSocket = (): Socket => {
  const token = localStorage.getItem('token');
  
  const socket = io('http://localhost:3001', {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling']
  });

  return socket;
};

export default createSocket;