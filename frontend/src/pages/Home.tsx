import React from 'react';
import { useAuth } from '../context/AuthContext';

const Home = () => {
  const { isAuthenticated, login } = useAuth();
  
  return (
    <div className="max-w-4xl mx-auto text-center mt-20">
      <h1 className="text-5xl font-extrabold text-gray-900 mb-6">Welcome to FoodShare</h1>
      <p className="text-xl text-gray-600 mb-10">Connecting surplus food with communities in need.</p>
      
      {!isAuthenticated && (
        <button 
          onClick={login}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition shadow-lg"
        >
          Get Started / Login
        </button>
      )}
    </div>
  );
};

export default Home;
